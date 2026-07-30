import { describe, it, expect } from 'vitest';
import { createWorld, enqueueIntent, tick, PLAYER_SPEED } from '../world';

describe('world intents', () => {
  it('move_to_ground 인텐트는 틱에서 소비되어 이동 목표가 된다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0.1);
    expect(w.player.target).toEqual({ x: 10, z: 0 });
    expect(w.player.pos.x).toBeCloseTo(PLAYER_SPEED * 0.1);
    expect(w.pendingIntents).toHaveLength(0);
  });

  it('같은 틱에 여러 인텐트가 오면 마지막 것이 이긴다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 0, z: 10 } });
    tick(w, 0.01);
    expect(w.player.target).toEqual({ x: 0, z: 10 });
  });

  it('목표 도달 시 target이 해제된다', () => {
    const w = createWorld();
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 0.1, z: 0 } });
    tick(w, 1);
    expect(w.player.pos).toEqual({ x: 0.1, z: 0 });
    expect(w.player.target).toBeNull();
  });
});
