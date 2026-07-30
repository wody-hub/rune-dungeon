// 정통 아이소메트릭 카메라 수식. 렌더러와 무관한 순수 계산만 둔다.
export const ISO_PITCH = Math.atan(1 / Math.SQRT2); // ≈ 35.264°
export const ISO_YAW = -Math.PI / 4; // -45°
export const ISO_DISTANCE = 50;
export const FRUSTUM_HEIGHT = 20;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// pitch/yaw/distance에서 카메라 오프셋(카메라 위치 - 주시점)을 파생한다.
export function deriveCameraOffset(pitch: number, yaw: number, distance: number): Vec3 {
  const horizontal = distance * Math.cos(pitch);
  return {
    x: horizontal * Math.sin(yaw),
    y: distance * Math.sin(pitch),
    z: horizontal * Math.cos(yaw),
  };
}
