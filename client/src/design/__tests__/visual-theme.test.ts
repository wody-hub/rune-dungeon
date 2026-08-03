import { describe, expect, it } from 'vitest';
import { themeCssVariables, visualTheme } from '../visual-theme';

describe('visual theme', () => {
  it('keeps the approved ink, crystal, seal, and fire colors', () => {
    expect(visualTheme.colors).toMatchObject({
      ink950: '#0D1418',
      metalSurface: '#182328',
      paperText: '#DDD4BD',
      crystalGlow: '#68D5D0',
      sealVermilion: '#E05A42',
      fireGyeol: '#FFAD42',
      danger: '#CF505C',
    });
  });

  it('serializes stable CSS custom properties for the Svelte shell', () => {
    expect(themeCssVariables()).toBe(
      [
        '--rd-ink-950:#0D1418',
        '--rd-metal-surface:#182328',
        '--rd-paper-text:#DDD4BD',
        '--rd-muted-text:#9F9A89',
        '--rd-crystal-glow:#68D5D0',
        '--rd-seal-vermilion:#E05A42',
        '--rd-fire-gyeol:#FFAD42',
        '--rd-danger:#CF505C',
        '--rd-success:#74C995',
        '--rd-info:#72AEE8',
      ].join(';'),
    );
  });
});
