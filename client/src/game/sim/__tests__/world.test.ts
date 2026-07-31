import { describe, it, expect } from 'vitest';
import type { MonsterItem, PlayerData, WeaponItem } from '../../types/data';
import {
  createWorld,
  enqueueIntent,
  resolveCombatDefinitions,
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
  it('spawns three ink slimes', () => {
    const w = createWorld({ random: zeroRandom() });
    expect([...w.monsters.values()]).toHaveLength(3);
    expect([...w.monsters.values()].every((monster) => monster.alive)).toBe(true);
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
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0);
    expect(w.player).toEqual(before);
    expect(w.pendingIntents).toHaveLength(1);
  });
});
