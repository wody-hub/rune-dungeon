// 고정 스텝 프레임 타이밍. 시뮬레이션은 항상 FRAME_TIME_MS의 정수배로만 전진한다.
export const TARGET_FPS = 60;
export const FRAME_TIME_MS = 1000 / TARGET_FPS;
export const FRAME_TOLERANCE_MS = 0.5;
export const MAX_CATCH_UP_STEPS = 5;

export interface FrameTimer {
  // 현재 시각(ms)을 받아 이번 프레임에 시뮬레이션할 스텝 수를 반환한다.
  advance(now: number): number;
}

export function createFrameTimer(startTime: number): FrameTimer {
  let lastFrameTime = startTime;
  return {
    advance(now: number): number {
      const raw = now - lastFrameTime;
      if (raw < FRAME_TIME_MS - FRAME_TOLERANCE_MS) return 0;
      const stepCount = Math.floor((raw + FRAME_TOLERANCE_MS) / FRAME_TIME_MS);
      if (stepCount > MAX_CATCH_UP_STEPS) {
        // 탭 전환·정지 등으로 쌓인 백로그는 전량 폐기하고 현재 시각 기준으로 재정렬한다.
        lastFrameTime = now;
        return MAX_CATCH_UP_STEPS;
      }
      lastFrameTime += stepCount * FRAME_TIME_MS;
      return stepCount;
    },
  };
}
