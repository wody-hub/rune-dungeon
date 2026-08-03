import type { MonsterItem } from '../types/data';

export const BOSS_ARMOR_DURATION_MS = 6_000;

export type BossPhase = 'armored' | 'exposed' | 'groggy' | 'cleared';

export interface BossState {
  phase: BossPhase;
  remainingMs: number;
}

type BossModifiers = NonNullable<MonsterItem['bossStateModifiers']>;

export function createBossState(_modifiers: BossModifiers): BossState {
  return { phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS };
}

function enterArmored(state: BossState): void {
  state.phase = 'armored';
  state.remainingMs = BOSS_ARMOR_DURATION_MS;
}

export function tickBossState(
  state: BossState,
  elapsedMs: number,
  modifiers: BossModifiers,
): void {
  let remaining = Math.max(0, elapsedMs);
  while (remaining > 0 && state.phase !== 'cleared') {
    const advance = Math.min(remaining, state.remainingMs);
    state.remainingMs -= advance;
    remaining -= advance;
    if (state.remainingMs > 0) return;

    if (state.phase === 'armored') {
      state.phase = 'exposed';
      state.remainingMs = modifiers.weaknessExposeDurationMs;
    } else {
      enterArmored(state);
    }
  }
}

export function startBossGroggy(
  state: BossState,
  modifiers: BossModifiers,
): boolean {
  if (state.phase !== 'exposed') return false;
  state.phase = 'groggy';
  state.remainingMs = modifiers.groggyDurationMs;
  return true;
}

export function markBossCleared(state: BossState): void {
  state.phase = 'cleared';
  state.remainingMs = 0;
}

export function bossCombatPolicy(
  state: BossState,
  modifiers: BossModifiers,
  baseDefense: number,
): {
  defense: number;
  incomingDamageMultiplier: number;
  canAct: boolean;
} {
  if (state.phase === 'groggy') {
    return {
      defense: modifiers.groggyDefenseOverride,
      incomingDamageMultiplier: 1,
      canAct: false,
    };
  }
  if (state.phase === 'cleared') {
    return { defense: baseDefense, incomingDamageMultiplier: 0, canAct: false };
  }
  return {
    defense: baseDefense,
    incomingDamageMultiplier: modifiers.incomingDamageMultiplier,
    canAct: true,
  };
}
