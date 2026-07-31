import { describe, expect, it } from 'vitest';
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

  it('converts every combat fixture distance and speed for runtime use', () => {
    const monster = {
      moveSpeed: 30,
      aggroRange: 56,
      attackRange: 42,
    } as MonsterItem;
    const weapon = { rangePx: 56, hitboxWidthPx: 42 } as WeaponItem;
    const content = createRuntimeCombatContent(monster, weapon, {} as PlayerData);

    expect(content.monster.moveSpeed).toBeCloseTo(3);
    expect(content.monster.aggroRange).toBeCloseTo(5.6);
    expect(content.monster.attackRange).toBeCloseTo(4.2);
    expect(content.weapon.range).toBeCloseTo(5.6);
    expect(content.weapon.hitboxWidth).toBeCloseTo(4.2);
  });
});
