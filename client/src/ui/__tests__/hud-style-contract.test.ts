import { describe, expect, it } from 'vitest';
import hudSource from '../Hud.svelte?raw';

describe('HUD style contract', () => {
  it('uses border-box sizing so mobile panel widths fit the viewport', () => {
    expect(hudSource).toMatch(/\.hud-panel\s*\{[^}]*box-sizing:\s*border-box/s);
    expect(hudSource).toContain('width: calc(100vw - var(--rd-panel-mobile-gutter));');
  });

  it('consumes shared typography, spacing, radii, and panel tokens', () => {
    expect(hudSource).toContain('font-family: var(--rd-font-body);');
    expect(hudSource).toContain('font: 600 var(--rd-type-label-size)/1.2 var(--rd-font-data);');
    expect(hudSource).toContain('padding: var(--rd-panel-padding-block) var(--rd-panel-padding-inline);');
    expect(hudSource).toContain('border-radius: var(--rd-radius-sm);');
    expect(hudSource).not.toMatch(/font[^;]*\b(?:9|10)px/);
  });
});
