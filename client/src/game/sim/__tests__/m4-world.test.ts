import { describe, expect, it } from 'vitest';
import { M4_ENTITY_IDS, M4_SPAWNS } from '../m4-scenario';
import { createWorld, enqueueIntent, tick } from '../world';

const zeroRandom = { next: () => 0 };

function startCombat(w: ReturnType<typeof createWorld>, monsterId: string): void {
  enqueueIntent(w, { type: 'select_target', monsterId });
  enqueueIntent(w, { type: 'enable_auto_attack' });
}

function enterBossRoom(w: ReturnType<typeof createWorld>): void {
  w.m4!.gateUnlocked = true;
  enqueueIntent(w, { type: 'enter_m4_boss_room' });
  tick(w, 1 / 60);
}

describe('M4 world', () => {
  it('starts at the completed M3 mine checkpoint and unlocks the gate after elite death', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom, respawnMs: 1_000 });
    const elite = w.monsters.get(M4_ENTITY_IDS.elite)!;

    expect(w.m3).toMatchObject({
      currentGyeolId: 'letter_gyeol_hwa_001',
      transformed: false,
    });
    expect(w.m4).toMatchObject({ area: 'blackheart_mine', gateUnlocked: false });
    elite.pos = { x: 1, z: 0 };
    elite.hp = 1;
    startCombat(w, elite.entityId);
    tick(w, 0.32);

    expect(w.m4?.gateUnlocked).toBe(true);
    expect(elite.alive).toBe(false);
    tick(w, 1);
    expect(elite.alive).toBe(true);
    expect(w.m4?.gateUnlocked).toBe(true);
  });

  it('keeps the gate closed until the elite falls and clears combat on entry', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom });

    enqueueIntent(w, { type: 'enter_m4_boss_room' });
    tick(w, 1 / 60);
    expect(w.m4?.area).toBe('blackheart_mine');

    enterBossRoom(w);
    expect(w.m4?.area).toBe('pencil_knight_boss_room');
    expect(w.player).toMatchObject({
      pos: M4_SPAWNS.bossPlayer,
      combatTargetId: null,
      autoAttackEnabled: false,
    });
  });

  it('requires a transformed hit during exposure and makes a groggy boss inert', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom });
    enterBossRoom(w);
    const boss = w.monsters.get(M4_ENTITY_IDS.boss)!;
    boss.pos = { x: 1, z: -4 };
    boss.spawnPos = { ...boss.pos };

    tick(w, 6);
    expect(w.m4?.boss.phase).toBe('exposed');

    startCombat(w, boss.entityId);
    tick(w, 0.32);
    expect(w.m4?.boss.phase).toBe('exposed');

    enqueueIntent(w, { type: 'toggle_m3_transformation' });
    tick(w, 1 / 60);
    tick(w, 1.25);

    expect(w.m4?.boss.phase).toBe('groggy');
    expect(boss).toMatchObject({ mode: 'idle', attackElapsedMs: 0, pendingHitMs: null });
  });

  it('holds a cleared boss dead and rewards it only once', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom });
    enterBossRoom(w);
    const boss = w.monsters.get(M4_ENTITY_IDS.boss)!;
    boss.pos = { x: 1, z: -4 };
    boss.spawnPos = { ...boss.pos };
    boss.hp = 1;
    const initialGold = w.inventory.gold;

    startCombat(w, boss.entityId);
    tick(w, 0.32);
    const goldAfterDeath = w.inventory.gold;

    expect(w.m4).toMatchObject({ objective: 'complete', boss: { phase: 'cleared' } });
    expect(boss).toMatchObject({ alive: false, respawnRemainingMs: null });
    expect(goldAfterDeath).toBeGreaterThan(initialGold);
    tick(w, 10);
    expect(boss.alive).toBe(false);
    expect(w.inventory.gold).toBe(goldAfterDeath);
  });
});
