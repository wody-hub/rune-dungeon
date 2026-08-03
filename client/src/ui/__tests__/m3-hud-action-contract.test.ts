import { describe, expect, it } from 'vitest';
import appSource from '../../App.svelte?raw';
import sceneSource from '../../scene/GameScene.svelte?raw';
import hudSource from '../Hud.svelte?raw';

describe('M3 HUD action bridge', () => {
  it('keeps the current Gyeol in the player HUD and delegates M3 actions to the scene', () => {
    expect(hudSource).toContain("import M3ProgressPanel from './M3ProgressPanel.svelte';");
    expect(hudSource).toContain('현재 결 · 화');
    expect(hudSource).toContain('onM3Action');
    expect(hudSource).toContain('<M3ProgressPanel snapshot={snapshot.m3} onAction={onM3Action} />');
    expect(appSource).toContain('bind:this={scene}');
    expect(appSource).toContain('scene?.requestM3Action(action)');
    expect(sceneSource).toMatch(/export function requestM3Action\(action: M3Action\): void/);
    expect(sceneSource).toContain('enqueueIntent(world, { type: action });');
  });
});
