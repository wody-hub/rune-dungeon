import { describe, expect, it } from 'vitest';
import { createWorld, enqueueIntent, tick } from '../../game/sim/world';
import {
  createHudSnapshot,
  hudSnapshotsEqual,
  playerHpFillRatio,
  type HudSnapshot,
} from '../hud-model';

describe('HUD model', () => {
  it('copies and sorts visible inventory state without exposing positions', () => {
    const world = createWorld();
    world.inventory.eum = [
      { symbol: 'ㅇ', quantity: 2 },
      { symbol: 'ㄱ', quantity: 4 },
    ];

    const snapshot = createHudSnapshot(world);

    expect(snapshot).toEqual({
      playerMode: 'idle',
      autoAttackEnabled: false,
      playerHp: 196,
      playerMaxHp: 196,
      gold: world.inventory.gold,
      eum: [
        { symbol: 'ㄱ', quantity: 4 },
        { symbol: 'ㅇ', quantity: 2 },
      ],
      target: null,
    });
    expect(snapshot).not.toHaveProperty('playerPos');
    world.inventory.eum[0].quantity = 99;
    expect(snapshot.eum[1].quantity).toBe(2);
  });

  it('describes only a selected living monster', () => {
    const world = createWorld();
    enqueueIntent(world, { type: 'select_target', monsterId: 'slime-1' });
    tick(world, 1 / 60);

    expect(createHudSnapshot(world).target).toEqual({
      id: 'slime-1',
      name: '먹물 슬라임',
      hp: 140,
      maxHp: 140,
    });

    world.monsters.get('slime-1')!.alive = false;
    expect(createHudSnapshot(world).target).toBeNull();
  });

  it('compares snapshots by visible values rather than object identity', () => {
    const world = createWorld();
    const first = createHudSnapshot(world);
    const sameValues = createHudSnapshot(world);

    expect(hudSnapshotsEqual(first, sameValues)).toBe(true);

    const changed: HudSnapshot = {
      ...sameValues,
      gold: sameValues.gold + 1,
    };
    expect(hudSnapshotsEqual(first, changed)).toBe(false);
  });

  it('publishes when visible player hp changes', () => {
    const world = createWorld();
    const before = createHudSnapshot(world);
    world.player.hp -= 16;
    const after = createHudSnapshot(world);

    expect(after).toMatchObject({ playerHp: 180, playerMaxHp: 196 });
    expect(hudSnapshotsEqual(before, after)).toBe(false);
  });

  it('publishes when visible player maximum hp changes', () => {
    const world = createWorld();
    const before = createHudSnapshot(world);
    world.player.maxHp += 40;
    const after = createHudSnapshot(world);

    expect(after).toMatchObject({ playerHp: 196, playerMaxHp: 236 });
    expect(hudSnapshotsEqual(before, after)).toBe(false);
  });

  it.each([
    [0, 196, 0],
    [-16, 196, 0],
    [212, 196, 1],
    [16, 0, 0],
  ])('clamps player hp fill ratio for hp %i and max hp %i', (hp, maxHp, expected) => {
    expect(playerHpFillRatio(hp, maxHp)).toBe(expected);
  });
});
