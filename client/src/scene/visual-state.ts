import { visualTheme } from '../design/visual-theme';
import type { MonsterRank } from '../game/types/data';
import type { BossPhase } from '../game/sim/boss-state';

export function glowPulse(nowMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0.41;
  const phase = (nowMs % visualTheme.motion.glowPeriodMs) / visualTheme.motion.glowPeriodMs;
  return 0.35 + 0.06 * (1 - Math.cos(phase * Math.PI * 2));
}

export function transientPulse(
  nowMs: number,
  startedAtMs: number | null,
  reducedMotion: boolean,
): number {
  if (reducedMotion || startedAtMs === null || nowMs < startedAtMs) return 0;
  return Math.max(0, 1 - (nowMs - startedAtMs) / visualTheme.motion.shortMs);
}

export function transformationProgress(
  nowMs: number,
  startedAtMs: number | null,
  reducedMotion: boolean,
): number {
  if (startedAtMs === null) return 0;
  if (reducedMotion) return 1;
  return Math.min(1, Math.max(0, (nowMs - startedAtMs) / visualTheme.motion.transformationMs));
}

export function monsterVisualState(
  selected: boolean,
  rank: MonsterRank = 'NORMAL',
  bossPhase?: BossPhase,
): {
  body: string;
  core: string;
  ring: string;
  ringVisible: boolean;
  coreBoost: number;
} {
  const normal = {
    body: selected ? '#46575D' : '#344349',
    core: visualTheme.colors.crystalGlow,
    ring: visualTheme.colors.sealVermilion,
    ringVisible: selected,
    coreBoost: selected ? 0.24 : 0,
  };

  if (rank === 'NORMAL') return normal;
  if (rank === 'ELITE') {
    return {
      ...normal,
      body: selected ? '#4B5E63' : '#3B4D52',
      coreBoost: selected ? 0.3 : 0.1,
    };
  }
  if (bossPhase === 'exposed') {
    return {
      body: '#513A2E',
      core: visualTheme.colors.fireGyeol,
      ring: visualTheme.colors.fireGyeol,
      ringVisible: true,
      coreBoost: 0.32,
    };
  }
  if (bossPhase === 'groggy') {
    return {
      body: '#41545A',
      core: visualTheme.colors.crystalGlow,
      ring: visualTheme.colors.crystalGlow,
      ringVisible: true,
      coreBoost: 0.42,
    };
  }
  return {
    body: selected ? '#34464C' : '#25343A',
    core: visualTheme.colors.crystalGlow,
    ring: visualTheme.colors.sealVermilion,
    ringVisible: selected,
    coreBoost: selected ? 0.22 : 0.1,
  };
}
