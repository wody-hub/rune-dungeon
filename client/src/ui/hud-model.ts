import type { WorldState } from '../game/sim/world';
import type { PlayerMode } from '../game/sim/fsm/player-fsm';
import type { EumStack } from '../game/types/data';

export interface TargetHudSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
}

export interface HudSnapshot {
  playerMode: PlayerMode;
  autoAttackEnabled: boolean;
  playerHp: number;
  playerMaxHp: number;
  gold: number;
  eum: EumStack[];
  target: TargetHudSnapshot | null;
}

export function playerHpFillRatio(playerHp: number, playerMaxHp: number): number {
  if (playerMaxHp <= 0) return 0;
  return Math.min(1, Math.max(0, playerHp / playerMaxHp));
}

export function isDebugHudEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).has('debugHud');
}

export function createHudSnapshot(world: WorldState): HudSnapshot {
  const selectedId = world.player.combatTargetId;
  const selected = selectedId ? world.monsters.get(selectedId) : undefined;
  const target = selected?.alive
    ? {
        id: selected.entityId,
        name: world.content.monster.name,
        hp: selected.hp,
        maxHp: world.content.monster.maxHp,
      }
    : null;

  return {
    playerMode: world.player.mode,
    autoAttackEnabled: world.player.autoAttackEnabled,
    playerHp: world.player.hp,
    playerMaxHp: world.player.maxHp,
    gold: world.inventory.gold,
    eum: world.inventory.eum
      .map((stack) => ({ ...stack }))
      .sort((left, right) => left.symbol.localeCompare(right.symbol, 'ko')),
    target,
  };
}

export function hudSnapshotsEqual(
  left: HudSnapshot,
  right: HudSnapshot,
): boolean {
  if (
    left.playerMode !== right.playerMode ||
    left.autoAttackEnabled !== right.autoAttackEnabled ||
    left.playerHp !== right.playerHp ||
    left.playerMaxHp !== right.playerMaxHp ||
    left.gold !== right.gold
  ) {
    return false;
  }
  if (
    left.target?.id !== right.target?.id ||
    left.target?.name !== right.target?.name ||
    left.target?.hp !== right.target?.hp ||
    left.target?.maxHp !== right.target?.maxHp
  ) {
    return false;
  }
  if (left.eum.length !== right.eum.length) return false;
  return left.eum.every(
    (stack, index) =>
      stack.symbol === right.eum[index].symbol &&
      stack.quantity === right.eum[index].quantity,
  );
}
