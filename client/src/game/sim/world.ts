import { stepToward, type Vec2 } from './movement';

export const PLAYER_SPEED = 6; // m/s, 화면 보고 조정

// 입력은 즉시 실행하지 않고 인텐트로 큐에 쌓아 프레임 틱에서 소비한다.
export type ClickIntent = { type: 'move_to_ground'; point: Vec2 };

export interface WorldState {
  player: { pos: Vec2; target: Vec2 | null };
  pendingIntents: ClickIntent[];
}

export function createWorld(): WorldState {
  return { player: { pos: { x: 0, z: 0 }, target: null }, pendingIntents: [] };
}

export function enqueueIntent(w: WorldState, intent: ClickIntent): void {
  w.pendingIntents.push(intent);
}

function drainIntents(w: WorldState): void {
  for (const intent of w.pendingIntents) {
    if (intent.type === 'move_to_ground') w.player.target = { ...intent.point };
  }
  w.pendingIntents.length = 0;
}

export function tick(w: WorldState, dt: number): void {
  drainIntents(w);
  const p = w.player;
  if (!p.target) return;
  p.pos = stepToward(p.pos, p.target, PLAYER_SPEED, dt);
  if (p.pos.x === p.target.x && p.pos.z === p.target.z) p.target = null;
}
