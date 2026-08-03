import { describe, expect, it } from 'vitest';
import { visualTheme } from '../../design/visual-theme';
import {
  glowPulse,
  monsterVisualState,
  transformationProgress,
  transientPulse,
} from '../visual-state';

describe('scene visual state', () => {
  it('loops the crystal pulse every approved 2.4 seconds', () => {
    expect(glowPulse(0, false)).toBeCloseTo(0.35);
    expect(glowPulse(1_200, false)).toBeCloseTo(0.47);
    expect(glowPulse(2_400, false)).toBeCloseTo(0.35);
  });

  it('uses a stable midpoint when reduced motion is requested', () => {
    expect(glowPulse(0, true)).toBe(0.41);
    expect(glowPulse(1_200, true)).toBe(0.41);
  });

  it('uses silhouette plus seal ring to identify selection', () => {
    expect(monsterVisualState(false)).toEqual({
      body: '#344349',
      core: visualTheme.colors.crystalGlow,
      ring: visualTheme.colors.sealVermilion,
      ringVisible: false,
      coreBoost: 0,
    });
    expect(monsterVisualState(true)).toMatchObject({
      body: '#46575D',
      ringVisible: true,
      coreBoost: 0.24,
    });
  });

  it('decays combat feedback across the approved short duration', () => {
    expect(transientPulse(1_000, 1_000, false)).toBe(1);
    expect(transientPulse(1_100, 1_000, false)).toBe(0.5);
    expect(transientPulse(1_200, 1_000, false)).toBe(0);
    expect(transientPulse(999, 1_000, false)).toBe(0);
  });

  it('suppresses combat transients when reduced motion is requested', () => {
    expect(transientPulse(1_000, 1_000, true)).toBe(0);
    expect(transientPulse(1_000, null, false)).toBe(0);
  });

  it('reaches full transformation at the approved 800ms duration', () => {
    expect(transformationProgress(1_000, 1_000, false)).toBe(0);
    expect(transformationProgress(1_400, 1_000, false)).toBe(0.5);
    expect(transformationProgress(1_800, 1_000, false)).toBe(1);
  });

  it('uses the finished transformation state without motion when reduced', () => {
    expect(transformationProgress(1_000, 1_000, true)).toBe(1);
    expect(transformationProgress(1_000, null, true)).toBe(0);
  });
});
