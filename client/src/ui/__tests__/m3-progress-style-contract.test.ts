import { describe, expect, it } from 'vitest';
import panelSource from '../M3ProgressPanel.svelte?raw';

describe('M3 progression panel style contract', () => {
  it('uses the approved panel, fire, and motion tokens without blocking the game overlay', () => {
    expect(panelSource).toContain('pointer-events: auto;');
    expect(panelSource).toContain('var(--rd-fire-gyeol)');
    expect(panelSource).toContain('var(--rd-motion-transformation)');
    expect(panelSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('stacks above the resource panel on narrow screens and preserves keyboard controls', () => {
    expect(panelSource).toContain('@media (max-width: 720px)');
    expect(panelSource).toContain('bottom: 176px;');
    expect(panelSource).toMatch(/<button[\s\S]*onAction\(action\)/);
  });

  it('hides decorative acquisition and inscription overlays when motion is reduced', () => {
    expect(panelSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.acquisition-chips,[\s\S]*\.inscription-flash[\s\S]*display:\s*none;/,
    );
  });
});
