import { describe, expect, it } from 'vitest';
import { LOGICAL_PX_TO_WORLD_UNIT, toWorldDistance } from '../runtime-content';

describe('runtime content units', () => {
  it('converts every logical distance through one scale', () => {
    expect(LOGICAL_PX_TO_WORLD_UNIT).toBe(0.1);
    expect(toWorldDistance(56)).toBeCloseTo(5.6);
    expect(toWorldDistance(42)).toBeCloseTo(4.2);
  });
});
