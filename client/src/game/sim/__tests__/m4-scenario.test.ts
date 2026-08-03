import { describe, expect, it } from 'vitest';
import type { MonsterItem } from '../../types/data';
import {
  createM4Progress,
  enterM4BossRoom,
  m4ObjectiveText,
  unlockM4BossGate,
} from '../m4-scenario';

const bossFixture = {
  id: 'boss',
  bossStateModifiers: {
    incomingDamageMultiplier: 0.5,
    weaknessExposeDurationMs: 4_000,
    groggyDurationMs: 10_000,
    groggyDefenseOverride: 0,
    guaranteedIncantationTagOnWeakness: 'FIRE',
  },
} as MonsterItem;

describe('M4 scenario', () => {
  it('requires the elite clear before entering the local boss room', () => {
    const progress = createM4Progress(bossFixture);

    expect(m4ObjectiveText(progress)).toContain('오타 요정');
    expect(enterM4BossRoom(progress)).toBe(false);
    unlockM4BossGate(progress);
    expect(progress.gateUnlocked).toBe(true);
    expect(m4ObjectiveText(progress)).toContain('최심부');
    expect(enterM4BossRoom(progress)).toBe(true);
    expect(progress.area).toBe('pencil_knight_boss_room');
    expect(m4ObjectiveText(progress)).toContain('화 변신');
  });
});
