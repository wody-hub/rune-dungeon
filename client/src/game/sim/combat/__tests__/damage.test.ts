import { describe, expect, it } from 'vitest';
import { rollPhysicalDamage } from '../damage';

describe('physical damage', () => {
  it('uses the configured weapon roll, bonus, multiplier, and defense', () => {
    const damage = rollPhysicalDamage(
      { minDamage: 12, maxDamage: 20, attackBonus: 12, damageMultiplier: 1.45, defense: 10 },
      { next: () => 0 },
    );
    expect(damage).toBe(31);
  });

  it('always deals at least one damage', () => {
    const damage = rollPhysicalDamage(
      { minDamage: 1, maxDamage: 1, attackBonus: 0, damageMultiplier: 1, defense: 999_999 },
      { next: () => 0 },
    );
    expect(damage).toBe(1);
  });
});
