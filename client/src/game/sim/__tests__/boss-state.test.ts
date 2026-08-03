import { describe, expect, it } from 'vitest';
import {
  BOSS_ARMOR_DURATION_MS,
  bossCombatPolicy,
  createBossState,
  startBossGroggy,
  tickBossState,
} from '../boss-state';

const modifiers = {
  incomingDamageMultiplier: 0.5,
  weaknessExposeDurationMs: 4_000,
  groggyDurationMs: 10_000,
  groggyDefenseOverride: 0,
  guaranteedIncantationTagOnWeakness: 'FIRE' as const,
};

describe('M4 boss state', () => {
  it('moves armored to exposed and returns to armored when no fire hit occurs', () => {
    const state = createBossState(modifiers);

    expect(state).toEqual({ phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS });
    tickBossState(state, BOSS_ARMOR_DURATION_MS, modifiers);
    expect(state).toEqual({ phase: 'exposed', remainingMs: 4_000 });
    tickBossState(state, 4_000, modifiers);
    expect(state).toEqual({ phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS });
  });

  it('opens full-damage, non-acting groggy only from exposed and then rearms', () => {
    const state = createBossState(modifiers);

    expect(startBossGroggy(state, modifiers)).toBe(false);
    tickBossState(state, BOSS_ARMOR_DURATION_MS, modifiers);
    expect(startBossGroggy(state, modifiers)).toBe(true);
    expect(state).toEqual({ phase: 'groggy', remainingMs: 10_000 });
    expect(bossCombatPolicy(state, modifiers, 60)).toEqual({
      defense: 0,
      incomingDamageMultiplier: 1,
      canAct: false,
    });
    tickBossState(state, 10_000, modifiers);
    expect(state).toEqual({ phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS });
  });
});
