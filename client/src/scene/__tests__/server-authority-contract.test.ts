/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('M5.1 scene authority boundary', () => {
  const gameScene = read('../GameScene.svelte');

  it('creates authority mode only for a present server URL and routes ground clicks once', () => {
    expect(gameScene).toContain("playerMovement: authorityDemo ? 'authoritative' : 'local'");
    expect(gameScene).toContain('connection?.sendMove({ x, z })');
    expect(gameScene).toContain("enqueueIntent(world, { type: 'move_to_ground'");
    expect(gameScene).toContain('applyAuthoritativePlayerPosition');
    expect(gameScene).toContain('onJoin: (position)');
    expect(gameScene).toContain('onSnapshot: (snapshot)');
  });

  it('threads a disabled input gate through every M2-M4 interaction', () => {
    expect(gameScene).toContain('inputEnabled={!authorityDemo}');
    expect(read('../MonsterLayer.svelte')).toContain('{inputEnabled}');
    expect(read('../MonsterEntity.svelte')).toContain('if (!inputEnabled');
    expect(read('../M3SupplyCache.svelte')).toContain('if (!inputEnabled)');
    expect(read('../M4BossGate.svelte')).toContain('if (!inputEnabled');
    expect(read('../../ui/Hud.svelte')).toContain('disabled={authorityDemo}');
    expect(read('../../ui/M3ProgressPanel.svelte')).toContain('disabled={disabled}');
  });
});
