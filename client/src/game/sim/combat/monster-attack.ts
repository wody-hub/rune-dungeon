import type { MonsterState } from '../entities/monster';
import { resetMonsterAttack } from '../entities/monster';
import type { PlayerState } from '../fsm/player-fsm';
import type { RandomSource } from '../random';
import { rollPhysicalDamage } from './damage';

export interface MonsterAttackConfig {
  baseDamage: number;
  attackMotionMs: number;
  hitFrameMs: number;
  playerDefense: number;
}

function applyMonsterHit(
  player: PlayerState,
  config: MonsterAttackConfig,
  random: RandomSource,
): void {
  const damage = rollPhysicalDamage(
    {
      minDamage: config.baseDamage,
      maxDamage: config.baseDamage,
      attackBonus: 0,
      damageMultiplier: 1,
      defense: config.playerDefense,
    },
    random,
  );
  player.hp = Math.max(0, player.hp - damage);
}

export function tickMonsterAttack(
  monster: MonsterState,
  player: PlayerState,
  config: MonsterAttackConfig,
  elapsedMs: number,
  random: RandomSource,
): void {
  if (!monster.alive || monster.mode !== 'engaged') {
    resetMonsterAttack(monster);
    return;
  }
  if (monster.attackElapsedMs === 0 && monster.pendingHitMs === null) {
    monster.pendingHitMs = config.hitFrameMs;
  }

  let remainingMs = elapsedMs;
  while (remainingMs > 0) {
    const hasPendingHit = monster.pendingHitMs !== null;
    const timeToEvent = hasPendingHit
      ? monster.pendingHitMs!
      : config.attackMotionMs - monster.attackElapsedMs;
    const advanceMs = Math.min(remainingMs, timeToEvent);
    monster.attackElapsedMs += advanceMs;
    if (hasPendingHit) monster.pendingHitMs = timeToEvent - advanceMs;
    remainingMs -= advanceMs;

    if (advanceMs < timeToEvent) return;
    if (hasPendingHit) {
      monster.pendingHitMs = null;
      applyMonsterHit(player, config, random);
    } else {
      monster.attackElapsedMs = 0;
      monster.pendingHitMs = config.hitFrameMs;
    }
  }
}
