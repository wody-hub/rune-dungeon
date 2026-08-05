# M5.2 Server-Authoritative Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make the MVP fire transformation server-authoritative while preserving the complete M1-M4 local POC when no server URL is present.

**Architecture:** M5.2 upgrades the M5.1 JSON wire contract from v1 to v2. The Rust server owns a fixed MVP transform loadout and embeds the confirmed state in every player snapshot. The client sends a parameterless toggle intent, accepts only newer snapshots for its joined player, and projects that state to the existing temporary aura and weapon light. Combat, crafting, inventory, GLB, WASM, and MessagePack remain out of scope.

**Tech Stack:** Rust 2021, Tokio, tokio-tungstenite, serde/serde_json, Svelte 5, TypeScript, Vite 8, Vitest 4.

## Global Constraints

- M5.1 must be complete and its Rust and client test suites must pass first.
- Set PROTOCOL_VERSION to 2. Existing ClientInfo, JoinAsGuest, JoinAccepted, AuthError, close 4001, retry, and no-local-fallback rules remain unchanged.
- The server creates and owns one fixed loadout: in_fire_001 plus letter_gyeol_hwa_001. The client never sends an In ID, tier, element, model key, or material key.
- An accepted ToggleTransformation changes NORMAL <-> TRANSFORMED, increments revision, and is displayed only after a newer WorldSnapshot arrives.
- With a server URL, movement and the transform button are the only enabled gameplay inputs. Monster combat, M3 collection/crafting/equipping, and M4 gate entry remain disabled.
- With no server URL, every existing M1-M4 local input and transform behavior remains unchanged.
- client/src/game remains free of browser, WebSocket, Svelte, Three.js, and Threlte references.
- Do not stage .gitignore, .DS_Store, .superpowers, target, or client/dist.

## File Structure

| Path | Responsibility |
| --- | --- |
| shared/src/lib.rs | Re-export v2 protocol types and constants. |
| shared/src/protocol.rs | Toggle intent, combat mode, transformation snapshot, fixture round trips. |
| shared/fixtures/protocol-v2.json | One golden JSON fixture read by Cargo and Vitest. |
| server/src/world/mod.rs | Owns fixed transform prerequisites, state mutation, snapshot projection. |
| server/src/session/mod.rs | Forwards the joined-session toggle intent to WorldState. |
| client/src/net/protocol.ts | Exact v2 TypeScript mirror and runtime guards. |
| client/src/net/connection.ts | Sends toggles and forwards only valid increasing snapshots. |
| client/src/game/sim/world.ts | Applies a confirmed snapshot to position and M3 temporary transform state. |
| client/src/scene/GameScene.svelte | Routes only the transform M3 action to the server. |
| client/src/ui/Hud.svelte, client/src/ui/M3ProgressPanel.svelte | Enable the transform action only in server authority mode. |
| client/src/ui/ConnectionNotice.svelte | Explains the movement-and-transform authority boundary. |
| client/README.md, progress.md | M5.2 run instructions and handoff. |

## Protocol v2 Contract

~~~text
transform button -> Intent(ToggleTransformation) -> server-owned loadout check
-> combat_mode and revision -> WorldSnapshot -> temporary aura, weapon light, HUD
~~~

~~~json
{"ClientInfo":{"protocol_version":2,"client_kind":"web","client_version":"0.0.0"}}
{"JoinAsGuest":{"nickname":"모험가"}}
{"Intent":{"MoveToGround":{"point":{"x":6.0,"z":-2.0}}}}
{"Intent":"ToggleTransformation"}
{"JoinAccepted":{"player_id":1,"nickname":"모험가","position":{"x":0.0,"z":0.0}}}
{"WorldSnapshot":{"tick":1,"player":{"id":1,"position":{"x":0.0,"z":0.0},"target":null,"transformation":{"in_id":"in_fire_001","combat_mode":"NORMAL","revision":0}}}}
{"WorldSnapshot":{"tick":2,"player":{"id":1,"position":{"x":0.0,"z":0.0},"target":null,"transformation":{"in_id":"in_fire_001","combat_mode":"TRANSFORMED","revision":1}}}}
~~~

The client derives tier, element, and later GLB selection from verified content. It does not trust a visual key transmitted by the server or a value created locally.

### Task 1: Upgrade the shared contract and fixture to protocol v2

**Files:**

- Modify: shared/src/lib.rs
- Modify: shared/src/protocol.rs
- Create: shared/fixtures/protocol-v2.json
- Test: shared/src/protocol.rs

**Interfaces:**

- Produces: PROTOCOL_VERSION = 2, GameIntent::ToggleTransformation, CombatMode, TransformationSnapshot, and PlayerSnapshot.transformation.
- Consumed by: server world/session and client protocol parser.

- [ ] **Step 1: Write failing protocol tests**

Create protocol-v2.json with the seven literal frames above. Update the fixture test to decode and re-encode client_info, join_as_guest, move_to_ground, toggle_transformation, join_accepted, snapshot_normal, and snapshot_transformed.

Add exact enum assertions:

~~~rust
assert_eq!(PROTOCOL_VERSION, 2);
assert_eq!(
    serde_json::to_value(GameIntent::ToggleTransformation).unwrap(),
    serde_json::json!("ToggleTransformation"),
);
assert_eq!(
    serde_json::to_value(CombatMode::Transformed).unwrap(),
    serde_json::json!("TRANSFORMED"),
);
~~~

- [ ] **Step 2: Run the RED test**

Run: cargo test -p rune-dungeon-shared protocol::

Expected: FAIL because protocol v1 has no transformation intent or snapshot state.

- [ ] **Step 3: Implement the shared types**

Use these public definitions in shared/src/protocol.rs and re-export them from shared/src/lib.rs:

~~~rust
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum GameIntent {
    MoveToGround { point: Vec2 },
    ToggleTransformation,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CombatMode {
    Normal,
    Transformed,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TransformationSnapshot {
    pub in_id: String,
    pub combat_mode: CombatMode,
    pub revision: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlayerSnapshot {
    pub id: u64,
    pub position: Vec2,
    pub target: Option<Vec2>,
    pub transformation: TransformationSnapshot,
}
~~~

Do not add compatibility parsing, custom serialization, or MessagePack.

- [ ] **Step 4: Run the GREEN test and commit**

Run: cargo test -p rune-dungeon-shared protocol::

Expected: PASS. The fixture round trips and enum labels are exactly NORMAL and TRANSFORMED.

~~~bash
git add shared/src/lib.rs shared/src/protocol.rs shared/fixtures/protocol-v2.json
git commit -m "feat: add authoritative transformation protocol"
~~~

### Task 2: Make transformation an in-memory server responsibility

**Files:**

- Modify: server/src/world/mod.rs
- Modify: server/src/session/mod.rs
- Test: server/src/world/mod.rs
- Test: server/src/session/mod.rs

**Interfaces:**

- Consumes: Task 1 GameIntent, CombatMode, TransformationSnapshot.
- Produces: server-owned transform state in PlayerState and snapshots with monotonic revision.
- Consumed by: M5.1 200ms snapshot sender and Task 3.

- [ ] **Step 1: Write failing server tests**

Test that a joined player begins as NORMAL/revision 0, one ToggleTransformation produces TRANSFORMED/revision 1 on the next snapshot, and a second toggle produces NORMAL/revision 2. In a module-local test, clear current_gyeol_id and assert a toggle returns false without changing mode or revision.

~~~rust
#[test]
fn toggle_requires_server_owned_transform_prerequisites() {
    let mut world = WorldState::default();
    let player = world.join_guest("모험가".to_owned());
    world.players.get_mut(&player.id).unwrap().current_gyeol_id = None;

    assert!(!world.apply_intent(player.id, &GameIntent::ToggleTransformation));
    let snapshot = world.snapshot_for(player.id).unwrap();
    assert_eq!(snapshot.transformation.combat_mode, CombatMode::Normal);
    assert_eq!(snapshot.transformation.revision, 0);
}
~~~

- [ ] **Step 2: Run the RED test**

Run: cargo test -p rune-dungeon-server world::

Expected: FAIL because PlayerState has no transform state.

- [ ] **Step 3: Implement server-owned loadout and snapshot projection**

Extend M5.1 PlayerState:

~~~rust
const MVP_FIRE_IN_ID: &str = "in_fire_001";
const MVP_FIRE_GYEOL_ID: &str = "letter_gyeol_hwa_001";

pub struct PlayerState {
    pub id: u64,
    pub nickname: String,
    pub position: Vec2,
    pub target: Option<Vec2>,
    in_id: String,
    current_gyeol_id: Option<String>,
    combat_mode: CombatMode,
    transformation_revision: u64,
}
~~~

join_guest initializes in_id to MVP_FIRE_IN_ID, current_gyeol_id to Some(MVP_FIRE_GYEOL_ID.to_owned()), combat_mode to CombatMode::Normal, and transformation_revision to 0.

Extend apply_intent exactly as follows:

~~~rust
GameIntent::ToggleTransformation => {
    if player.in_id != MVP_FIRE_IN_ID
        || player.current_gyeol_id.as_deref() != Some(MVP_FIRE_GYEOL_ID)
    {
        return false;
    }
    player.combat_mode = match player.combat_mode {
        CombatMode::Normal => CombatMode::Transformed,
        CombatMode::Transformed => CombatMode::Normal,
    };
    player.transformation_revision += 1;
}
~~~

Every PlayerSnapshot includes:

~~~rust
transformation: TransformationSnapshot {
    in_id: player.in_id.clone(),
    combat_mode: player.combat_mode,
    revision: player.transformation_revision,
},
~~~

Keep M5.1 session frame policy. A valid joined Intent continues to call WorldState::apply_intent; malformed joined frames remain logged and ignored. Add a loopback test that sends the literal toggle frame and receives a transformed WorldSnapshot. No application-error message is needed because the fixed normal start loadout is valid; inventory migration owns future player-facing rejection copy.

- [ ] **Step 4: Run the GREEN test and commit**

Run: cargo test -p rune-dungeon-server

Expected: PASS. Valid toggles are server-owned, invalid internal prerequisites are non-mutating, and movement tests remain unchanged.

~~~bash
git add server/src/world/mod.rs server/src/session/mod.rs
git commit -m "feat: make MVP transformation server authoritative"
~~~

### Task 3: Mirror v2 safely and project only confirmed snapshots into the pure world

**Files:**

- Modify: client/src/net/protocol.ts
- Modify: client/src/net/connection.ts
- Modify: client/src/net/__tests__/protocol.test.ts
- Modify: client/src/net/__tests__/connection.test.ts
- Modify: client/src/game/sim/world.ts
- Modify: client/src/game/sim/__tests__/world.test.ts

**Interfaces:**

- Produces: toggleTransformationMessage, ServerConnection.sendToggleTransformation, applyAuthoritativePlayerSnapshot.
- Consumed by: GameScene in Task 4.

- [ ] **Step 1: Write failing client tests**

Load shared/fixtures/protocol-v2.json directly. Assert both snapshots parse and the encoded toggle equals fixture.toggle_transformation. Assert parseServerMessage returns null for an unknown combat_mode, non-string in_id, negative or fractional revision, or a snapshot without transformation.

Create an authoritative M4 world and apply snapshot_transformed. Assert world.m3.transformed is true, world.m3.transformationSequence is 1, and position updates. Through the connection harness assert pre-join, wrong-player, and older-tick snapshots cannot change transform state; after a fresh JoinAccepted, tick 1 from the new socket is accepted.

- [ ] **Step 2: Run the RED test**

Run: cd client && npx vitest run src/net/__tests__/protocol.test.ts src/net/__tests__/connection.test.ts src/game/sim/__tests__/world.test.ts

Expected: FAIL because v1 does not parse or project transformation.

- [ ] **Step 3: Implement parsing, send, and projection**

Use these types in client/src/net/protocol.ts:

~~~ts
export const PROTOCOL_VERSION = 2;
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
export const toggleTransformationMessage = (): ClientMessage => ({
  Intent: 'ToggleTransformation',
});
~~~

Require finite coordinates, non-negative integer tick/id/revision, non-empty in_id, and exactly NORMAL or TRANSFORMED in parseServerMessage.

Add sendToggleTransformation to ServerConnection. It sends encodeClientMessage(toggleTransformationMessage()) only for the current open joined socket. Reuse the existing increasing-tick snapshot filter; do not introduce a transform-specific ordering path.

In client/src/game/sim/world.ts, preserve M5.1 interpolation and add:

~~~ts
export function applyAuthoritativePlayerSnapshot(
  world: WorldState,
  snapshot: PlayerSnapshot,
): void {
  applyAuthoritativePlayerPosition(world, snapshot.position);
  if (snapshot.transformation.in_id !== M3_IDS.fireIn) return;

  const transformed = snapshot.transformation.combat_mode === 'TRANSFORMED';
  world.m3.transformed = transformed;
  world.m3.transformationSequence = snapshot.transformation.revision;
  world.m3.statusMessage = transformed
    ? '서버가 화 변신을 확정했습니다.'
    : '서버가 변신 해제를 확정했습니다.';
}
~~~

Keep the authority-mode early tick return. In server mode, queued local toggle_m3_transformation intents remain discarded.

- [ ] **Step 4: Run the GREEN test and commit**

Run: cd client && npx vitest run src/net/__tests__/protocol.test.ts src/net/__tests__/connection.test.ts src/game/sim/__tests__/world.test.ts && npm run check

Expected: PASS. Malformed state is harmless, only a newer joined-player snapshot changes the temporary transform, and local mode remains unchanged.

~~~bash
git add client/src/net/protocol.ts client/src/net/connection.ts client/src/net/__tests__/protocol.test.ts client/src/net/__tests__/connection.test.ts client/src/game/sim/world.ts client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: project authoritative transformation snapshots"
~~~

### Task 4: Route the one allowed server-mode M3 action and update UI scope

**Files:**

- Modify: client/src/scene/GameScene.svelte
- Modify: client/src/ui/Hud.svelte
- Modify: client/src/ui/M3ProgressPanel.svelte
- Modify: client/src/ui/ConnectionNotice.svelte
- Modify: client/src/scene/__tests__/server-authority-contract.test.ts
- Modify: client/src/ui/__tests__/connection-notice-contract.test.ts

**Interfaces:**

- Consumes: Task 3 sendToggleTransformation and applyAuthoritativePlayerSnapshot.
- Produces: server mode with movement and transformation enabled, all other local gameplay disabled.

- [ ] **Step 1: Write failing scene and UI tests**

Assert that GameScene calls connection.sendToggleTransformation only for toggle_m3_transformation when serverUrl exists, never enqueues that action locally, and returns without enqueuing every other M3 action. Assert monster gestures, supply-cache collection, and M4 gate entry remain disabled.

Assert M3ProgressPanel uses a native disabled button and enables only its transform action when authorityMode and serverTransformationEnabled are true. Assert ConnectionNotice contains the exact healthy copy: 서버 권위 이동·변신 모드 and 제작·전투·보스 상호작용은 아직 사용할 수 없습니다.

- [ ] **Step 2: Run the RED test**

Run: cd client && npx vitest run src/scene/__tests__/server-authority-contract.test.ts src/ui/__tests__/connection-notice-contract.test.ts

Expected: FAIL because M5.1 disables every M3 action and describes movement-only authority.

- [ ] **Step 3: Implement narrow routing**

In GameScene, use applyAuthoritativePlayerSnapshot for server snapshots and route actions exactly:

~~~ts
export function requestM3Action(action: M3Action): void {
  if (serverUrl) {
    if (action === 'toggle_m3_transformation') {
      connection?.sendToggleTransformation();
    }
    return;
  }
  enqueueIntent(world, { type: action });
}
~~~

Pass authorityMode={serverUrl !== null} and serverTransformationEnabled={serverUrl !== null} through Hud to M3ProgressPanel. Keep all local controls enabled when authorityMode is false. The panel button is:

~~~svelte
disabled={authorityMode && (action !== 'toggle_m3_transformation' || !serverTransformationEnabled)}
~~~

Keep M5.1 input gates for monsters, M3 supply cache, and M4 gate. Update healthy ConnectionNotice copy to:

~~~text
서버 권위 이동·변신 모드
이동과 화 변신은 서버가 확정합니다. 제작·전투·보스 상호작용은 아직 사용할 수 없습니다.
~~~

Preserve the current failure, protocol mismatch, aria-live, contrast, pointer, and reduced-motion behavior.

- [ ] **Step 4: Run the GREEN test and commit**

Run: cd client && npx vitest run src/scene/__tests__/server-authority-contract.test.ts src/ui/__tests__/connection-notice-contract.test.ts && npm run check && npx vitest run

Expected: PASS. Server mode waits for a snapshot before presentation changes and all non-movement/non-transform local gameplay remains disabled.

~~~bash
git add client/src/scene/GameScene.svelte client/src/ui/Hud.svelte client/src/ui/M3ProgressPanel.svelte client/src/ui/ConnectionNotice.svelte client/src/scene/__tests__/server-authority-contract.test.ts client/src/ui/__tests__/connection-notice-contract.test.ts
git commit -m "feat: route transformation through authority server"
~~~

### Task 5: Run all gates, smoke-test both paths, and record handoff

**Files:**

- Modify: client/README.md
- Modify: progress.md
- Test: Rust workspace, client checks, shared fixture, and manual local/server paths.

- [ ] **Step 1: Update developer documentation**

Document that plain http://localhost:5173 retains the full local M1-M4 POC. Document that http://localhost:5173/?server=ws://127.0.0.1:8080 makes movement and fire transformation server-authoritative, while crafting, combat, monsters, and boss progression remain disabled. State that connection loss never falls back to local transformation.

In progress.md, record protocol v2, fixed server-owned in_fire_001, snapshot combat_mode/revision, and no-server POC preservation. The M5.3 handoff is combat, inventory, and content ownership planning; do not promise WASM or MessagePack until a separate plan justifies them.

- [ ] **Step 2: Run automated gates**

Run from repository root:

~~~bash
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace -- -D warnings
cd client && npm run check
cd client && npx vitest run
cd client && npm run build
cd .. && node scripts/validate-runtime-data.mjs
git diff --check
~~~

Expected: every command exits 0.

Run the purity gate:

~~~bash
if rg -n "from ['\\"](?:svelte|three|@threlte)|import\\(['\\"](?:svelte|three|@threlte)" client/src/game; then exit 1; fi
if rg -n "\\b(window|document|navigator|location|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|HTMLElement|HTMLCanvasElement|fetch|WebSocket)\\b" client/src/game; then exit 1; fi
~~~

Expected: both searches print nothing and exit 0.

- [ ] **Step 3: Perform manual two-path verification**

1. Open http://localhost:5173 without a server and complete the existing local M3 transform path; verify local combat, crafting, and M4 progression work.
2. Start the server and open http://localhost:5173/?server=ws://127.0.0.1:8080; verify the authority notice and disabled crafting/monster/boss controls.
3. Click 화 변신, observe {"Intent":"ToggleTransformation"}, then a later TRANSFORMED/revision 1 snapshot; verify HUD, aura, and weapon light change only after it arrives.
4. Click 변신 해제 and verify NORMAL/revision 2 clears the temporary presentation.
5. Stop the server and click the transform button; verify local state and presentation do not change.
6. Reconnect and verify a new JoinAccepted permits tick 1 and restores the server NORMAL/revision 0 state.

- [ ] **Step 4: Commit documentation only**

~~~bash
git add client/README.md progress.md
git commit -m "docs: record M5.2 authoritative transformation"
git status --short --branch
~~~

Expected: only intentional M5.2 files are committed; existing user changes remain unstaged.

## Plan Self-Review

| Requirement | Coverage |
| --- | --- |
| M5.1 movement scaffold remains a prerequisite | Global Constraints and Task 5 |
| Server owns loadout and transform state | Task 2 |
| v2 guards client/server version mismatch | Task 1 |
| Only valid newer snapshots update temporary visuals | Task 3 |
| Server mode enables only movement and transformation | Task 4 |
| Local M1-M4 POC remains intact | Tasks 3-5 |
| Rust, client, fixture, build, purity, and manual verification | Tasks 1-5 |

M5.2 ends before In swapping, inventory, crafting, combat, drops, GLB integration, persistence, and multiplayer visibility. M5.3 must move those rules one bounded server-owned slice at a time.
