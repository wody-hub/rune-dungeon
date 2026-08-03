import { beforeEach, describe, expect, it } from 'vitest';
import { createMonster, type MonsterState } from '../../entities/monster';
import { createPlayerState, type PlayerState } from '../../fsm/player-fsm';
import {
  tickMonsterAttack,
  type MonsterAttackConfig,
} from '../monster-attack';

const config: MonsterAttackConfig = {
  baseDamage: 18,
  attackMotionMs: 1_400,
  hitFrameMs: 420,
  playerDefense: 12,
};
const zeroRandom = { next: () => 0 };

describe('monster counterattack', () => {
  let monster: MonsterState;
  let player: PlayerState;

  beforeEach(() => {
    monster = createMonster('slime-1', { id: 'slime', maxHp: 140 }, { x: 0, z: 0 });
    monster.mode = 'engaged';
    player = createPlayerState({ hp: 196, maxHp: 196 });
  });

  it('hits exactly at the configured first hit frame', () => {
    tickMonsterAttack(monster, player, config, 419, zeroRandom);
    expect(player.hp).toBe(196);
    expect(monster.pendingHitMs).toBe(1);

    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(180);
    expect(monster.pendingHitMs).toBeNull();
  });

  it('starts the next hit from the next motion boundary', () => {
    tickMonsterAttack(monster, player, config, 1_819, zeroRandom);
    expect(player.hp).toBe(180);

    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(164);
  });

  it('processes every hit crossed by a large elapsed interval', () => {
    tickMonsterAttack(monster, player, config, 3_220, zeroRandom);
    expect(player.hp).toBe(148);
  });

  it('resets partial timing outside engaged mode', () => {
    tickMonsterAttack(monster, player, config, 200, zeroRandom);
    monster.mode = 'chasing';
    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });

    monster.mode = 'engaged';
    tickMonsterAttack(monster, player, config, 419, zeroRandom);
    expect(player.hp).toBe(196);
    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(180);
  });

  it('does not attack while dead', () => {
    monster.alive = false;
    tickMonsterAttack(monster, player, config, 420, zeroRandom);
    expect(player.hp).toBe(196);
    expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });
  });

  it('clamps player hp at zero', () => {
    player.hp = 10;
    tickMonsterAttack(monster, player, config, 420, zeroRandom);
    expect(player.hp).toBe(0);
  });
});
