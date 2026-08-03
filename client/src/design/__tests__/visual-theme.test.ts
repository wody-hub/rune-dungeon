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

  it('keeps the approved typography, spacing, radii, and panel geometry', () => {
    expect(visualTheme.typography).toEqual({
      displayFamily: '"Gowun Batang", serif',
      bodyFamily: '"SUIT Variable", sans-serif',
      dataFamily: '"IBM Plex Mono", monospace',
      labelSize: '11px',
      bodySize: '13px',
      emphasizedSize: '15px',
      panelTitleSize: '18px',
      sectionTitleSize: '24px',
      displaySize: '36px',
    });
    expect(visualTheme.spacing).toEqual({
      '2xs': '2px',
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
      '3xl': '64px',
    });
    expect(visualTheme.radii).toEqual({
      sm: '2px',
      md: '4px',
      lg: '6px',
      full: '9999px',
    });
    expect(visualTheme.panel).toEqual({
      inset: '16px',
      mobileGutter: '32px',
      paddingBlock: '8px',
      paddingInline: '16px',
      borderWidth: '1px',
      playerWidth: '262px',
      targetWidth: '362px',
      resourceWidth: '282px',
      debugWidth: '212px',
      mobileTargetTop: '104px',
    });
  });

  it('serializes stable CSS custom properties for the Svelte shell', () => {
    const variables = themeCssVariables().split(';');
    expect(variables).toEqual(expect.arrayContaining([
      '--rd-ink-950:#0D1418',
      '--rd-font-display:"Gowun Batang", serif',
      '--rd-font-body:"SUIT Variable", sans-serif',
      '--rd-font-data:"IBM Plex Mono", monospace',
      '--rd-type-label-size:11px',
      '--rd-type-body-size:13px',
      '--rd-space-sm:8px',
      '--rd-space-md:16px',
      '--rd-radius-sm:2px',
      '--rd-panel-inset:16px',
      '--rd-panel-mobile-gutter:32px',
      '--rd-panel-player-width:262px',
      '--rd-panel-target-width:362px',
      '--rd-panel-resource-width:282px',
      '--rd-motion-short:200ms',
    ]));
  });
});
