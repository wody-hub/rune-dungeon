import type { MonsterItem, PlayerData, WeaponItem } from '../types/data';

export const LOGICAL_PX_TO_WORLD_UNIT = 0.1;

export function toWorldDistance(logicalPx: number): number {
  return logicalPx * LOGICAL_PX_TO_WORLD_UNIT;
}

export interface RuntimeWeapon extends WeaponItem {
  range: number;
  hitboxWidth: number;
}

export interface RuntimeMonster extends MonsterItem {
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
}

export interface RuntimeCombatContent {
  monster: RuntimeMonster;
  weapon: RuntimeWeapon;
  player: PlayerData;
}

export function createRuntimeCombatContent(
  monster: MonsterItem,
  weapon: WeaponItem,
  player: PlayerData,
): RuntimeCombatContent {
  return {
    monster: {
      ...monster,
      moveSpeed: toWorldDistance(monster.moveSpeed),
      aggroRange: toWorldDistance(monster.aggroRange),
      attackRange: toWorldDistance(monster.attackRange),
    },
    weapon: {
      ...weapon,
      range: toWorldDistance(weapon.rangePx),
      hitboxWidth: toWorldDistance(weapon.hitboxWidthPx),
    },
    player,
  };
}
