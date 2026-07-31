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
  disengageRange: number;
  leashRange: number;
}

export interface RuntimeCombatContent {
  monster: RuntimeMonster;
  weapon: RuntimeWeapon;
  player: PlayerData;
}

function cloneJsonData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createRuntimeCombatContent(
  monster: MonsterItem,
  weapon: WeaponItem,
  player: PlayerData,
): RuntimeCombatContent {
  const clonedMonster = cloneJsonData(monster);
  const clonedWeapon = cloneJsonData(weapon);
  const aggroRange = toWorldDistance(monster.aggroRange);
  return {
    monster: {
      ...clonedMonster,
      moveSpeed: toWorldDistance(monster.moveSpeed),
      aggroRange,
      attackRange: toWorldDistance(monster.attackRange),
      disengageRange: aggroRange * 1.5,
      leashRange: aggroRange * 2,
    },
    weapon: {
      ...clonedWeapon,
      range: toWorldDistance(weapon.rangePx),
      hitboxWidth: toWorldDistance(weapon.hitboxWidthPx),
    },
    player: cloneJsonData(player),
  };
}
