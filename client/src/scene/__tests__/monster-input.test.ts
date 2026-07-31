import { describe, expect, it } from 'vitest';
import { intentsForMonsterGesture } from '../monster-input';

describe('monster input', () => {
  it('turns a single click into target selection only', () => {
    expect(intentsForMonsterGesture('slime-1', 'select')).toEqual([
      { type: 'select_target', monsterId: 'slime-1' },
    ]);
  });

  it('orders target selection before the double-click auto-attack toggle', () => {
    expect(intentsForMonsterGesture('slime-2', 'start_auto_attack')).toEqual([
      { type: 'select_target', monsterId: 'slime-2' },
      { type: 'toggle_auto_attack' },
    ]);
  });
});
