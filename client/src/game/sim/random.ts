export interface RandomSource {
  next(): number;
}

export const mathRandom: RandomSource = { next: () => Math.random() };

export function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random.next() * (max - min + 1));
}
