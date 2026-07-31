import type { MonsterState } from '../entities/monster';
import type { Vec2 } from '../movement';

export type PlayerMode = 'idle' | 'moving' | 'attacking';

export interface PlayerState {
  pos: Vec2;
  mode: PlayerMode;
  moveTarget: Vec2 | null;
  combatTargetId: string | null;
  autoAttackEnabled: boolean;
  attackElapsedMs: number;
  pendingHitMs: number | null;
}

export function createPlayerState(): PlayerState {
  return {
    pos: { x: 0, z: 0 },
    mode: 'idle',
    moveTarget: null,
    combatTargetId: null,
    autoAttackEnabled: false,
    attackElapsedMs: 0,
    pendingHitMs: null,
  };
}

export function beginGroundMove(player: PlayerState, point: Vec2): void {
  player.mode = 'moving';
  player.moveTarget = { ...point };
  player.combatTargetId = null;
  player.autoAttackEnabled = false;
  player.attackElapsedMs = 0;
  player.pendingHitMs = null;
}

export function selectCombatTarget(
  player: PlayerState,
  monster: MonsterState | undefined,
): void {
  if (!monster?.alive) return;
  player.combatTargetId = monster.entityId;
}

export function toggleAutoAttack(
  player: PlayerState,
  monster: MonsterState | undefined,
): void {
  if (player.autoAttackEnabled) {
    player.autoAttackEnabled = false;
    player.mode = 'idle';
    player.moveTarget = null;
    player.attackElapsedMs = 0;
    player.pendingHitMs = null;
    return;
  }
  enableAutoAttack(player, monster);
}

export function enableAutoAttack(
  player: PlayerState,
  monster: MonsterState | undefined,
): void {
  if (!monster?.alive || monster.entityId !== player.combatTargetId) return;
  player.autoAttackEnabled = true;
}

export function stopCombat(player: PlayerState): void {
  player.mode = 'idle';
  player.moveTarget = null;
  player.combatTargetId = null;
  player.autoAttackEnabled = false;
  player.attackElapsedMs = 0;
  player.pendingHitMs = null;
}
