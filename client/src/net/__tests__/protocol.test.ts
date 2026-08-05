/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  clientInfoMessage,
  encodeClientMessage,
  parseServerMessage,
  toggleTransformationMessage,
} from '../protocol';

const fixture = JSON.parse(
  readFileSync(new URL('../../../../shared/fixtures/protocol-v2.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

describe('M5.1 protocol mirror', () => {
  it('parses the shared server frames and emits the shared client frames', () => {
    const accepted = parseServerMessage(JSON.stringify(fixture.join_accepted));
    expect(accepted).toEqual(fixture.join_accepted);
    expect(parseServerMessage(JSON.stringify(fixture.snapshot_normal))).toEqual(
      fixture.snapshot_normal,
    );
    expect(parseServerMessage(JSON.stringify(fixture.snapshot_transformed))).toEqual(
      fixture.snapshot_transformed,
    );
    expect(encodeClientMessage(clientInfoMessage('0.0.0'))).toBe(
      JSON.stringify(fixture.client_info),
    );
    expect(encodeClientMessage(fixture.move_to_ground as never)).toBe(
      JSON.stringify(fixture.move_to_ground),
    );
    expect(encodeClientMessage(toggleTransformationMessage())).toBe(
      JSON.stringify(fixture.toggle_transformation),
    );
  });

  it('drops malformed and unknown server frames without throwing', () => {
    expect(parseServerMessage('{not json')).toBeNull();
    expect(parseServerMessage(JSON.stringify({ Unknown: {} }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({ AuthError: { message: 1 } }))).toBeNull();
    expect(
      parseServerMessage(
        JSON.stringify({
          WorldSnapshot: {
            tick: 1.5,
            player: {
              id: 1,
              position: { x: 0, z: 0 },
              target: null,
              transformation: { in_id: 'in_fire_001', combat_mode: 'NORMAL', revision: 0 },
            },
          },
        }),
      ),
    ).toBeNull();
    expect(
      parseServerMessage(
        JSON.stringify({
          WorldSnapshot: {
            tick: 1,
            player: {
              id: 1,
              position: { x: 1e309, z: 0 },
              target: null,
              transformation: { in_id: 'in_fire_001', combat_mode: 'NORMAL', revision: 0 },
            },
          },
        }),
      ),
    ).toBeNull();
    expect(
      parseServerMessage(
        JSON.stringify({
          JoinAccepted: {
            player_id: 1,
            nickname: '모험가',
            position: { x: 0, z: 0 },
            extra: true,
          },
        }),
      ),
    ).toBeNull();
  });

  it('rejects malformed or missing transformation state', () => {
    const snapshot = (transformation?: unknown) =>
      JSON.stringify({
        WorldSnapshot: {
          tick: 1,
          player: {
            id: 1,
            position: { x: 0, z: 0 },
            target: null,
            ...(transformation === undefined ? {} : { transformation }),
          },
        },
      });
    expect(
      parseServerMessage(
        snapshot({ in_id: 'in_fire_001', combat_mode: 'UNKNOWN', revision: 0 }),
      ),
    ).toBeNull();
    expect(
      parseServerMessage(snapshot({ in_id: 1, combat_mode: 'NORMAL', revision: 0 })),
    ).toBeNull();
    expect(
      parseServerMessage(snapshot({ in_id: 'in_fire_001', combat_mode: 'NORMAL', revision: -1 })),
    ).toBeNull();
    expect(
      parseServerMessage(snapshot({ in_id: 'in_fire_001', combat_mode: 'NORMAL', revision: 1.5 })),
    ).toBeNull();
    expect(parseServerMessage(snapshot())).toBeNull();
  });
});
