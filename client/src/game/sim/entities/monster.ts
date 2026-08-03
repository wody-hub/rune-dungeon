import type { Vec2 } from '../movement';

export interface MonsterDefinitionRef {
  id: string;
  maxHp: number;
}

export type MonsterMode = 'idle' | 'chasing' | 'engaged' | 'returning';

export interface MonsterState {
  entityId: string;
  definitionId: string;
  spawnPos: Vec2;
  pos: Vec2;
  hp: number;
  alive: boolean;
  deathProcessed: boolean;
  mode: MonsterMode;
  respawnRemainingMs: number | null;
}

export function createMonster(
  entityId: string,
  definition: MonsterDefinitionRef,
  spawnPos: Vec2,
): MonsterState {
  return {
    entityId,
    definitionId: definition.id,
    spawnPos: { ...spawnPos },
    pos: { ...spawnPos },
    hp: definition.maxHp,
    alive: true,
    deathProcessed: false,
    mode: 'idle',
    respawnRemainingMs: null,
  };
}

export function killMonster(monster: MonsterState, respawnMs: number): void {
  monster.hp = 0;
  monster.alive = false;
  monster.mode = 'idle';
  monster.respawnRemainingMs = respawnMs;
}

export function tickMonsterRespawn(
  monster: MonsterState,
  elapsedMs: number,
  maxHp: number,
): void {
  if (monster.alive || monster.respawnRemainingMs === null) return;
  monster.respawnRemainingMs = Math.max(0, monster.respawnRemainingMs - elapsedMs);
  if (monster.respawnRemainingMs > 0) return;
  monster.hp = maxHp;
  monster.alive = true;
  monster.deathProcessed = false;
  monster.mode = 'idle';
  monster.respawnRemainingMs = null;
  monster.pos = { ...monster.spawnPos };
}
