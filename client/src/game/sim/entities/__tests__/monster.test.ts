import { describe, expect, it } from 'vitest';
import { createMonster, killMonster, tickMonsterRespawn } from '../monster';

const definition = { id: 'slime', maxHp: 140 };

describe('monster lifecycle', () => {
  it('creates a live monster at its spawn position', () => {
    const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
    expect(monster).toMatchObject({
      entityId: 'slime-1',
      definitionId: 'slime',
      hp: 140,
      alive: true,
      deathProcessed: false,
      mode: 'idle',
      pos: { x: 3, z: 4 },
    });
  });

  it('respawns a killed monster with full hp at its spawn', () => {
    const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
    killMonster(monster, 2_000);
    tickMonsterRespawn(monster, 1_999, definition.maxHp);
    expect(monster.alive).toBe(false);
    tickMonsterRespawn(monster, 1, definition.maxHp);
    expect(monster).toMatchObject({
      hp: 140,
      alive: true,
      deathProcessed: false,
      mode: 'idle',
      respawnRemainingMs: null,
      pos: { x: 3, z: 4 },
    });
  });

  it('clears pursuit mode when killed', () => {
    const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
    monster.mode = 'chasing';

    killMonster(monster, 2_000);

    expect(monster.mode).toBe('idle');
  });
});
