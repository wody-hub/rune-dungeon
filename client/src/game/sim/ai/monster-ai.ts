import type { MonsterState } from '../entities/monster';
import { stepToward, type Vec2 } from '../movement';

export interface MonsterAiConfig {
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
  disengageRange: number;
  leashRange: number;
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function shouldReturn(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
): boolean {
  return (
    distance(monster.pos, playerPos) > config.disengageRange ||
    distance(monster.pos, monster.spawnPos) >= config.leashRange
  );
}

function returnToSpawn(
  monster: MonsterState,
  config: MonsterAiConfig,
  dt: number,
): void {
  monster.mode = 'returning';
  monster.pos = stepToward(monster.pos, monster.spawnPos, config.moveSpeed, dt);
  if (
    monster.pos.x === monster.spawnPos.x &&
    monster.pos.z === monster.spawnPos.z
  ) {
    monster.mode = 'idle';
  }
}

function pursue(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
  dt: number,
): void {
  const playerDistance = distance(monster.pos, playerPos);
  if (playerDistance <= config.attackRange) {
    monster.mode = 'engaged';
    return;
  }

  monster.mode = 'chasing';
  const allowedStep = Math.min(
    config.moveSpeed * dt,
    playerDistance - config.attackRange,
  );
  monster.pos = stepToward(monster.pos, playerPos, allowedStep, 1);
  if (distance(monster.pos, playerPos) <= config.attackRange) {
    monster.mode = 'engaged';
  }
}

export function tickMonsterAi(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
  dt: number,
): void {
  if (!monster.alive || dt <= 0) return;

  if (monster.mode === 'returning') {
    returnToSpawn(monster, config, dt);
    return;
  }

  const playerDistance = distance(monster.pos, playerPos);
  if (monster.mode === 'idle') {
    if (playerDistance >= config.aggroRange) return;
  } else if (shouldReturn(monster, playerPos, config)) {
    returnToSpawn(monster, config, dt);
    return;
  }

  pursue(monster, playerPos, config, dt);
}
