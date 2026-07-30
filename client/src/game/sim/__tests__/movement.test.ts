import { describe, it, expect } from 'vitest';
import { stepToward } from '../movement';

describe('stepToward', () => {
  it('목표를 향해 speed*dt 만큼 전진한다', () => {
    const next = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
    expect(next.x).toBeCloseTo(0.5);
    expect(next.z).toBeCloseTo(0);
  });

  it('대각선 방향도 정규화된 방향으로 전진한다', () => {
    const next = stepToward({ x: 0, z: 0 }, { x: 3, z: 4 }, 5, 1);
    expect(next.x).toBeCloseTo(3);
    expect(next.z).toBeCloseTo(4);
  });

  it('남은 거리가 한 걸음보다 짧으면 목표에 스냅한다', () => {
    const next = stepToward({ x: 9.9, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
    expect(next).toEqual({ x: 10, z: 0 });
  });

  it('이미 목표 지점이면 그대로 머문다', () => {
    const next = stepToward({ x: 10, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
    expect(next).toEqual({ x: 10, z: 0 });
  });
});
