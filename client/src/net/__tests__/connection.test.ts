import { describe, expect, it, vi } from 'vitest';
import {
  reconnectDelayMs,
  ServerConnection,
  type SocketLike,
} from '../connection';
import type { PlayerSnapshot, Vec2 } from '../protocol';

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(code = 1000): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data: unknown): void {
    this.onmessage?.({ data });
  }
}

class FakeScheduler {
  private nextHandle = 1;
  private callbacks = new Map<number, () => void>();

  schedule = (callback: () => void): number => {
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  };

  clear = (handle: number): void => {
    this.callbacks.delete(handle);
  };

  runNext(): void {
    const entry = this.callbacks.entries().next().value as [number, () => void] | undefined;
    if (!entry) throw new Error('no scheduled callback');
    this.callbacks.delete(entry[0]);
    entry[1]();
  }

  runNextIfPresent(): void {
    if (this.callbacks.size > 0) this.runNext();
  }

  runAll(): void {
    while (this.callbacks.size > 0) this.runNext();
  }

  get pendingCount(): number {
    return this.callbacks.size;
  }
}

function snapshotFrame(playerId: number, tick: number): string {
  return JSON.stringify({
    WorldSnapshot: {
      tick,
      player: {
        id: playerId,
        position: { x: tick, z: 0 },
        target: null,
      },
    },
  });
}

function joinAcceptedFrame(playerId: number, position: Vec2): string {
  return JSON.stringify({
    JoinAccepted: { player_id: playerId, nickname: '모험가', position },
  });
}

function createTestConnection(
  sockets: FakeSocket | FakeSocket[],
  scheduler: FakeScheduler | number[] = new FakeScheduler(),
  onSnapshot: (snapshot: PlayerSnapshot) => void = () => undefined,
  onJoin: (position: Vec2) => void = () => undefined,
) {
  const queue = Array.isArray(sockets) ? sockets : [sockets];
  const scheduled = Array.isArray(scheduler) ? scheduler : null;
  const fakeScheduler = Array.isArray(scheduler) ? null : scheduler;
  let socketFactoryCalls = 0;
  const acceptedTicks: number[] = [];
  const connection = new ServerConnection({
    url: 'ws://127.0.0.1:8080',
    clientVersion: '0.0.0',
    nickname: '모험가',
    socketFactory: () => queue[socketFactoryCalls++],
    random: () => 1,
    schedule: scheduled
      ? (_callback, delayMs) => {
          scheduled.push(delayMs);
          return scheduled.length;
        }
      : fakeScheduler!.schedule,
    clearSchedule: scheduled ? () => undefined : fakeScheduler!.clear,
    onState: () => undefined,
    onJoin,
    onSnapshot: (snapshot) => {
      acceptedTicks.push(snapshot.tick);
      onSnapshot(snapshot.player);
    },
  });
  return {
    connection,
    acceptedTicks,
    get socketFactoryCalls() {
      return socketFactoryCalls;
    },
  };
}

describe('M5.1 server connection', () => {
  it('sends ClientInfo then JoinAsGuest when the socket opens', () => {
    const socket = new FakeSocket();
    const connection = new ServerConnection({
      url: 'ws://127.0.0.1:8080',
      clientVersion: '0.0.0',
      nickname: '모험가',
      socketFactory: () => socket,
      random: () => 0.5,
      schedule: () => 1,
      clearSchedule: () => undefined,
      onState: () => undefined,
      onJoin: () => undefined,
      onSnapshot: () => undefined,
    });
    connection.connect();
    socket.open();
    expect(socket.sent).toEqual([
      '{"ClientInfo":{"protocol_version":1,"client_kind":"web","client_version":"0.0.0"}}',
      '{"JoinAsGuest":{"nickname":"모험가"}}',
    ]);
  });

  it('does not reconnect after protocol close code 4001', () => {
    const scheduled: number[] = [];
    const socket = new FakeSocket();
    const { connection } = createTestConnection(socket, scheduled);
    connection.connect();
    socket.open();
    socket.close(4001);
    expect(connection.state).toMatchObject({ kind: 'protocol_mismatch' });
    expect(scheduled).toEqual([]);
  });

  it('ignores pre-join and wrong-player snapshots, then forwards only increasing joined-player ticks', () => {
    const received: number[] = [];
    const joinedPositions: Vec2[] = [];
    const socket = new FakeSocket();
    const { connection } = createTestConnection(
      socket,
      [],
      (snapshot) => received.push(snapshot.position.x),
      (position) => joinedPositions.push(position),
    );
    connection.connect();
    socket.open();
    socket.message(snapshotFrame(1, 2));
    socket.message(joinAcceptedFrame(1, { x: 0, z: 0 }));
    socket.message(snapshotFrame(2, 1));
    socket.message(snapshotFrame(1, 1));
    socket.message(snapshotFrame(1, 2));
    expect(received).toEqual([1, 2]);
    expect(joinedPositions).toEqual([{ x: 0, z: 0 }]);
  });

  it('uses full jitter under the 1s-to-30s exponential cap', () => {
    expect(reconnectDelayMs(1, () => 0.5)).toBe(500);
    expect(reconnectDelayMs(6, () => 1)).toBe(30_000);
    expect(reconnectDelayMs(10, () => 1)).toBe(30_000);
  });

  it('accepts tick 1 after a new JoinAccepted and ignores the old socket', () => {
    const scheduler = new FakeScheduler();
    const first = new FakeSocket();
    const second = new FakeSocket();
    const harness = createTestConnection([first, second], scheduler);
    harness.connection.connect();
    first.open();
    first.message(joinAcceptedFrame(1, { x: 0, z: 0 }));
    first.message(snapshotFrame(1, 20));
    first.close(1006);
    scheduler.runNext();
    second.open();
    second.message(joinAcceptedFrame(2, { x: 0, z: 0 }));
    second.message(snapshotFrame(2, 1));
    first.message(snapshotFrame(1, 21));
    expect(harness.acceptedTicks).toEqual([20, 1]);
    expect(harness.connection.state).toMatchObject({ kind: 'connected', playerId: 2 });
  });

  it('creates exactly ten reconnect sockets, then fails without another timer', () => {
    const scheduler = new FakeScheduler();
    const sockets = Array.from({ length: 11 }, () => new FakeSocket());
    const harness = createTestConnection(sockets, scheduler);
    harness.connection.connect();
    for (const socket of sockets) {
      socket.open();
      socket.close(1006);
      scheduler.runNextIfPresent();
    }
    expect(harness.connection.state).toMatchObject({ kind: 'failed' });
    expect(scheduler.pendingCount).toBe(0);
    expect(harness.socketFactoryCalls).toBe(11);
  });

  it('dispose cancels a pending reconnect without creating another socket', () => {
    const scheduler = new FakeScheduler();
    const socket = new FakeSocket();
    const harness = createTestConnection([socket], scheduler);
    harness.connection.connect();
    socket.open();
    socket.close(1006);
    harness.connection.dispose();
    scheduler.runAll();
    expect(harness.socketFactoryCalls).toBe(1);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('keeps authority mode failed when socket creation throws for an invalid server URL', () => {
    const scheduled: number[] = [];
    const connection = new ServerConnection({
      url: 'not-a-websocket-url',
      clientVersion: '0.0.0',
      nickname: '모험가',
      socketFactory: () => {
        throw new SyntaxError('Invalid URL');
      },
      random: () => 0.5,
      schedule: () => {
        scheduled.push(1);
        return 1;
      },
      clearSchedule: () => undefined,
      onState: () => undefined,
      onJoin: () => undefined,
      onSnapshot: () => undefined,
    });
    connection.connect();
    expect(connection.state).toMatchObject({ kind: 'failed' });
    expect(scheduled).toEqual([]);
  });

  it('warns and ignores a non-text browser WebSocket message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const received: number[] = [];
    const socket = new FakeSocket();
    const { connection } = createTestConnection(socket, [], (snapshot) =>
      received.push(snapshot.position.x),
    );
    connection.connect();
    socket.open();
    socket.message(new ArrayBuffer(1));
    expect(received).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
