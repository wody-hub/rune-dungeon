import { describe, expect, it } from 'vitest';
import sceneSource from '../GameScene.svelte?raw';
import gateSource from '../M4BossGate.svelte?raw';
import monsterSource from '../MonsterEntity.svelte?raw';

describe('M4 scene contract', () => {
  it('renders a local gate through an intent and updates it inside the imperative loop', () => {
    expect(sceneSource).toContain("type: 'enter_m4_boss_room'");
    expect(sceneSource).toContain('bossGate?.update(');
    expect(gateSource).toContain('export function update(area: M4Area, unlocked: boolean, nowMs: number)');
    expect(gateSource).toContain('onEnter()');
  });

  it('keeps monster clicks aligned with the imperative active-region update', () => {
    expect(monsterSource).toContain('let activeNow = false;');
    expect(monsterSource).toContain('if (!activeNow || !monster.alive) return;');
  });
});
