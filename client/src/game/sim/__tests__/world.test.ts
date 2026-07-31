import { describe, it, expect } from 'vitest';
import {
  createWorld,
  enqueueIntent,
  tick,
  PLAYER_SPEED,
  type WorldState,
} from '../world';

describe('world intents', () => {
  it('move_to_ground 인텐트는 틱에서 소비되어 이동 목표가 된다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0.1);
    expect(w.player.moveTarget).toEqual({ x: 10, z: 0 });
    expect(w.player.pos.x).toBeCloseTo(PLAYER_SPEED * 0.1);
    expect(w.pendingIntents).toHaveLength(0);
  });

  it('같은 틱에 여러 인텐트가 오면 마지막 것이 이긴다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 0, z: 10 } });
    tick(w, 0.01);
    expect(w.player.moveTarget).toEqual({ x: 0, z: 10 });
  });

  it('목표 도달 시 target이 해제된다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 0.1, z: 0 } });
    tick(w, 1);
    expect(w.player.pos).toEqual({ x: 0.1, z: 0 });
    expect(w.player.moveTarget).toBeNull();
  });
});

function zeroRandom() {
  return { next: () => 0 };
}

function startCombat(w: WorldState, monsterId = 'slime-1') {
  enqueueIntent(w, { type: 'select_target', monsterId });
  enqueueIntent(w, { type: 'toggle_auto_attack' });
}

describe('world combat loop', () => {
  it('spawns three ink slimes', () => {
    const w = createWorld({ random: zeroRandom() });
    expect([...w.monsters.values()]).toHaveLength(3);
    expect([...w.monsters.values()].every((monster) => monster.alive)).toBe(true);
  });

  it('approaches a selected target before attacking', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 10, z: 0 };
    monster.spawnPos = { ...monster.pos };
    startCombat(w);
    tick(w, 0.1);
    expect(w.player.mode).toBe('moving');
    expect(w.player.pos.x).toBeGreaterThan(0);
    expect(monster.hp).toBe(w.content.monster.maxHp);
  });

  it('applies no damage before hitFrameMs', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    startCombat(w);
    tick(w, 0.319);
    expect(monster.hp).toBe(w.content.monster.maxHp);
    tick(w, 0.001);
    expect(monster.hp).toBeLessThan(w.content.monster.maxHp);
  });

  it('does not apply a second hit before the next attack cadence', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    startCombat(w);
    tick(w, 0.32);
    const hpAfterFirstHit = monster.hp;
    tick(w, 0.929);
    expect(monster.hp).toBe(hpAfterFirstHit);
    tick(w, 0.001);
    tick(w, 0.32);
    expect(monster.hp).toBeLessThan(hpAfterFirstHit);
  });

  it('applies every hit frame crossed by one elapsed interval', () => {
    const oneHitWorld = createWorld({ random: zeroRandom() });
    const oneHitMonster = oneHitWorld.monsters.get('slime-1')!;
    oneHitMonster.pos = { x: 1, z: 0 };
    startCombat(oneHitWorld);
    tick(oneHitWorld, 0.32);
    const damagePerHit = oneHitWorld.content.monster.maxHp - oneHitMonster.hp;

    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    startCombat(w);
    tick(w, 1.57);
    expect(w.content.monster.maxHp - monster.hp).toBe(damagePerHit * 2);
  });

  it('awards gold and eum exactly once when the target dies', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.hp = 1;
    const initialGold = w.inventory.gold;
    startCombat(w);
    tick(w, 0.32);
    const goldAfterDeath = w.inventory.gold;
    const eumAfterDeath = structuredClone(w.inventory.eum);
    expect(goldAfterDeath).toBe(initialGold + 5);
    expect(eumAfterDeath).toContainEqual({ symbol: 'ㄱ', quantity: 4 });
    tick(w, 1);
    expect(w.inventory.gold).toBe(goldAfterDeath);
    expect(w.inventory.eum).toEqual(eumAfterDeath);
  });

  it('stops combat when the selected target dies', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    expect(w.player).toMatchObject({
      mode: 'idle',
      combatTargetId: null,
      autoAttackEnabled: false,
    });
  });

  it('respawns a monster as a rewardable new life', () => {
    const w = createWorld({ random: zeroRandom(), respawnMs: 1_000 });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.spawnPos = { ...monster.pos };
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    const goldAfterFirstLife = w.inventory.gold;
    tick(w, 1);
    expect(monster.alive).toBe(true);
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    expect(w.inventory.gold).toBe(goldAfterFirstLife + 5);
  });

  it('ignores non-positive dt for timed progression', () => {
    const w = createWorld({ random: zeroRandom() });
    const before = structuredClone(w.player);
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0);
    expect(w.player).toEqual(before);
    expect(w.pendingIntents).toHaveLength(1);
  });
});
