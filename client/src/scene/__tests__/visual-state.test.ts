import { describe, expect, it } from 'vitest';
import { visualTheme } from '../../design/visual-theme';
import { glowPulse, monsterVisualState } from '../visual-state';

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
      body: '#13191C',
      core: visualTheme.colors.crystalGlow,
      ring: visualTheme.colors.sealVermilion,
      ringVisible: false,
      coreBoost: 0,
    });
    expect(monsterVisualState(true)).toMatchObject({
      body: '#20272A',
      ringVisible: true,
      coreBoost: 0.24,
    });
  });
});
