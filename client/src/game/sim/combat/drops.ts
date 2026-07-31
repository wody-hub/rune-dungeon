import type { DropTable, EumStack } from '../../types/data';
import { randomInt, type RandomSource } from '../random';

export interface CombatRewards {
  gold: number;
  eum: EumStack[];
}

function pickWeighted<T extends { weight: number }>(
  entries: T[],
  random: RandomSource,
): number {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random.next() * total;

  for (let index = 0; index < entries.length; index += 1) {
    roll -= entries[index].weight;
    if (roll < 0) return index;
  }

  return entries.length - 1;
}

export function rollCombatRewards(
  dropTable: DropTable,
  random: RandomSource,
): CombatRewards {
  let gold = 0;
  for (const entry of dropTable.entries) {
    if (entry.kind !== 'GOLD') continue;
    if (!entry.guaranteed && random.next() >= entry.probability) continue;
    gold += randomInt(random, entry.quantity.min, entry.quantity.max);
  }

  let available = [...dropTable.eumRollGroup.entries];
  const rolledDrawCount = randomInt(
    random,
    dropTable.eumRollGroup.draws.min,
    dropTable.eumRollGroup.draws.max,
  );
  const drawCount = dropTable.eumRollGroup.allowDuplicateSymbols
    ? rolledDrawCount
    : Math.min(available.length, rolledDrawCount);
  const quantities = new Map<string, number>();

  for (let draw = 0; draw < drawCount && available.length > 0; draw += 1) {
    const index = pickWeighted(available, random);
    const entry = available[index];
    const quantity = randomInt(random, entry.quantity.min, entry.quantity.max);
    quantities.set(entry.symbol, (quantities.get(entry.symbol) ?? 0) + quantity);
    if (!dropTable.eumRollGroup.allowDuplicateSymbols) {
      available = available.filter(({ symbol }) => symbol !== entry.symbol);
    }
  }

  return {
    gold,
    eum: [...quantities].map(([symbol, quantity]) => ({ symbol, quantity })),
  };
}
