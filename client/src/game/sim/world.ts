import { stepToward, type Vec2 } from './movement';

export const PLAYER_SPEED = 6; // m/s, 화면 보고 조정

export interface WorldState {
  player: { pos: Vec2; target: Vec2 | null };
}

export function createWorld(): WorldState {
  return { player: { pos: { x: 0, z: 0 }, target: null } };
}

export function setMoveTarget(w: WorldState, target: Vec2): void {
  w.player.target = target;
}

export function tick(w: WorldState, dt: number): void {
  const p = w.player;
  if (!p.target) return;
  p.pos = stepToward(p.pos, p.target, PLAYER_SPEED, dt);
  if (p.pos.x === p.target.x && p.pos.z === p.target.z) p.target = null;
}
