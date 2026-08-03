import { describe, expect, it } from 'vitest';
import cacheSource from '../M3SupplyCache.svelte?raw';
import sceneSource from '../GameScene.svelte?raw';
import playerSource from '../PlayerLayer.svelte?raw';

describe('M3 scene contract', () => {
  it('forwards the one-time cache through the existing imperative update loop', () => {
    expect(cacheSource).toContain("onCollect('collect_m3_supply_cache')");
    expect(cacheSource).toContain('export function update(visible: boolean, nowMs: number): void');
    expect(sceneSource).toContain('supplyCache?.update(world.m3.cacheAvailable && !world.m3.cacheCollected, now);');
  });

  it('keeps transformation to an aura and weapon-light treatment on temporary geometry', () => {
    expect(playerSource).toContain('Primitive geometry remains an explicitly temporary silhouette.');
    expect(playerSource).toContain('transformed: boolean');
    expect(playerSource).toContain('visualTheme.colors.fireGyeol');
    expect(playerSource).toContain('transformationProgress');
  });
});
