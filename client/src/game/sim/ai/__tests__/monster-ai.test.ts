import { beforeEach, describe, expect, it } from 'vitest';
import { createMonster, type MonsterState } from '../../entities/monster';
import { tickMonsterAi, type MonsterAiConfig } from '../monster-ai';

const config: MonsterAiConfig = {
  moveSpeed: 4.2,
  aggroRange: 3,
  attackRange: 1.4,
  disengageRange: 4.5,
  leashRange: 6,
};

describe('monster pursuit AI', () => {
  let monster: MonsterState;

  beforeEach(() => {
    monster = createMonster('slime-1', { id: 'slime', maxHp: 140 }, { x: 0, z: 0 });
  });

  it('stays idle exactly at the strict detection boundary', () => {
    tickMonsterAi(monster, { x: 3, z: 0 }, config, 0.1);
    expect(monster).toMatchObject({ mode: 'idle', pos: { x: 0, z: 0 } });
  });

  it('detects inside the boundary and starts pursuing immediately', () => {
    tickMonsterAi(monster, { x: 2.9, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeCloseTo(0.42);
  });

  it('clamps pursuit at attack range without overshooting', () => {
    tickMonsterAi(monster, { x: 2, z: 0 }, config, 1);
    expect(monster.mode).toBe('engaged');
    expect(monster.pos.x).toBeCloseTo(0.6);
    expect(monster.pos.z).toBe(0);
    expect(Math.hypot(2 - monster.pos.x, monster.pos.z)).toBeCloseTo(1.4);
  });

  it('engages after a diagonal pursuit step capped at attack range', () => {
    monster.mode = 'chasing';
    tickMonsterAi(monster, { x: 2.3, z: 2.3 }, config, 1);
    expect(monster.mode).toBe('engaged');
    expect(Math.hypot(2.3 - monster.pos.x, 2.3 - monster.pos.z)).toBeCloseTo(1.4);
  });

  it('holds while engaged and resumes pursuit when the player moves', () => {
    monster.mode = 'engaged';
    monster.pos = { x: 0.6, z: 0 };
    tickMonsterAi(monster, { x: 2, z: 0 }, config, 0.1);
    expect(monster.pos).toEqual({ x: 0.6, z: 0 });

    tickMonsterAi(monster, { x: 2.5, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeGreaterThan(0.6);
  });

  it('returns when the player exceeds disengage range', () => {
    monster.mode = 'chasing';
    monster.pos = { x: 2, z: 0 };
    tickMonsterAi(monster, { x: 6.6, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('returning');
    expect(monster.pos.x).toBeLessThan(2);
  });

  it('returns at the exact spawn leash boundary', () => {
    monster.mode = 'chasing';
    monster.pos = { x: 6, z: 0 };
    tickMonsterAi(monster, { x: 7, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('returning');
    expect(monster.pos.x).toBeLessThan(6);
  });

  it('ignores nearby detection while returning and idles at exact spawn', () => {
    monster.mode = 'returning';
    monster.pos = { x: 0.2, z: 0 };
    tickMonsterAi(monster, { x: 0.1, z: 0 }, config, 1);
    expect(monster).toMatchObject({ mode: 'idle', pos: { x: 0, z: 0 } });

    tickMonsterAi(monster, { x: 0.1, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('engaged');
  });

  it('does not advance dead monsters or non-positive time', () => {
    monster.alive = false;
    tickMonsterAi(monster, { x: 1, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('idle');

    monster.alive = true;
    tickMonsterAi(monster, { x: 1, z: 0 }, config, 0);
    expect(monster.mode).toBe('idle');
  });
});
