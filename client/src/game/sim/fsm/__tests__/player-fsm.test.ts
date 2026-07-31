import { beforeEach, describe, expect, it } from 'vitest';
import type { MonsterState } from '../../entities/monster';
import {
  beginGroundMove,
  createPlayerState,
  selectCombatTarget,
  stopCombat,
  toggleAutoAttack,
} from '../player-fsm';

const livingMonster: MonsterState = {
  entityId: 'slime-1',
  definitionId: 'slime',
  spawnPos: { x: 3, z: 0 },
  pos: { x: 3, z: 0 },
  hp: 140,
  alive: true,
  deathProcessed: false,
  respawnRemainingMs: null,
};

describe('player combat FSM', () => {
  let player = createPlayerState();

  beforeEach(() => {
    player = createPlayerState();
  });

  it('ground movement clears target and disables auto attack', () => {
    selectCombatTarget(player, livingMonster);
    toggleAutoAttack(player, livingMonster);
    beginGroundMove(player, { x: 9, z: 2 });
    expect(player).toMatchObject({
      mode: 'moving',
      moveTarget: { x: 9, z: 2 },
      combatTargetId: null,
      autoAttackEnabled: false,
    });
  });

  it('selecting a living target does not start auto attack', () => {
    selectCombatTarget(player, livingMonster);
    expect(player.combatTargetId).toBe('slime-1');
    expect(player.autoAttackEnabled).toBe(false);
  });

  it('auto attack cannot start without a living target', () => {
    toggleAutoAttack(player, undefined);
    expect(player.autoAttackEnabled).toBe(false);
  });

  it('target death returns the player to idle and clears combat state', () => {
    selectCombatTarget(player, livingMonster);
    toggleAutoAttack(player, livingMonster);
    stopCombat(player);
    expect(player).toMatchObject({
      mode: 'idle',
      combatTargetId: null,
      autoAttackEnabled: false,
      attackElapsedMs: 0,
      pendingHitMs: null,
    });
  });
});
