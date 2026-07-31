import type { MonsterItem, PlayerData, WeaponItem } from '../types/data';

export const LOGICAL_PX_TO_WORLD_UNIT = 0.1;

export function toWorldDistance(logicalPx: number): number {
  return logicalPx * LOGICAL_PX_TO_WORLD_UNIT;
}

export interface RuntimeWeapon extends WeaponItem {
  range: number;
}

export interface RuntimeCombatContent {
  monster: MonsterItem;
  weapon: RuntimeWeapon;
  player: PlayerData;
}

export function createRuntimeCombatContent(
  monster: MonsterItem,
  weapon: WeaponItem,
  player: PlayerData,
): RuntimeCombatContent {
  return {
    monster,
    weapon: { ...weapon, range: toWorldDistance(weapon.rangePx) },
    player,
  };
}
