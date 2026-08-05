import {
  clientInfoMessage,
  CLOSE_CODE_PROTOCOL_MISMATCH,
  encodeClientMessage,
  joinGuestMessage,
  moveToGroundMessage,
  parseServerMessage,
  toggleTransformationMessage,
  type ServerMessage,
  type Vec2,
} from './protocol';

export type ConnectionState =
  | { kind: 'connecting' }
  | { kind: 'joining' }
  | { kind: 'connected'; playerId: number; nickname: string }
  | { kind: 'reconnecting'; attempt: number; delayMs: number; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'protocol_mismatch'; message: string };

export type WorldSnapshotPayload = Extract<
  ServerMessage,
  { WorldSnapshot: unknown }
>['WorldSnapshot'];

export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
  send(data: string): void;
  close(): void;
}

interface ServerConnectionOptions {
  url: string;
  clientVersion: string;
  nickname: string;
  socketFactory?: (url: string) => SocketLike;
  random?: () => number;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (handle: number) => void;
  onState: (state: ConnectionState) => void;
  onJoin: (position: Vec2) => void;
  onSnapshot: (snapshot: WorldSnapshotPayload) => void;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const OPEN_READY_STATE = 1;

export function reconnectDelayMs(attempt: number, random: () => number): number {
  const cap = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
  return Math.floor(cap * random());
}

export class ServerConnection {
  state: ConnectionState = { kind: 'connecting' };

  private readonly url: string;
  private readonly clientVersion: string;
  private readonly nickname: string;
  private readonly socketFactory: (url: string) => SocketLike;
  private readonly random: () => number;
  private readonly schedule: (callback: () => void, delayMs: number) => number;
  private readonly clearSchedule: (handle: number) => void;
  private readonly onState: (state: ConnectionState) => void;
  private readonly onJoin: (position: Vec2) => void;
  private readonly onSnapshot: (snapshot: WorldSnapshotPayload) => void;
  private generation = 0;
  private currentSocket: SocketLike | null = null;
  private joinedPlayerId: number | null = null;
  private lastAcceptedSnapshotTick: number | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private lastAuthError: string | null = null;
  private disposed = false;

  constructor(options: ServerConnectionOptions) {
    this.url = options.url;
    this.clientVersion = options.clientVersion;
    this.nickname = options.nickname;
    this.socketFactory =
      options.socketFactory ??
      ((url) => new WebSocket(url) as unknown as SocketLike);
    this.random = options.random ?? Math.random;
    this.schedule =
      options.schedule ??
      ((callback, delayMs) => globalThis.setTimeout(callback, delayMs) as unknown as number);
    this.clearSchedule =
      options.clearSchedule ?? ((handle) => globalThis.clearTimeout(handle));
    this.onState = options.onState;
    this.onJoin = options.onJoin;
    this.onSnapshot = options.onSnapshot;
  }

  connect(): void {
    this.disposed = false;
    this.reconnectAttempt = 0;
    this.lastAuthError = null;
    this.clearReconnectTimer();
    this.publish({ kind: 'connecting' });
    this.openSocket();
  }

  sendMove(point: Vec2): void {
    if (!this.canSendJoinedIntent()) return;
    this.currentSocket?.send(encodeClientMessage(moveToGroundMessage(point)));
  }

  sendToggleTransformation(): void {
    if (!this.canSendJoinedIntent()) return;
    this.currentSocket?.send(encodeClientMessage(toggleTransformationMessage()));
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
    this.clearReconnectTimer();
    const socket = this.currentSocket;
    this.currentSocket = null;
    this.joinedPlayerId = null;
    socket?.close();
  }

  private openSocket(): void {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.joinedPlayerId = null;
    this.lastAcceptedSnapshotTick = null;

    let socket: SocketLike;
    try {
      socket = this.socketFactory(this.url);
    } catch {
      this.currentSocket = null;
      this.publish({
        kind: 'failed',
        message: '서버 주소가 올바르지 않습니다. 로컬 이동으로 전환하지 않았습니다.',
      });
      return;
    }
    this.currentSocket = socket;

    const isCurrent = () =>
      !this.disposed && this.generation === generation && this.currentSocket === socket;

    socket.onopen = () => {
      if (!isCurrent()) return;
      this.publish({ kind: 'joining' });
      socket.send(encodeClientMessage(clientInfoMessage(this.clientVersion)));
      socket.send(encodeClientMessage(joinGuestMessage(this.nickname)));
    };

    socket.onmessage = (event) => {
      if (!isCurrent()) return;
      if (typeof event.data !== 'string') {
        console.warn('ignoring non-text WebSocket message');
        return;
      }
      const message = parseServerMessage(event.data);
      if (!message) {
        console.warn('ignoring malformed server message');
        return;
      }
      if ('JoinAccepted' in message) {
        const accepted = message.JoinAccepted;
        this.joinedPlayerId = accepted.player_id;
        this.lastAcceptedSnapshotTick = null;
        this.onJoin({ ...accepted.position });
        this.publish({
          kind: 'connected',
          playerId: accepted.player_id,
          nickname: accepted.nickname,
        });
        return;
      }
      if ('WorldSnapshot' in message) {
        const snapshot = message.WorldSnapshot;
        if (this.joinedPlayerId !== snapshot.player.id) {
          console.warn('ignoring snapshot for an unjoined player');
          return;
        }
        if (
          this.lastAcceptedSnapshotTick !== null &&
          snapshot.tick <= this.lastAcceptedSnapshotTick
        ) {
          console.warn('ignoring stale server snapshot');
          return;
        }
        this.lastAcceptedSnapshotTick = snapshot.tick;
        this.onSnapshot(snapshot);
        return;
      }
      this.lastAuthError = message.AuthError.message;
    };

    socket.onclose = (event) => {
      if (!isCurrent()) return;
      this.currentSocket = null;
      this.joinedPlayerId = null;
      if (event.code === CLOSE_CODE_PROTOCOL_MISMATCH) {
        this.publish({
          kind: 'protocol_mismatch',
          message:
            this.lastAuthError ?? '프로토콜 버전이 맞지 않습니다. 다시 불러오세요.',
        });
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.publish({
        kind: 'failed',
        message: '서버에 연결하지 못했습니다. 로컬 이동으로 전환하지 않았습니다.',
      });
      return;
    }
    const attempt = ++this.reconnectAttempt;
    const delayMs = reconnectDelayMs(attempt, this.random);
    this.publish({
      kind: 'reconnecting',
      attempt,
      delayMs,
      message: '서버 연결을 다시 시도하고 있습니다.',
    });
    this.reconnectTimer = this.schedule(() => {
      this.reconnectTimer = null;
      this.publish({ kind: 'connecting' });
      this.openSocket();
    }, delayMs);
  }

  private canSendJoinedIntent(): boolean {
    return (
      this.currentSocket !== null &&
      this.currentSocket.readyState === OPEN_READY_STATE &&
      this.joinedPlayerId !== null
    );
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) return;
    this.clearSchedule(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private publish(state: ConnectionState): void {
    this.state = state;
    this.onState(state);
  }
}
