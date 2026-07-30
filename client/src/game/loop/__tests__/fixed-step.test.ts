import { describe, it, expect } from 'vitest';
import { createFrameTimer, FRAME_TIME_MS, MAX_CATCH_UP_STEPS } from '../fixed-step';

describe('createFrameTimer', () => {
  it('한 프레임(16.67ms) 경과 시 1스텝을 반환한다', () => {
    const timer = createFrameTimer(0);
    expect(timer.advance(FRAME_TIME_MS)).toBe(1);
  });

  it('프레임 시간 미만이면 0스텝(프레임 스킵)을 반환한다', () => {
    const timer = createFrameTimer(0);
    expect(timer.advance(FRAME_TIME_MS * 0.4)).toBe(0);
  });

  it('밀린 시간은 다음 프레임의 스텝 수로 회수된다', () => {
    const timer = createFrameTimer(0);
    timer.advance(FRAME_TIME_MS);
    expect(timer.advance(FRAME_TIME_MS * 4)).toBe(3);
  });

  it('캐치업 스텝은 MAX_CATCH_UP_STEPS로 클램프되고 백로그는 폐기된다', () => {
    const timer = createFrameTimer(0);
    expect(timer.advance(FRAME_TIME_MS * 100)).toBe(MAX_CATCH_UP_STEPS);
    // 백로그가 폐기됐으므로 바로 다음 짧은 구간은 다시 0 또는 1스텝
    expect(timer.advance(FRAME_TIME_MS * 100 + FRAME_TIME_MS)).toBe(1);
  });
});
