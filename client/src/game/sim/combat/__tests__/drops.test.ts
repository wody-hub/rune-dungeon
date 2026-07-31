import { describe, expect, it } from 'vitest';
import type { DropTable } from '../../../types/data';
import { rollCombatRewards } from '../drops';

const drops: DropTable = {
  entries: [
    { kind: 'GOLD', probability: 1, quantity: { min: 5, max: 10 }, guaranteed: true },
  ],
  eumRollGroup: {
    draws: { min: 1, max: 2 },
    allowDuplicateSymbols: false,
    entries: [
      { symbol: 'ㄱ', weight: 1, quantity: { min: 1, max: 1 } },
      { symbol: 'ㅏ', weight: 1, quantity: { min: 1, max: 1 } },
      { symbol: 'ㅇ', weight: 1, quantity: { min: 1, max: 1 } },
    ],
  },
};

function sequence(values: number[]) {
  let index = 0;
  return { next: () => values[index++] ?? 0 };
}

describe('combat rewards', () => {
  it('rolls guaranteed gold and non-duplicate eum deterministically', () => {
    const rewards = rollCombatRewards(drops, sequence([0, 0.99, 0, 0]));

    expect(rewards.gold).toBe(5);
    expect(rewards.eum).toEqual([
      { symbol: 'ㄱ', quantity: 1 },
      { symbol: 'ㅏ', quantity: 1 },
    ]);
  });
});
