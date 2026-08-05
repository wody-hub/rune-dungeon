import { describe, it, expect } from 'vitest';
import type { MonsterItem, PlayerData, WeaponItem } from '../../types/data';
import {
  applyAuthoritativePlayerPosition,
  createWorld,
  enqueueIntent,
  getRenderedPlayerPosition,
  resolveCombatDefinitions,
  tick,
  PLAYER_SPEED,
  type WorldState,
} from '../world';
import { M3_IDS } from '../m3-progression';
import { M4_ENTITY_IDS } from '../m4-scenario';

describe('M5.1 player movement authority', () => {
  it('keeps local movement unchanged by default', () => {
    const world = createWorld();
    enqueueIntent(world, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(world, 0.1);
    expect(world.player.pos.x).toBeCloseTo(PLAYER_SPEED * 0.1);
  });

  it('authoritative movement consumes the intent but only a snapshot changes position', () => {
    const world = createWorld({ playerMovement: 'authoritative' });
    enqueueIntent(world, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(world, 0.1);
    expect(world.player.pos).toEqual({ x: 0, z: 0 });
    applyAuthoritativePlayerPosition(world, { x: 1.2, z: -0.4 });
    expect(world.player.pos).toEqual({ x: 1.2, z: -0.4 });
    expect(getRenderedPlayerPosition(world)).toEqual({ x: 0, z: 0 });
    tick(world, 0.1);
    expect(getRenderedPlayerPosition(world)).toEqual({ x: 0.6, z: -0.2 });
    tick(world, 0.1);
    expect(getRenderedPlayerPosition(world)).toEqual({ x: 1.2, z: -0.4 });
  });

  it('authoritative mode refuses every M2–M4 input and freezes local gameplay simulation', () => {
    const world = createWorld({ scenario: 'm4', playerMovement: 'authoritative' });
    const elite = world.monsters.get(M4_ENTITY_IDS.elite)!;
    const originalPosition = { ...world.player.pos };
    const before = {
      playerHp: world.player.hp,
      elite: structuredClone(elite),
      m3: structuredClone(world.m3),
      m4: structuredClone(world.m4),
      inventory: structuredClone(world.inventory),
    };
    enqueueIntent(world, { type: 'enter_m4_boss_room' });
    enqueueIntent(world, { type: 'toggle_auto_attack' });
    enqueueIntent(world, { type: 'toggle_m3_transformation' });
    tick(world, 10);
    expect(world.player.pos).toEqual(originalPosition);
    expect(world.m4?.area).toBe('blackheart_mine');
    expect(world.player.autoAttackEnabled).toBe(false);
    expect(world.m3.transformed).toBe(false);
    expect({
      playerHp: world.player.hp,
      elite,
      m3: world.m3,
      m4: world.m4,
      inventory: world.inventory,
    }).toEqual(before);
  });
});

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

function cloneJsonData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function startCombat(w: WorldState, monsterId = 'slime-1') {
  enqueueIntent(w, { type: 'select_target', monsterId });
  enqueueIntent(w, { type: 'toggle_auto_attack' });
}

describe('world combat content resolution', () => {
  it('resolves the ink slime and the player-equipped weapon by stable IDs', () => {
    const inkSlime = { id: 'monster_ink_slime_001' } as MonsterItem;
    const equippedWeapon = { id: 'weapon-equipped' } as WeaponItem;
    const definitions = resolveCombatDefinitions(
      [{ id: 'monster-other' } as MonsterItem, inkSlime],
      [{ id: 'weapon-other' } as WeaponItem, equippedWeapon],
      { equipped: { weaponId: 'weapon-equipped' } } as PlayerData,
    );

    expect(definitions).toEqual({ monster: inkSlime, weapon: equippedWeapon });
  });

  it('fails clearly when the ink slime fixture is missing', () => {
    expect(() =>
      resolveCombatDefinitions(
        [],
        [{ id: 'weapon-equipped' } as WeaponItem],
        { equipped: { weaponId: 'weapon-equipped' } } as PlayerData,
      ),
    ).toThrowError('Missing combat monster definition: monster_ink_slime_001');
  });

  it('fails clearly when the equipped weapon fixture is missing', () => {
    expect(() =>
      resolveCombatDefinitions(
        [{ id: 'monster_ink_slime_001' } as MonsterItem],
        [],
        { equipped: { weaponId: 'weapon-missing' } } as PlayerData,
      ),
    ).toThrowError('Missing equipped weapon definition: weapon-missing');
  });

  it('isolates nested monster drop and player data between worlds', () => {
    const first = createWorld();
    const second = createWorld();
    const secondDropMinimum = second.content.monster.drops.entries[0].quantity.min;
    const secondAttackBonus = second.content.player.combatProfile.attackBonusFromStr;

    first.content.monster.drops.entries[0].quantity.min = 999;
    first.content.player.combatProfile.attackBonusFromStr = 999;

    expect(second.content.monster.drops.entries[0].quantity.min).toBe(secondDropMinimum);
    expect(second.content.player.combatProfile.attackBonusFromStr).toBe(secondAttackBonus);
  });
});

describe('world combat loop', () => {
  it('initializes runtime player hp from fixture content', () => {
    const w = createWorld({ random: zeroRandom() });
    expect(w.player).toMatchObject({ hp: 196, maxHp: 196 });
  });

  it('applies a counterattack after monster AI engages', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1.4, z: 0 };
    monster.spawnPos = { ...monster.pos };

    tick(w, 0.419);
    expect(w.player.hp).toBe(196);
    tick(w, 0.001);
    expect(w.player.hp).toBe(180);
  });

  it('lets staggered monster engagements hit on their own clock boundaries', () => {
    const w = createWorld({ random: zeroRandom() });
    const first = w.monsters.get('slime-1')!;
    const second = w.monsters.get('slime-2')!;
    first.pos = { x: 1.4, z: 0 };
    first.spawnPos = { ...first.pos };
    second.pos = { x: -3, z: 0 };
    second.spawnPos = { ...second.pos };

    tick(w, 0.2);
    expect(first.pendingHitMs).toBe(220);
    expect(second.mode).toBe('idle');

    second.pos = { x: -1.4, z: 0 };
    second.spawnPos = { ...second.pos };
    tick(w, 0.219);
    expect(w.player.hp).toBe(196);
    expect(first.pendingHitMs).toBe(1);
    expect(second.pendingHitMs).toBe(201);

    tick(w, 0.001);
    expect(w.player.hp).toBe(180);
    expect(first.pendingHitMs).toBeNull();

    tick(w, 0.2);
    expect(w.player.hp).toBe(164);
    expect(second.pendingHitMs).toBeNull();
  });

  it('resets a partial counterattack when pursuit resumes', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1.4, z: 0 };
    monster.spawnPos = { ...monster.pos };
    tick(w, 0.2);
    expect(monster.pendingHitMs).toBe(220);

    w.player.pos = { x: 3, z: 0 };
    tick(w, 0.01);
    expect(monster.mode).toBe('chasing');
    expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });
    expect(w.player.hp).toBe(196);
  });

  it('spawns three ink slimes', () => {
    const w = createWorld({ random: zeroRandom() });
    expect([...w.monsters.values()]).toHaveLength(3);
    expect([...w.monsters.values()].every((monster) => monster.alive)).toBe(true);
  });

  it('keeps every slime idle at its initial detection boundary', () => {
    const w = createWorld({ random: zeroRandom() });
    const initial = [...w.monsters.values()].map(({ pos }) => ({ ...pos }));

    tick(w, 0.5);

    expect([...w.monsters.values()].map(({ mode }) => mode)).toEqual([
      'idle',
      'idle',
      'idle',
    ]);
    expect([...w.monsters.values()].map(({ pos }) => pos)).toEqual(initial);
  });

  it('advances monster pursuit after an ordinary player movement branch', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    w.player.pos = { x: 0.2, z: 0 };
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 0.3, z: 0 } });

    tick(w, 0.1);

    expect(w.player.pos).toEqual({ x: 0.3, z: 0 });
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeLessThan(3);
  });

  it('advances player and monster pursuit in the same combat tick', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;

    startCombat(w);
    tick(w, 0.1);

    expect(w.player.pos.x).toBeCloseTo(0.6);
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeLessThan(3);
    expect(monster.hp).toBe(w.content.monster.maxHp);
  });

  it('approaches the initial slime with the equipped melee weapon', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    const initialHp = monster.hp;

    startCombat(w);
    tick(w, 0.1);

    expect(w.content.weapon.range).toBeCloseTo(1.8);
    expect(w.player.mode).toBe('moving');
    expect(w.player.pos.x).toBeGreaterThan(0);
    expect(monster.hp).toBe(initialHp);
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

  it('stops approaching but keeps the selection when auto attack is toggled off', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 10, z: 0 };
    startCombat(w);
    tick(w, 0.1);
    const positionWhenToggledOff = { ...w.player.pos };

    enqueueIntent(w, { type: 'toggle_auto_attack' });
    tick(w, 0.1);

    expect(w.player).toMatchObject({
      pos: positionWhenToggledOff,
      mode: 'idle',
      moveTarget: null,
      combatTargetId: 'slime-1',
      autoAttackEnabled: false,
      attackElapsedMs: 0,
      pendingHitMs: null,
    });
  });

  it('selecting and starting combat while combat is active keeps it enabled', () => {
    const w = createWorld({ random: zeroRandom() });
    startCombat(w);
    tick(w, 0.1);

    enqueueIntent(w, { type: 'select_target', monsterId: 'slime-1' });
    enqueueIntent(w, { type: 'enable_auto_attack' });
    tick(w, 0.1);

    expect(w.player.autoAttackEnabled).toBe(true);
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
    const eumAfterDeath = cloneJsonData(w.inventory.eum);
    expect(goldAfterDeath).toBe(initialGold + 5);
    expect(eumAfterDeath).toContainEqual({ symbol: 'ㄱ', quantity: 4 });
    tick(w, 1);
    expect(w.inventory.gold).toBe(goldAfterDeath);
    expect(w.inventory.eum).toEqual(eumAfterDeath);
  });

  it('preserves the first slime reward while enabling the one-time M3 supply cache', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.hp = 1;

    startCombat(w);
    tick(w, 0.32);

    expect(w.inventory.gold).toBe(20);
    expect(w.inventory.eum).toContainEqual({ symbol: 'ㄱ', quantity: 4 });
    expect(w.m3).toMatchObject({ cacheAvailable: true, cacheCollected: false });

    enqueueIntent(w, { type: 'collect_m3_supply_cache' });
    tick(w, 1 / 60);
    expect(w.inventory.eum).toEqual(expect.arrayContaining([
      { symbol: 'ㅎ', quantity: 1 },
      { symbol: 'ㅘ', quantity: 1 },
    ]));
    expect(w.inventory.items).toContain(M3_IDS.stone);
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
    const before = cloneJsonData(w.player);
    const monsterBefore = cloneJsonData([...w.monsters.values()]);
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0);
    expect(w.player).toEqual(before);
    expect([...w.monsters.values()]).toEqual(monsterBefore);
    expect(w.pendingIntents).toHaveLength(1);
  });
});
