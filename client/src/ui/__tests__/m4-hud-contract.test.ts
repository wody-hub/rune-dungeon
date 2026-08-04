import { describe, expect, it } from 'vitest';
import hudSource from '../Hud.svelte?raw';
import m3Source from '../M3ProgressPanel.svelte?raw';

describe('M4 HUD contract', () => {
  it('keeps the objective below the target and preserves the M3 transform control', () => {
    expect(hudSource).toContain('class="quest-objective"');
    expect(hudSource).toContain('snapshot.m4?.objective');
    expect(hudSource).toContain('snapshot.m4?.boss');
    expect(m3Source).toContain('snapshot.currentGyeolId === M3_IDS.letter');
    expect(m3Source).toContain('{#if !isCompletedCheckpoint}');
  });

  it('stacks the M4 target and objective panels without overlap at 390px', () => {
    expect(hudSource).toContain('.target-panel { top: 120px;');
    expect(hudSource).toContain('.quest-objective { top: 224px;');
  });
});
