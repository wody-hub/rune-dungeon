import { describe, expect, it } from 'vitest';
import monsterSource from '../MonsterEntity.svelte?raw';
import playerSource from '../PlayerLayer.svelte?raw';

describe('scene combat feedback contract', () => {
  it('renders player attack and damage transients without simulation changes', () => {
    expect(playerSource).toContain("import { glowPulse, transientPulse } from './visual-state';");
    expect(playerSource).toContain('world.player.hp < previousHp');
    expect(playerSource).toContain("world.player.mode === 'attacking'");
    expect(playerSource).toContain('transientPulse(nowMs, damageStartedAtMs, reducedMotion)');
    expect(playerSource).toContain('transientPulse(nowMs, attackStartedAtMs, reducedMotion)');
    expect(playerSource).toContain('color="#40545C"');
    expect(playerSource).toContain('metalness={0.42} roughness={0.52}');
    expect(playerSource).toContain('color="#52666D" side={BackSide}');
  });

  it('renders monster damage feedback and consumes the shared ring color', () => {
    expect(monsterSource).toContain("import { glowPulse, monsterVisualState, transientPulse } from './visual-state';");
    expect(monsterSource).toContain('monster.hp < previousHp');
    expect(monsterSource).toContain('transientPulse(nowMs, damageStartedAtMs, reducedMotion)');
    expect(monsterSource).toContain('selectionRingMaterial.color.set(visual.ring)');
    expect(monsterSource).toContain('color="#46585F" side={BackSide}');
  });
});
