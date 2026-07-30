export interface Vec2 {
  x: number;
  z: number;
}

export function stepToward(pos: Vec2, target: Vec2, speed: number, dt: number): Vec2 {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  const step = speed * dt;
  if (dist <= step) return { ...target };
  return { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step };
}
