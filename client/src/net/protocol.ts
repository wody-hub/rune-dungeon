export const PROTOCOL_VERSION = 2;
export const CLOSE_CODE_PROTOCOL_MISMATCH = 4001;

export interface Vec2 {
  x: number;
  z: number;
}

export type ClientMessage =
  | {
      ClientInfo: {
        protocol_version: number;
        client_kind: string;
        client_version: string;
      };
    }
  | { JoinAsGuest: { nickname: string } }
  | { Intent: { MoveToGround: { point: Vec2 } } }
  | { Intent: 'ToggleTransformation' };

export type CombatMode = 'NORMAL' | 'TRANSFORMED';

export interface TransformationSnapshot {
  in_id: string;
  combat_mode: CombatMode;
  revision: number;
}

export interface PlayerSnapshot {
  id: number;
  position: Vec2;
  target: Vec2 | null;
  transformation: TransformationSnapshot;
}

export type ServerMessage =
  | { JoinAccepted: { player_id: number; nickname: string; position: Vec2 } }
  | { AuthError: { message: string } }
  | { WorldSnapshot: { tick: number; player: PlayerSnapshot } };

export const clientInfoMessage = (clientVersion: string): ClientMessage => ({
  ClientInfo: {
    protocol_version: PROTOCOL_VERSION,
    client_kind: 'web',
    client_version: clientVersion,
  },
});

export const joinGuestMessage = (nickname: string): ClientMessage => ({
  JoinAsGuest: { nickname },
});

export const moveToGroundMessage = (point: Vec2): ClientMessage => ({
  Intent: { MoveToGround: { point: { ...point } } },
});

export const toggleTransformationMessage = (): ClientMessage => ({
  Intent: 'ToggleTransformation',
});

export const encodeClientMessage = (message: ClientMessage): string => JSON.stringify(message);

export function parseServerMessage(text: string): ServerMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || Object.keys(value).length !== 1) return null;

  if ('JoinAccepted' in value) {
    const accepted = value.JoinAccepted;
    if (
      !hasExactKeys(accepted, ['player_id', 'nickname', 'position']) ||
      !isNonNegativeInteger(accepted.player_id) ||
      typeof accepted.nickname !== 'string' ||
      !isVec2(accepted.position)
    ) {
      return null;
    }
    return value as ServerMessage;
  }

  if ('AuthError' in value) {
    const error = value.AuthError;
    if (!hasExactKeys(error, ['message']) || typeof error.message !== 'string') return null;
    return value as ServerMessage;
  }

  if ('WorldSnapshot' in value) {
    const snapshot = value.WorldSnapshot;
    if (
      !hasExactKeys(snapshot, ['tick', 'player']) ||
      !isNonNegativeInteger(snapshot.tick) ||
      !hasExactKeys(snapshot.player, ['id', 'position', 'target', 'transformation']) ||
      !isNonNegativeInteger(snapshot.player.id) ||
      !isVec2(snapshot.player.position) ||
      !(snapshot.player.target === null || isVec2(snapshot.player.target)) ||
      !isTransformationSnapshot(snapshot.player.transformation)
    ) {
      return null;
    }
    return value as ServerMessage;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys<T extends string>(
  value: unknown,
  keys: readonly T[],
): value is Record<T, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isVec2(value: unknown): value is Vec2 {
  return (
    hasExactKeys(value, ['x', 'z']) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.z === 'number' &&
    Number.isFinite(value.z)
  );
}

function isTransformationSnapshot(value: unknown): value is TransformationSnapshot {
  return (
    hasExactKeys(value, ['in_id', 'combat_mode', 'revision']) &&
    typeof value.in_id === 'string' &&
    value.in_id.length > 0 &&
    (value.combat_mode === 'NORMAL' || value.combat_mode === 'TRANSFORMED') &&
    isNonNegativeInteger(value.revision)
  );
}
