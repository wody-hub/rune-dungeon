import { randomInt, type RandomSource } from '../random';

export interface PhysicalDamageInput {
  minDamage: number;
  maxDamage: number;
  attackBonus: number;
  damageMultiplier: number;
  defense: number;
}

export function rollPhysicalDamage(input: PhysicalDamageInput, random: RandomSource): number {
  const weaponDamage = randomInt(random, input.minDamage, input.maxDamage);
  const rawDamage = (weaponDamage + input.attackBonus) * input.damageMultiplier;

  return Math.max(1, Math.floor((rawDamage * 100) / (100 + input.defense)));
}
