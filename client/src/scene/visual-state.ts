import { visualTheme } from '../design/visual-theme';

export function glowPulse(nowMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0.41;
  const phase = (nowMs % visualTheme.motion.glowPeriodMs) / visualTheme.motion.glowPeriodMs;
  return 0.35 + 0.06 * (1 - Math.cos(phase * Math.PI * 2));
}

export function monsterVisualState(selected: boolean): {
  body: string;
  core: string;
  ring: string;
  ringVisible: boolean;
  coreBoost: number;
} {
  return {
    body: selected ? '#20272A' : '#13191C',
    core: visualTheme.colors.crystalGlow,
    ring: visualTheme.colors.sealVermilion,
    ringVisible: selected,
    coreBoost: selected ? 0.24 : 0,
  };
}
