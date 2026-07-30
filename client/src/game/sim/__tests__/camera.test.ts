import { describe, it, expect } from 'vitest';
import { ISO_PITCH, ISO_YAW, deriveCameraOffset } from '../camera';

describe('deriveCameraOffset', () => {
  it('정통 아이소메트릭 각도에서 수평 성분 크기가 같다 (yaw -45°)', () => {
    const o = deriveCameraOffset(ISO_PITCH, ISO_YAW, 50);
    expect(Math.abs(o.x)).toBeCloseTo(Math.abs(o.z));
  });

  it('오프셋 벡터 길이가 distance와 같다', () => {
    const o = deriveCameraOffset(ISO_PITCH, ISO_YAW, 50);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(50);
  });

  it('pitch atan(1/√2)에서 y 성분은 distance/√3이다', () => {
    const o = deriveCameraOffset(ISO_PITCH, ISO_YAW, 50);
    expect(o.y).toBeCloseTo(50 / Math.sqrt(3));
  });
});
