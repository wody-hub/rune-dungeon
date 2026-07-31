import { describe, expect, it } from 'vitest';
import monstersData from '../../data/monsters.json';
import type { MonsterItem, PlayerData, WeaponItem } from '../../types/data';
import {
  createRuntimeCombatContent,
  LOGICAL_PX_TO_WORLD_UNIT,
  toWorldDistance,
} from '../runtime-content';

describe('runtime content units', () => {
  it('converts every logical distance through one scale', () => {
    expect(LOGICAL_PX_TO_WORLD_UNIT).toBe(0.1);
    expect(toWorldDistance(56)).toBeCloseTo(5.6);
    expect(toWorldDistance(42)).toBeCloseTo(4.2);
  });

  it('converts pursuit values and derives return ranges', () => {
    const monster = {
      moveSpeed: 42,
      aggroRange: 30,
      attackRange: 14,
    } as MonsterItem;
    const weapon = { rangePx: 18, hitboxWidthPx: 32 } as WeaponItem;
    const content = createRuntimeCombatContent(monster, weapon, {} as PlayerData);

    expect(content.monster.moveSpeed).toBeCloseTo(4.2);
    expect(content.monster.aggroRange).toBeCloseTo(3);
    expect(content.monster.attackRange).toBeCloseTo(1.4);
    expect(content.monster.disengageRange).toBeCloseTo(4.5);
    expect(content.monster.leashRange).toBeCloseTo(6);
    expect(content.weapon.range).toBeCloseTo(1.8);
    expect(content.weapon.hitboxWidth).toBeCloseTo(3.2);
  });

  it('keeps the POC ink slime idle-safe tuning in its fixture', () => {
    expect(monstersData[0]).toMatchObject({
      id: 'monster_ink_slime_001',
      moveSpeed: 42,
      aggroRange: 30,
      attackRange: 14,
    });
  });
});
