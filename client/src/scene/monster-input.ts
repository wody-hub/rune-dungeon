import type { GameIntent } from '../game/sim/world';

export type MonsterGesture = 'select' | 'start_auto_attack';

export function intentsForMonsterGesture(
  monsterId: string,
  gesture: MonsterGesture,
): GameIntent[] {
  const select: GameIntent = {
    type: 'select_target',
    monsterId,
  };
  return gesture === 'select'
    ? [select]
    : [select, { type: 'toggle_auto_attack' }];
}
