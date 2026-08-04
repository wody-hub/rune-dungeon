# M5.1 Server Authority Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Establish a Rust and WebSocket authority skeleton that assigns a guest player ID and makes ground-click movement server-authoritative while leaving the M1–M4 local POC playable without a server URL.

**Architecture:** A small shared Rust crate owns protocol v1 and the movement formula; a Tokio WebSocket server owns guest sessions, player targets, 5Hz simulation ticks, and per-player snapshots. The Svelte client keeps browser networking in src/net, mirrors the JSON protocol deliberately, and switches only player-position integration to server snapshots when the URL contains a server query parameter.

**Tech Stack:** Rust 2021 workspace, Tokio, tokio-tungstenite, futures-util, serde/serde_json, Svelte 5, TypeScript, Vite 8, Vitest 4.

## Global Constraints

- Retain the M1–M4 local POC exactly when the URL has no server query parameter.
- Bind the server to 127.0.0.1:8080 by default; accept --addr ADDRESS as the only override.
- Use JSON text WebSocket frames and Serde’s externally tagged enum representation. Do not add MessagePack, wasm-pack, axum, REST routes, database storage, account authentication, multiplayer visibility, prediction, or combat migration.
- Keep shared/Cargo.toml crate-type = ["cdylib", "rlib"] although M5.1 builds only the Rust library.
- PROTOCOL_VERSION is 1. ClientInfo is the required first message; exact-version mismatch sends AuthError and closes with code 4001.
- Each session progresses exactly through AwaitingClientInfo, AwaitingGuestJoin, and Joined { player_id }. A repeated or out-of-order application message sends AuthError and closes with code 4001; one socket can create at most one player.
- Keep the ClientInfo and AuthError field shapes frozen. New information belongs in a new message variant.
- The only accepted game intent is MoveToGround. It changes a server target and never teleports the player.
- Tick the server every 200ms (5Hz) with PLAYER_MOVE_SPEED = 6.0, matching client/src/game/sim/world.ts.
- Use Tokio MissedTickBehavior::Skip so a delayed runtime never applies several fixed 200ms movement steps in one burst.
- Per-player snapshots use a bounded mailbox of capacity 1. A full mailbox drops the current snapshot, while JoinAccepted and AuthError retain ordered direct delivery.
- Reader end, writer failure, and outbound-channel end all finish through one idempotent session cleanup that removes the same player from both WorldState and SessionRegistry.
- Keep client/src/game free of Svelte, Three.js, Threlte, browser globals, and WebSocket references.
- A server URL must never quietly fall back to local movement. Connection loss retries with full-jitter exponential backoff (1s base, 30s cap, 10 attempts); code 4001 stops retries and offers a reload action.
- Treat a present but invalid server URL as a failed authority-mode connection, not as an absent URL: show a recoverable error and never enable local movement. Ignore and warn on non-text browser WebSocket messages.
- A successful JoinAccepted begins a new client session: reset the accepted-snapshot tick watermark, apply its server position, and ignore callbacks from an older socket generation.
- With a server URL, M5.1 is a movement-authority demonstration: ground clicks are the only enabled gameplay input. Monster combat, M3 actions, and M4 gate entry are disabled with an explanatory notice; the no-server M1–M4 POC remains fully playable.
- WebSocket Ping/Pong frames are ignored. Before join, malformed JSON or binary application frames receive AuthError then 4001; after join, malformed/binary application frames are logged and ignored without changing world state; Close/EOF ends normally.
- Do not modify or stage the already user-modified root .gitignore. Do not stage generated target/, client/dist/, .DS_Store, or .superpowers artifacts.
- Use Node.js 22.12.0 or newer for client commands and the installed Rust toolchain for Cargo commands.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| Cargo.toml | Root workspace with only shared and server members. |
| Cargo.lock | Reproducible versions for the new Rust workspace. |
| shared/Cargo.toml | Shared crate manifest and future-compatible cdylib/rlib declaration. |
| shared/src/lib.rs | Stable re-exports plus protocol-version and close-code constants. |
| shared/src/protocol.rs | Serde JSON protocol v1 types and fixture round-trip tests. |
| shared/src/world.rs | Vec2, PLAYER_MOVE_SPEED, deterministic step_toward, and movement tests. |
| shared/fixtures/protocol-v1.json | Golden JSON frames loaded by both Cargo and Vitest. |
| server/Cargo.toml | Tokio WebSocket server manifest. |
| server/src/main.rs | Address parsing, TCP accept loop, skip-on-delay 200ms tick task, and session registry. |
| server/src/world/mod.rs | In-memory player ownership, target application, movement tick, snapshots. |
| server/src/session/mod.rs | Three-phase protocol validation, bounded outbound mailbox, WebSocket read/write loop, terminal cleanup, and loopback integration tests. |
| client/src/net/protocol.ts | Intentional TypeScript mirror, JSON encode/decode guards, shared-fixture parser. |
| client/src/net/connection.ts | Browser-only generation-safe WebSocket lifecycle, join-boundary snapshots, retry policy, invalid-URL/non-text-frame handling, and state notifications. |
| client/src/net/__tests__/protocol.test.ts | Golden fixture and malformed-frame coverage. |
| client/src/net/__tests__/connection.test.ts | Handshake order, join-boundary snapshot filtering, invalid-URL/non-text-frame handling, 4001 refusal, and deterministic backoff coverage. |
| client/src/game/sim/world.ts | Optional player-movement authority mode, pure snapshot-position application, 200ms render interpolation state, and authority-mode guards for all non-ground position paths. |
| client/src/game/sim/__tests__/world.test.ts | Local movement preservation and authoritative-mode regression tests. |
| client/src/scene/PlayerLayer.svelte | Draws the interpolated authoritative position while retaining current combat effects. |
| client/src/scene/IsoCamera.svelte | Follows that same rendered position so the player remains visually centered. |
| client/src/scene/GameScene.svelte | Owns the optional connection, routes ground clicks to exactly one authority, and blocks M2–M4 input in the server-authority demonstration. |
| client/src/scene/MonsterLayer.svelte, client/src/scene/MonsterEntity.svelte | Receive the authority-demo input gate and suppress monster selection/auto-attack gestures when it is active. |
| client/src/scene/M3SupplyCache.svelte, client/src/scene/M4BossGate.svelte | Receive the authority-demo input gate and suppress M3 cache collection and M4 gate entry when it is active. |
| client/src/scene/__tests__/server-authority-contract.test.ts | Static scene boundary and no-local-fallback contract. |
| client/src/ui/ConnectionNotice.svelte | Small, accessible connection/reload and server-authority-scope notice outside game logic. |
| client/src/ui/Hud.svelte, client/src/ui/M3ProgressPanel.svelte | Pass the authority-demo gate into the M3 action control and render it as a disabled control. |
| client/src/ui/__tests__/connection-notice-contract.test.ts | State-copy, token, and reduced-motion style contract. |
| client/src/App.svelte | Reads the optional server URL, passes connection state to the HUD shell, owns reload action. |
| client/README.md | Documents M5.1 run commands and the server URL switch. |
| progress.md | Records M5.1 completion and hands off M5.2 combat migration. |

## Protocol v1 Contract

The wire format is fixed by Serde’s default externally tagged enums. These are literal JSON frames, not a TypeScript-only convention:

~~~json
{"ClientInfo":{"protocol_version":1,"client_kind":"web","client_version":"0.0.0"}}
{"JoinAsGuest":{"nickname":"모험가"}}
{"Intent":{"MoveToGround":{"point":{"x":6.0,"z":-2.0}}}}
{"JoinAccepted":{"player_id":1,"nickname":"모험가","position":{"x":0.0,"z":0.0}}}
{"WorldSnapshot":{"tick":1,"player":{"id":1,"position":{"x":1.2,"z":0.0},"target":{"x":6.0,"z":-2.0}}}}
~~~

ClientInfo is followed immediately by JoinAsGuest after a socket opens. ServerMessage::AuthError is sent before every protocol-mismatch close. A normal server snapshot is per recipient: never include another player and never broadcast a world-wide player list.

### Task 1: Create the shared protocol and movement source of truth

**Files:**
- Create: Cargo.toml
- Create: Cargo.lock
- Create: shared/Cargo.toml
- Create: shared/src/lib.rs
- Create: shared/src/protocol.rs
- Create: shared/src/world.rs
- Create: shared/fixtures/protocol-v1.json
- Create: server/Cargo.toml
- Create: server/src/main.rs
- Test: shared/src/protocol.rs
- Test: shared/src/world.rs

**Interfaces:**
- Produces: rune_dungeon_shared::PROTOCOL_VERSION, CLOSE_CODE_PROTOCOL_MISMATCH, Vec2, GameIntent, ClientMessage, ServerMessage, PlayerSnapshot, PLAYER_MOVE_SPEED, and step_toward.
- Consumed by: server/src/world/mod.rs, server/src/session/mod.rs, and client/src/net/protocol.ts.

- [ ] **Step 1: Write the shared RED tests and golden frames**

Create shared/fixtures/protocol-v1.json with these six keys and values:

~~~json
{
  "client_info": {"ClientInfo":{"protocol_version":1,"client_kind":"web","client_version":"0.0.0"}},
  "join_as_guest": {"JoinAsGuest":{"nickname":"모험가"}},
  "move_to_ground": {"Intent":{"MoveToGround":{"point":{"x":6.0,"z":-2.0}}}},
  "join_accepted": {"JoinAccepted":{"player_id":1,"nickname":"모험가","position":{"x":0.0,"z":0.0}}},
  "world_snapshot": {"WorldSnapshot":{"tick":1,"player":{"id":1,"position":{"x":1.2,"z":0.0},"target":{"x":6.0,"z":-2.0}}}},
  "auth_error": {"AuthError":{"message":"Protocol v1 required. Reload this client."}}
}
~~~

Put these exact assertions in the relevant cfg(test) modules before adding the public implementation:

~~~rust
#[test]
fn protocol_fixture_round_trips_without_shape_drift() {
    let fixture: serde_json::Value =
        serde_json::from_str(include_str!("../fixtures/protocol-v1.json")).unwrap();
    for key in ["client_info", "join_as_guest", "move_to_ground"] {
        let message: ClientMessage =
            serde_json::from_value(fixture[key].clone()).unwrap();
        assert_eq!(serde_json::to_value(message).unwrap(), fixture[key]);
    }
    for key in ["join_accepted", "world_snapshot", "auth_error"] {
        let message: ServerMessage =
            serde_json::from_value(fixture[key].clone()).unwrap();
        assert_eq!(serde_json::to_value(message).unwrap(), fixture[key]);
    }
}

#[test]
fn step_toward_handles_normal_arrival_and_zero_distance() {
    assert_eq!(
        step_toward(Vec2 { x: 0.0, z: 0.0 }, Vec2 { x: 10.0, z: 0.0 }, 0.2),
        Vec2 { x: 1.2, z: 0.0 },
    );
    assert_eq!(
        step_toward(Vec2 { x: 5.9, z: 0.0 }, Vec2 { x: 6.0, z: 0.0 }, 0.2),
        Vec2 { x: 6.0, z: 0.0 },
    );
    assert_eq!(
        step_toward(Vec2 { x: 2.0, z: -3.0 }, Vec2 { x: 2.0, z: -3.0 }, 0.2),
        Vec2 { x: 2.0, z: -3.0 },
    );
    assert_eq!(
        step_toward(Vec2 { x: 2.0, z: -3.0 }, Vec2 { x: 9.0, z: 4.0 }, -0.2),
        Vec2 { x: 2.0, z: -3.0 },
    );
}
~~~

- [ ] **Step 2: Run the shared test command to verify it fails**

Run: cargo test -p rune-dungeon-shared

Expected: FAIL because the workspace, crate, protocol types, and movement function do not exist.

- [ ] **Step 3: Add the workspace, manifests, protocol, and movement implementation**

Create the root and crate manifests with no optional product subsystems:

~~~toml
# Cargo.toml
[workspace]
members = ["shared", "server"]
resolver = "2"

# shared/Cargo.toml
[package]
name = "rune-dungeon-shared"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# server/Cargo.toml
[package]
name = "rune-dungeon-server"
version = "0.1.0"
edition = "2021"

[dependencies]
futures-util = "0.3"
rune-dungeon-shared = { path = "../shared" }
serde_json = "1.0"
tokio = { version = "1.0", features = ["macros", "net", "rt-multi-thread", "sync", "time"] }
tokio-tungstenite = { version = "0.26", features = ["connect"] }
~~~

Use these stable shared types. Fields remain snake_case so the fixture is the direct Serde output.

~~~rust
// shared/src/lib.rs
pub mod protocol;
pub mod world;

pub const PROTOCOL_VERSION: u32 = 1;
pub const CLOSE_CODE_PROTOCOL_MISMATCH: u16 = 4001;

pub use protocol::{ClientMessage, GameIntent, PlayerSnapshot, ServerMessage};
pub use world::{step_toward, Vec2, PLAYER_MOVE_SPEED};

// shared/src/protocol.rs
use crate::world::Vec2;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ClientMessage {
    ClientInfo { protocol_version: u32, client_kind: String, client_version: String },
    JoinAsGuest { nickname: String },
    Intent(GameIntent),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum GameIntent {
    MoveToGround { point: Vec2 },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum ServerMessage {
    JoinAccepted { player_id: u64, nickname: String, position: Vec2 },
    AuthError { message: String },
    WorldSnapshot { tick: u64, player: PlayerSnapshot },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlayerSnapshot {
    pub id: u64,
    pub position: Vec2,
    pub target: Option<Vec2>,
}

// shared/src/world.rs
use serde::{Deserialize, Serialize};

pub const PLAYER_MOVE_SPEED: f32 = 6.0;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Vec2 {
    pub x: f32,
    pub z: f32,
}

pub fn step_toward(position: Vec2, target: Vec2, dt_seconds: f32) -> Vec2 {
    let dx = target.x - position.x;
    let dz = target.z - position.z;
    let distance = dx.hypot(dz);
    let step = PLAYER_MOVE_SPEED * dt_seconds.max(0.0);
    if distance == 0.0 || distance <= step {
        return target;
    }
    Vec2 {
        x: position.x + dx / distance * step,
        z: position.z + dz / distance * step,
    }
}
~~~

Create server/src/main.rs with fn main() that emits the exact message Server bootstrap is defined in Task 3. This keeps Cargo target discovery valid before the network loop is introduced.

- [ ] **Step 4: Run the shared test command to verify it passes**

Run: cargo test -p rune-dungeon-shared

Expected: PASS. The fixture decodes and re-encodes without JSON-shape drift; movement advances 1.2 units in 200ms, snaps on arrival, avoids division by zero, and never moves for a negative delta.

- [ ] **Step 5: Commit the shared contract**

~~~bash
git add Cargo.toml Cargo.lock shared server/Cargo.toml server/src/main.rs
git commit -m "feat: add shared server authority protocol"
~~~

### Task 2: Build and test in-memory authoritative world state

**Files:**
- Create: server/src/world/mod.rs
- Modify: server/src/main.rs
- Test: server/src/world/mod.rs

**Interfaces:**
- Consumes: Vec2, GameIntent, PlayerSnapshot, ServerMessage, and step_toward from rune_dungeon_shared.
- Produces: WorldState::join_guest, WorldState::apply_intent, WorldState::tick, WorldState::remove_player, and SERVER_TICK_SECONDS.
- Consumed by: the session module and main tick task in Task 3.

- [ ] **Step 1: Write failing authoritative-world tests**

Put these tests in server/src/world/mod.rs:

~~~rust
#[test]
fn guest_ids_are_unique_and_start_at_the_origin() {
    let mut world = WorldState::default();
    let first = world.join_guest("모험가".to_owned());
    let second = world.join_guest("모험가".to_owned());
    assert_eq!(first.id, 1);
    assert_eq!(second.id, 2);
    assert_eq!(first.position, Vec2 { x: 0.0, z: 0.0 });
    assert_eq!(second.position, Vec2 { x: 0.0, z: 0.0 });
}

#[test]
fn movement_intent_sets_a_target_then_tick_owns_the_position() {
    let mut world = WorldState::default();
    let player = world.join_guest("모험가".to_owned());
    assert!(world.apply_intent(
        player.id,
        &GameIntent::MoveToGround { point: Vec2 { x: 6.0, z: 0.0 } },
    ));
    assert_eq!(world.player(player.id).unwrap().position, Vec2 { x: 0.0, z: 0.0 });

    let snapshots = world.tick(SERVER_TICK_SECONDS);
    assert_eq!(snapshots, vec![(
        player.id,
        ServerMessage::WorldSnapshot {
            tick: 1,
            player: PlayerSnapshot {
                id: player.id,
                position: Vec2 { x: 1.2, z: 0.0 },
                target: Some(Vec2 { x: 6.0, z: 0.0 }),
            },
        },
    )]);
}

#[test]
fn arrival_clears_the_target_and_removed_players_stop_receiving_snapshots() {
    let mut world = WorldState::default();
    let player = world.join_guest("모험가".to_owned());
    world.apply_intent(
        player.id,
        &GameIntent::MoveToGround { point: Vec2 { x: 0.1, z: 0.0 } },
    );
    world.tick(SERVER_TICK_SECONDS);
    assert_eq!(world.player(player.id).unwrap().target, None);
    world.remove_player(player.id);
    assert!(world.tick(SERVER_TICK_SECONDS).is_empty());
}
~~~

- [ ] **Step 2: Run the server test command to verify it fails**

Run: cargo test -p rune-dungeon-server world::

Expected: FAIL because server::world and WorldState do not exist.

- [ ] **Step 3: Implement deterministic state ownership**

Implement the world using a BTreeMap so snapshot order is stable in unit tests. The client never writes position; it can only request a target through apply_intent.

~~~rust
// server/src/world/mod.rs
use std::collections::BTreeMap;
use rune_dungeon_shared::{
    step_toward, GameIntent, PlayerSnapshot, ServerMessage, Vec2,
};

pub const SERVER_TICK_SECONDS: f32 = 0.2;

#[derive(Clone, Debug, PartialEq)]
pub struct PlayerState {
    pub id: u64,
    pub nickname: String,
    pub position: Vec2,
    pub target: Option<Vec2>,
}

#[derive(Debug, Default)]
pub struct WorldState {
    next_player_id: u64,
    tick: u64,
    players: BTreeMap<u64, PlayerState>,
}

impl WorldState {
    pub fn join_guest(&mut self, nickname: String) -> PlayerSnapshot {
        self.next_player_id += 1;
        let player = PlayerState {
            id: self.next_player_id,
            nickname,
            position: Vec2 { x: 0.0, z: 0.0 },
            target: None,
        };
        let snapshot = snapshot(&player);
        self.players.insert(player.id, player);
        snapshot
    }

    pub fn player(&self, player_id: u64) -> Option<&PlayerState> {
        self.players.get(&player_id)
    }

    pub fn remove_player(&mut self, player_id: u64) {
        self.players.remove(&player_id);
    }

    pub fn apply_intent(&mut self, player_id: u64, intent: &GameIntent) -> bool {
        let Some(player) = self.players.get_mut(&player_id) else {
            return false;
        };
        match intent {
            GameIntent::MoveToGround { point } => player.target = Some(*point),
        }
        true
    }

    pub fn tick(&mut self, dt_seconds: f32) -> Vec<(u64, ServerMessage)> {
        self.tick += 1;
        self.players
            .values_mut()
            .map(|player| {
                if let Some(target) = player.target {
                    player.position = step_toward(player.position, target, dt_seconds);
                    if player.position == target {
                        player.target = None;
                    }
                }
                (player.id, ServerMessage::WorldSnapshot {
                    tick: self.tick,
                    player: snapshot(player),
                })
            })
            .collect()
    }
}

fn snapshot(player: &PlayerState) -> PlayerSnapshot {
    PlayerSnapshot {
        id: player.id,
        position: player.position,
        target: player.target,
    }
}
~~~

Export mod world from server/src/main.rs temporarily so these in-file tests compile; Task 3 replaces the bootstrap main with the real accept loop.

- [ ] **Step 4: Run the server world tests to verify they pass**

Run: cargo test -p rune-dungeon-server world::

Expected: PASS. IDs are monotonic, an intent leaves position unchanged until the tick, each tick emits only that player’s snapshot, and arrival clears target.

- [ ] **Step 5: Commit authoritative movement ownership**

~~~bash
git add server/src/main.rs server/src/world/mod.rs
git commit -m "feat: add authoritative player movement world"
~~~

### Task 3: Add WebSocket handshake, sessions, and the 5Hz server loop

**Files:**
- Create: server/src/session/mod.rs
- Modify: server/src/main.rs
- Modify: server/src/world/mod.rs
- Test: server/src/session/mod.rs
- Test: server/src/main.rs

**Interfaces:**
- Consumes: shared protocol types and WorldState from Task 2.
- Produces: decide_message, run_session, finalize_session, SessionRegistry, and the runnable rune-dungeon-server binary.
- Consumed by: manual M5.1 browser validation and client/src/net/connection.ts.

- [ ] **Step 1: Write RED tests for the immutable session boundary**

Add these pure session tests before opening a socket:

~~~rust
#[test]
fn session_phase_accepts_exactly_one_ordered_join() {
    let client_info = ClientMessage::ClientInfo {
        protocol_version: PROTOCOL_VERSION,
        client_kind: "web".to_owned(),
        client_version: "0.0.0".to_owned(),
    };
    let join = ClientMessage::JoinAsGuest { nickname: "모험가".to_owned() };

    assert_eq!(
        decide_message(&SessionPhase::AwaitingClientInfo, &client_info),
        SessionDecision::AwaitGuestJoin,
    );
    assert_eq!(
        decide_message(&SessionPhase::AwaitingGuestJoin, &join),
        SessionDecision::JoinGuest { nickname: "모험가".to_owned() },
    );
    assert!(matches!(
        decide_message(&SessionPhase::Joined { player_id: 1 }, &join),
        SessionDecision::Refuse { close_code: CLOSE_CODE_PROTOCOL_MISMATCH, .. },
    ));
}

#[test]
fn session_phase_refuses_wrong_version_and_every_out_of_order_message() {
    let wrong_version = ClientMessage::ClientInfo {
        protocol_version: PROTOCOL_VERSION + 1,
        client_kind: "web".to_owned(),
        client_version: "0.0.0".to_owned(),
    };
    let join = ClientMessage::JoinAsGuest { nickname: "모험가".to_owned() };
    let intent = ClientMessage::Intent(GameIntent::MoveToGround {
        point: Vec2 { x: 6.0, z: 0.0 },
    });

    for (phase, message) in [
        (SessionPhase::AwaitingClientInfo, &wrong_version),
        (SessionPhase::AwaitingClientInfo, &join),
        (SessionPhase::AwaitingGuestJoin, &intent),
        (SessionPhase::Joined { player_id: 1 }, &wrong_version),
    ] {
        assert!(matches!(
            decide_message(&phase, message),
            SessionDecision::Refuse { close_code: CLOSE_CODE_PROTOCOL_MISMATCH, .. },
        ));
    }
}
~~~

Also create the RED integration tests named `loopback_refusal_sends_auth_error_before_4001_close`, `loopback_join_receives_its_snapshot_and_disconnect_cleans_up`, `malformed_or_binary_before_join_is_refused`, `ping_before_client_info_does_not_break_join`, and `malformed_or_binary_after_join_is_ignored`. Their complete frames, assertions, and ephemeral-listener helpers are specified later in this task; write those tests now, before the production session loop.

- [ ] **Step 2: Run the focused handshake tests to verify they fail**

Run: cargo test -p rune-dungeon-server session::

Expected: FAIL because the session module, three-phase state machine, and decision result do not exist.

- [ ] **Step 3: Implement a single-owner WebSocket session and server loop**

Keep protocol validation pure and side-effect free. The socket layer serializes a refusal error as text first, then closes with 4001. After a valid ClientInfo, only JoinAsGuest creates a player; only Intent forwards to WorldState::apply_intent.

~~~rust
// server/src/session/mod.rs: pure application-message decision
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SessionPhase {
    AwaitingClientInfo,
    AwaitingGuestJoin,
    Joined { player_id: u64 },
}

#[derive(Clone, Debug, PartialEq)]
pub enum SessionDecision {
    AwaitGuestJoin,
    JoinGuest { nickname: String },
    ApplyIntent { player_id: u64, intent: GameIntent },
    Refuse { error: ServerMessage, close_code: u16 },
}

fn protocol_refusal(message: &str) -> SessionDecision {
    SessionDecision::Refuse {
        error: ServerMessage::AuthError { message: message.to_owned() },
        close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
    }
}

pub fn decide_message(phase: &SessionPhase, message: &ClientMessage) -> SessionDecision {
    match (phase, message) {
        (
            SessionPhase::AwaitingClientInfo,
            ClientMessage::ClientInfo { protocol_version, .. },
        ) if *protocol_version == PROTOCOL_VERSION => SessionDecision::AwaitGuestJoin,
        (SessionPhase::AwaitingClientInfo, ClientMessage::ClientInfo { .. }) => {
            protocol_refusal("Protocol v1 required. Reload this client.")
        }
        (SessionPhase::AwaitingClientInfo, _) => {
            protocol_refusal("Send ClientInfo first. Reload this client.")
        }
        (SessionPhase::AwaitingGuestJoin, ClientMessage::JoinAsGuest { nickname }) => {
            SessionDecision::JoinGuest { nickname: nickname.clone() }
        }
        (SessionPhase::AwaitingGuestJoin, _) => {
            protocol_refusal("Send JoinAsGuest next. Reload this client.")
        }
        (SessionPhase::Joined { player_id }, ClientMessage::Intent(intent)) => {
            SessionDecision::ApplyIntent { player_id: *player_id, intent: intent.clone() }
        }
        (SessionPhase::Joined { .. }, _) => {
            protocol_refusal("Session is already joined. Reload this client.")
        }
    }
}
~~~

In run_session, use tokio_tungstenite::accept_async, futures_util::StreamExt and SinkExt, and one labeled tokio::select loop that owns the split socket writer. Serialize every ServerMessage with serde_json::to_string. Maintain `phase: SessionPhase`, initialized to AwaitingClientInfo, and `player_id: Option<u64>`, initialized to None. Apply these frame rules before calling decide_message:

~~~rust
match inbound_frame {
    Some(Ok(Message::Ping(_))) | Some(Ok(Message::Pong(_))) => continue,
    Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break 'session,
    Some(Ok(Message::Text(text))) => match serde_json::from_str::<ClientMessage>(&text) {
        Ok(message) => message,
        Err(_error) if !matches!(phase, SessionPhase::Joined { .. }) => {
            let _ = refuse(&mut writer, ServerMessage::AuthError {
                message: "Send ClientInfo first. Reload this client.".to_owned(),
            }, CLOSE_CODE_PROTOCOL_MISMATCH).await;
            break 'session;
        }
        Err(error) => {
            eprintln!("ignoring malformed joined-session text frame: {error}");
            continue;
        }
    },
    Some(Ok(Message::Binary(_))) if !matches!(phase, SessionPhase::Joined { .. }) => {
        let _ = refuse(&mut writer, ServerMessage::AuthError {
            message: "Send ClientInfo first. Reload this client.".to_owned(),
        }, CLOSE_CODE_PROTOCOL_MISMATCH).await;
        break 'session;
    }
    Some(Ok(Message::Binary(_))) => {
        eprintln!("ignoring binary frame after join");
        continue;
    }
    Some(Ok(_)) => continue,
};
~~~

When decide_message returns AwaitGuestJoin, set phase to AwaitingGuestJoin. When it returns Refuse, call `let _ = refuse(...).await;` and break the labeled loop; never use `?` inside a terminal branch. Only JoinGuest creates a player and advances to `Joined { player_id }`; only ApplyIntent calls `WorldState::apply_intent`.

Create `let (outbound_tx, mut outbound_rx) = mpsc::channel::<ServerMessage>(1);` before entering the select loop. On a valid JoinGuest, queue JoinAccepted before inserting the mailbox into the registry so the initial response is always first. The select loop's outbound branch is the only normal writer owner:

~~~rust
let player = world.lock().await.join_guest(nickname.clone());
outbound_tx.try_send(ServerMessage::JoinAccepted {
    player_id: player.id,
    nickname,
    position: player.position,
}).expect("a fresh session mailbox has one free slot");
registry.insert(player.id, outbound_tx.clone()).await;
drop(outbound_tx);
player_id = Some(player.id);
phase = SessionPhase::Joined { player_id: player.id };
~~~

The select loop has `message = outbound_rx.recv()` alongside the reader branch. Serialize and write that message there; a writer error or `None` from the outbound receiver breaks the same labeled loop. Dropping the session's original sender after registration means that a registry removal can close the joined-session receiver. `refuse` may write directly only before it returns and terminates that session, so it never races the select-owned writer. Enforce the single cleanup tail mechanically: no reader, writer, serialization, or refusal failure may return from `run_session` after a player has been created.

~~~rust
'session: loop {
    tokio::select! {
        inbound = reader.next() => {
            // Apply the frame policy above. Every terminal arm uses `break 'session`,
            // including `let _ = refuse(&mut writer, error, code).await`.
        }
        outbound = outbound_rx.recv() => match outbound {
            Some(message) => {
                let Ok(text) = serde_json::to_string(&message) else {
                    eprintln!("could not serialize server message");
                    break 'session;
                };
                if writer.send(Message::Text(text.into())).await.is_err() {
                    break 'session;
                }
            }
            None => break 'session,
        },
    }
}
finalize_session(player_id, &world, &registry).await;
Ok(())
~~~

Use this main-loop shape. It deliberately starts the first simulation round after 200ms, not immediately at connection time:

~~~rust
const DEFAULT_ADDR: &str = "127.0.0.1:8080";
const SERVER_TICK: Duration = Duration::from_millis(200);

fn server_interval() -> tokio::time::Interval {
    let mut interval = tokio::time::interval_at(Instant::now() + SERVER_TICK, SERVER_TICK);
    interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
    interval
}

#[test]
fn server_interval_skips_missed_ticks() {
    assert_eq!(
        server_interval().missed_tick_behavior(),
        tokio::time::MissedTickBehavior::Skip,
    );
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = parse_address(std::env::args().skip(1))?;
    let listener = TcpListener::bind(address).await?;
    println!("rune-dungeon server listening on {}", listener.local_addr()?);
    let world = Arc::new(Mutex::new(WorldState::default()));
    let registry = SessionRegistry::default();

    tokio::spawn(run_tick_loop(world.clone(), registry.clone()));
    loop {
        let (stream, _) = listener.accept().await?;
        tokio::spawn(run_session(stream, world.clone(), registry.clone()));
    }
}

async fn run_tick_loop(world: Arc<Mutex<WorldState>>, registry: SessionRegistry) {
    let mut interval = server_interval();
    loop {
        interval.tick().await;
        let snapshots = world.lock().await.tick(SERVER_TICK_SECONDS);
        for (player_id, message) in snapshots {
            registry.send_snapshot(player_id, message).await;
        }
    }
}
~~~

Use this registry so the tick task can send only a player’s own snapshot without giving WorldState a WebSocket dependency:

~~~rust
#[derive(Clone, Default)]
pub struct SessionRegistry {
    senders: Arc<Mutex<BTreeMap<u64, mpsc::Sender<ServerMessage>>>>,
}

impl SessionRegistry {
    pub async fn insert(&self, player_id: u64, sender: mpsc::Sender<ServerMessage>) {
        self.senders.lock().await.insert(player_id, sender);
    }

    pub async fn remove(&self, player_id: u64) {
        self.senders.lock().await.remove(&player_id);
    }

    pub async fn send_snapshot(&self, player_id: u64, message: ServerMessage) {
        let sender = self.senders.lock().await.get(&player_id).cloned();
        let Some(sender) = sender else { return };
        match sender.try_send(message) {
            Ok(()) | Err(mpsc::error::TrySendError::Full(_)) => {}
            Err(mpsc::error::TrySendError::Closed(_)) => {
                self.remove(player_id).await;
            }
        }
    }
}

fn parse_address(mut args: impl Iterator<Item = String>) -> Result<String, String> {
    match (args.next(), args.next(), args.next()) {
        (None, None, None) => Ok(DEFAULT_ADDR.to_owned()),
        (Some(flag), Some(address), None) if flag == "--addr" => Ok(address),
        (Some(flag), None, None) if flag == "--addr" => Err("--addr requires ADDRESS".to_owned()),
        _ => Err("usage: rune-dungeon-server [--addr ADDRESS]".to_owned()),
    }
}
~~~

After the labeled loop ends for reader close, writer error, closed outbound receiver, or protocol refusal, call this function exactly once. `remove` and `remove_player` are idempotent, so repeated transport signals cannot leave a ghost player or make cleanup unsafe:

~~~rust
async fn finalize_session(
    player_id: Option<u64>,
    world: &Arc<Mutex<WorldState>>,
    registry: &SessionRegistry,
) {
    if let Some(player_id) = player_id {
        registry.remove(player_id).await;
        world.lock().await.remove_player(player_id);
    }
}
~~~

Complete the Step 1 RED test module in `server/src/session/mod.rs` with the following mailbox, cleanup, and ephemeral-port loopback cases. The production code above names the helpers these tests exercise; in execution order, put these tests in the file before that production code:

~~~rust
#[tokio::test]
async fn full_snapshot_mailbox_drops_a_new_snapshot_without_growing() {
    let (tx, mut rx) = mpsc::channel(1);
    let registry = SessionRegistry::default();
    let snapshot = |tick| ServerMessage::WorldSnapshot {
        tick,
        player: PlayerSnapshot {
            id: 1,
            position: Vec2 { x: tick as f32, z: 0.0 },
            target: None,
        },
    };
    registry.insert(1, tx).await;
    registry.send_snapshot(1, snapshot(1)).await;
    registry.send_snapshot(1, snapshot(2)).await;
    assert!(matches!(rx.recv().await, Some(ServerMessage::WorldSnapshot { tick: 1, .. })));
}

#[tokio::test]
async fn closed_snapshot_mailbox_is_unregistered() {
    let (tx, rx) = mpsc::channel(1);
    let registry = SessionRegistry::default();
    registry.insert(1, tx).await;
    drop(rx);
    registry.send_snapshot(1, ServerMessage::WorldSnapshot {
        tick: 1,
        player: PlayerSnapshot {
            id: 1,
            position: Vec2 { x: 0.0, z: 0.0 },
            target: None,
        },
    }).await;
    assert!(!registry.senders.lock().await.contains_key(&1));
}

#[tokio::test]
async fn removing_the_last_joined_sender_closes_the_outbound_mailbox() {
    let (tx, mut rx) = mpsc::channel::<ServerMessage>(1);
    let registry = SessionRegistry::default();
    registry.insert(1, tx).await;
    registry.remove(1).await;
    assert!(rx.recv().await.is_none());
}

#[tokio::test]
async fn finalizer_removes_the_same_player_once_from_world_and_registry() {
    let world = Arc::new(Mutex::new(WorldState::default()));
    let player = world.lock().await.join_guest("모험가".to_owned());
    let registry = SessionRegistry::default();
    let (tx, _rx) = mpsc::channel(1);
    registry.insert(player.id, tx).await;
    finalize_session(Some(player.id), &world, &registry).await;
    finalize_session(Some(player.id), &world, &registry).await;
    assert!(world.lock().await.player(player.id).is_none());
    assert!(!registry.senders.lock().await.contains_key(&player.id));
}

#[tokio::test]
async fn loopback_refusal_sends_auth_error_before_4001_close() {
    let (url, _world, _registry, server) = start_one_session().await;
    let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
    client.send(Message::Text(
        serde_json::to_string(&ClientMessage::ClientInfo {
            protocol_version: PROTOCOL_VERSION + 1,
            client_kind: "web".to_owned(),
            client_version: "0.0.0".to_owned(),
        }).unwrap().into(),
    )).await.unwrap();
    assert!(matches!(client.next().await.unwrap().unwrap(), Message::Text(text)
        if matches!(serde_json::from_str(&text), Ok(ServerMessage::AuthError { .. }))));
    assert!(matches!(client.next().await.unwrap().unwrap(), Message::Close(Some(frame))
        if frame.code == CloseCode::Library(CLOSE_CODE_PROTOCOL_MISMATCH)));
    tokio::time::timeout(std::time::Duration::from_secs(1), server)
        .await
        .expect("session should close")
        .expect("session task should not panic")
        .expect("session should not return an error");
}

#[tokio::test]
async fn loopback_join_receives_its_snapshot_and_disconnect_cleans_up() {
    let (url, world, registry, server) = start_one_session().await;
    let (mut client, _) = tokio_tungstenite::connect_async(url).await.unwrap();
    send_client_info_then_join(&mut client).await;
    let player_id = receive_join_accepted(&mut client).await;
    registry.send_snapshot(player_id, ServerMessage::WorldSnapshot {
        tick: 1,
        player: PlayerSnapshot {
            id: player_id,
            position: Vec2 { x: 1.2, z: 0.0 },
            target: None,
        },
    }).await;
    assert!(matches!(receive_server_message(&mut client).await,
        ServerMessage::WorldSnapshot { player: PlayerSnapshot { id, .. }, .. } if id == player_id));
    client.close(None).await.unwrap();
    tokio::time::timeout(std::time::Duration::from_secs(1), server)
        .await
        .expect("session should close")
        .expect("session task should not panic")
        .expect("session should not return an error");
    assert!(world.lock().await.player(player_id).is_none());
}
~~~

Under `cfg(test)`, `start_one_session` must bind `TcpListener` to `127.0.0.1:0`, spawn exactly one `run_session`, and return its `ws://` URL plus cloned world, registry, and JoinHandle. `send_client_info_then_join`, `receive_join_accepted`, and `receive_server_message` are local test helpers that use the same JSON text frames as the fixture. Add focused tests that send a malformed/binary first application frame and assert AuthError then 4001; send Ping before ClientInfo and assert the subsequent normal Join succeeds; and send malformed/binary joined-session frames followed by a valid MoveToGround, asserting the target is the valid move only.

Write protocol closes through this exact ordered helper:

~~~rust
async fn refuse(
    writer: &mut WebSocketWriter,
    error: ServerMessage,
    close_code: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    writer.send(Message::Text(serde_json::to_string(&error)?.into())).await?;
    writer.send(Message::Close(Some(CloseFrame {
        code: CloseCode::Library(close_code),
        reason: "protocol mismatch".into(),
    }))).await
}
~~~

Add pure `parse_address` tests for no arguments, `--addr 127.0.0.1:0`, a missing address, an unknown flag, and an extra argument. `parse_address` accepts no arguments or the exact pair --addr ADDRESS. Return a user-readable Err for unknown flags and a missing address, then let main print it through Result handling. The writer type alias is SplitSink<WebSocketStream<TcpStream>, Message>; import CloseFrame, CloseCode, Message, and tungstenite from tokio_tungstenite::tungstenite.

- [ ] **Step 4: Run all server tests and the binary help-path check**

Run: cargo test -p rune-dungeon-server

Expected: PASS. The server enforces every session phase, v1, malformed-frame policy, bounded snapshot delivery, writer/reader cleanup, and loopback WebSocket frame ordering without a fixed port.

Run: cargo run -p rune-dungeon-server -- --addr 127.0.0.1:0

Expected: The process starts without a parse error and prints its bound listening address. Stop it with Ctrl-C after the smoke check.

- [ ] **Step 5: Commit the runnable authority server**

~~~bash
git add server/src/main.rs server/src/session/mod.rs server/src/world/mod.rs Cargo.lock
git commit -m "feat: add websocket authority server scaffold"
~~~

### Task 4: Mirror protocol v1 in TypeScript and preserve the pure world boundary

**Files:**
- Create: client/src/net/protocol.ts
- Create: client/src/net/__tests__/protocol.test.ts
- Modify: client/src/game/sim/world.ts
- Modify: client/src/game/sim/__tests__/world.test.ts

**Interfaces:**
- Consumes: shared/fixtures/protocol-v1.json and the stable wire contract from Task 1.
- Produces: parseServerMessage, encodeClientMessage, clientInfoMessage, joinGuestMessage, moveToGroundMessage, PlayerMovement, applyAuthoritativePlayerPosition, and getRenderedPlayerPosition.
- Consumed by: client/src/net/connection.ts and client/src/scene/GameScene.svelte.

- [ ] **Step 1: Write failing TypeScript protocol and authority-mode tests**

Use Node file reads in Vitest so the test loads the actual shared fixture rather than a copied client asset:

~~~ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  clientInfoMessage,
  encodeClientMessage,
  parseServerMessage,
  type ServerMessage,
} from '../protocol';

const fixture = JSON.parse(
  readFileSync(new URL('../../../../shared/fixtures/protocol-v1.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

describe('M5.1 protocol mirror', () => {
  it('parses the shared server frames and emits the shared client frames', () => {
    const accepted = parseServerMessage(JSON.stringify(fixture.join_accepted));
    expect(accepted).toEqual(fixture.join_accepted);
    expect(parseServerMessage(JSON.stringify(fixture.world_snapshot))).toEqual(fixture.world_snapshot);
    expect(parseServerMessage(JSON.stringify(fixture.auth_error))).toEqual(fixture.auth_error);
    expect(encodeClientMessage(clientInfoMessage('0.0.0'))).toBe(
      JSON.stringify(fixture.client_info),
    );
    expect(encodeClientMessage(fixture.move_to_ground as never)).toBe(
      JSON.stringify(fixture.move_to_ground),
    );
  });

  it('drops malformed and unknown server frames without throwing', () => {
    expect(parseServerMessage('{not json')).toBeNull();
    expect(parseServerMessage(JSON.stringify({ Unknown: {} }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({ AuthError: { message: 1 } }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({
      WorldSnapshot: { tick: 1.5, player: { id: 1, position: { x: 0, z: 0 }, target: null } },
    }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({
      WorldSnapshot: { tick: 1, player: { id: 1, position: { x: 1e309, z: 0 }, target: null } },
    }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({
      JoinAccepted: { player_id: 1, nickname: '모험가', position: { x: 0, z: 0 }, extra: true },
    }))).toBeNull();
  });
});
~~~

Add these exact world assertions:

~~~ts
it('keeps local movement unchanged by default', () => {
  const world = createWorld();
  enqueueIntent(world, { type: 'move_to_ground', point: { x: 10, z: 0 } });
  tick(world, 0.1);
  expect(world.player.pos.x).toBeCloseTo(PLAYER_SPEED * 0.1);
});

it('authoritative movement consumes the intent but only a snapshot changes position', () => {
  const world = createWorld({ playerMovement: 'authoritative' });
  enqueueIntent(world, { type: 'move_to_ground', point: { x: 10, z: 0 } });
  tick(world, 0.1);
  expect(world.player.pos).toEqual({ x: 0, z: 0 });
  applyAuthoritativePlayerPosition(world, { x: 1.2, z: -0.4 });
  expect(world.player.pos).toEqual({ x: 1.2, z: -0.4 });
  expect(getRenderedPlayerPosition(world)).toEqual({ x: 0, z: 0 });
  tick(world, 0.1);
  expect(getRenderedPlayerPosition(world)).toEqual({ x: 0.6, z: -0.2 });
  tick(world, 0.1);
  expect(getRenderedPlayerPosition(world)).toEqual({ x: 1.2, z: -0.4 });
});

it('authoritative mode refuses every M2–M4 input and freezes local gameplay simulation', () => {
  const world = createWorld({ scenario: 'm4', playerMovement: 'authoritative' });
  const elite = world.monsters.get(M4_ENTITY_IDS.elite)!;
  const originalPosition = { ...world.player.pos };
  const before = {
    playerHp: world.player.hp,
    elite: structuredClone(elite),
    m3: structuredClone(world.m3),
    m4: structuredClone(world.m4),
    inventory: structuredClone(world.inventory),
  };
  enqueueIntent(world, { type: 'enter_m4_boss_room' });
  enqueueIntent(world, { type: 'toggle_auto_attack' });
  enqueueIntent(world, { type: 'toggle_m3_transformation' });
  tick(world, 10);
  expect(world.player.pos).toEqual(originalPosition);
  expect(world.m4?.area).toBe('blackheart_mine');
  expect(world.player.autoAttackEnabled).toBe(false);
  expect(world.m3.transformed).toBe(false);
  expect({
    playerHp: world.player.hp,
    elite,
    m3: world.m3,
    m4: world.m4,
    inventory: world.inventory,
  }).toEqual(before);
});
~~~

- [ ] **Step 2: Run client RED tests**

Run: cd client && npx vitest run src/net/__tests__/protocol.test.ts src/game/sim/__tests__/world.test.ts

Expected: FAIL because src/net/protocol.ts, playerMovement, and applyAuthoritativePlayerPosition do not exist.

- [ ] **Step 3: Implement the narrow protocol mirror and authority switch**

Use the same externally tagged unions as shared/src/protocol.rs. Do not import Rust output, browser APIs, or WebSocket into this file.

~~~ts
// client/src/net/protocol.ts
export const PROTOCOL_VERSION = 1;
export const CLOSE_CODE_PROTOCOL_MISMATCH = 4001;

export interface Vec2 { x: number; z: number }
export type ClientMessage =
  | { ClientInfo: { protocol_version: number; client_kind: string; client_version: string } }
  | { JoinAsGuest: { nickname: string } }
  | { Intent: { MoveToGround: { point: Vec2 } } };
export type ServerMessage =
  | { JoinAccepted: { player_id: number; nickname: string; position: Vec2 } }
  | { AuthError: { message: string } }
  | { WorldSnapshot: { tick: number; player: { id: number; position: Vec2; target: Vec2 | null } } };

export const clientInfoMessage = (clientVersion: string): ClientMessage => ({
  ClientInfo: { protocol_version: PROTOCOL_VERSION, client_kind: 'web', client_version: clientVersion },
});
export const joinGuestMessage = (nickname: string): ClientMessage => ({ JoinAsGuest: { nickname } });
export const moveToGroundMessage = (point: Vec2): ClientMessage => ({
  Intent: { MoveToGround: { point: { ...point } } },
});
export const encodeClientMessage = (message: ClientMessage): string => JSON.stringify(message);
~~~

Finish parseServerMessage with explicit runtime guards for each single-key variant, finite numeric x/z coordinates, integer non-negative tick and player ID, string nickname/message, and target either null or a valid Vec2. Return null on every other shape.

In client/src/game/sim/world.ts add:

~~~ts
export type PlayerMovement = 'local' | 'authoritative';

export interface WorldOptions {
  random?: RandomSource;
  respawnMs?: number;
  scenario?: WorldScenario;
  playerMovement?: PlayerMovement;
}

export interface WorldState {
  playerMovement: PlayerMovement;
  content: RuntimeCombatContent;
  scenario: WorldScenario;
}

export function applyAuthoritativePlayerPosition(w: WorldState, position: Vec2): void {
  w.player.pos = { ...position };
  w.player.moveTarget = null;
  if (!w.player.autoAttackEnabled) w.player.mode = 'idle';
}
~~~

Add this render-only state to WorldState. It is separate from player.pos so monster AI and combat decisions read the most recent server-confirmed position while the scene can smoothly render the 5Hz update:

~~~ts
interface AuthoritativeRenderState {
  position: Vec2;
  start: Vec2;
  target: Vec2;
  elapsedSeconds: number;
}

export function getRenderedPlayerPosition(w: WorldState): Vec2 {
  return w.playerMovement === 'authoritative'
    ? w.authoritativeRender.position
    : w.player.pos;
}
~~~

Initialize authoritativeRender from the completed player start position after the skirmish or M4 scenario placement. When applyAuthoritativePlayerPosition receives a new snapshot, preserve the current render position as start, clone the new server position into target, and reset elapsedSeconds to 0. At the first line of every positive tick, call tickAuthoritativeRenderPosition when playerMovement is authoritative:

~~~ts
function tickAuthoritativeRenderPosition(w: WorldState, dt: number): void {
  const render = w.authoritativeRender;
  render.elapsedSeconds = Math.min(0.2, render.elapsedSeconds + dt);
  const t = render.elapsedSeconds / 0.2;
  render.position = {
    x: render.start.x + (render.target.x - render.start.x) * t,
    z: render.start.z + (render.target.z - render.start.z) * t,
  };
}
~~~

Initialize playerMovement to options.playerMovement ?? 'local'. At the start of `drainIntents`, retain the existing local behavior unchanged. When `w.playerMovement === 'authoritative'`, discard every queued intent instead of applying it, including MoveToGround, select_target, toggle_auto_attack, every M3 action, and enter_m4_boss_room. This guards the simulation boundary as well as the scene boundary: `w.player.pos = { ...M4_SPAWNS.bossPlayer }` must remain reachable only in local mode.

Make the authoritative-mode branch a complete local-simulation stop, not only a player-motion stop. Its only effects are discarding queued local intents and advancing the render interpolation; it must run before boss state, respawn, player combat, monster AI, and monster attack processing:

~~~ts
export function tick(w: WorldState, dt: number): void {
  if (dt <= 0) return;
  if (w.playerMovement === 'authoritative') {
    drainIntents(w);
    tickAuthoritativeRenderPosition(w, dt);
    return;
  }

  drainIntents(w);
  // Preserve the existing local-only boss, respawn, player, AI, and attack loops below.
}
~~~

This leaves server-confirmed player position updates exclusively to `applyAuthoritativePlayerPosition` and prevents disabled M2–M4 controls from being undermined by background local combat. Monster AI, monster counterattack, M3 state, and M4 state are frozen in authority mode; their full behavior remains unchanged in local mode.

Modify PlayerLayer.svelte and IsoCamera.svelte to import getRenderedPlayerPosition and use its result at their existing group.position.set and camera follow sites. No Svelte component or scene file writes player.pos. This makes the player and camera move together over 200ms between snapshots; local mode returns world.player.pos and preserves the existing direct rendering path.

- [ ] **Step 4: Run focused client tests to verify they pass**

Run: cd client && npx vitest run src/net/__tests__/protocol.test.ts src/game/sim/__tests__/world.test.ts

Expected: PASS. Both languages load the same fixture, malformed inbound data is harmless, local movement retains 6 m/s, parser validation rejects malformed variant fields, and authoritative mode changes logical position only through the pure application function while rendering reaches it over 200ms.

- [ ] **Step 5: Commit the protocol mirror and pure-world adapter**

~~~bash
git add client/src/net/protocol.ts client/src/net/__tests__/protocol.test.ts client/src/game/sim/world.ts client/src/game/sim/__tests__/world.test.ts client/src/scene/PlayerLayer.svelte client/src/scene/IsoCamera.svelte
git commit -m "feat: add client authority protocol adapter"
~~~

### Task 5: Connect the browser scene without a silent local fallback

**Files:**
- Create: client/src/net/connection.ts
- Create: client/src/net/__tests__/connection.test.ts
- Create: client/src/ui/ConnectionNotice.svelte
- Create: client/src/ui/__tests__/connection-notice-contract.test.ts
- Modify: client/src/scene/GameScene.svelte
- Modify: client/src/scene/MonsterLayer.svelte
- Modify: client/src/scene/MonsterEntity.svelte
- Modify: client/src/scene/M3SupplyCache.svelte
- Modify: client/src/scene/M4BossGate.svelte
- Create: client/src/scene/__tests__/server-authority-contract.test.ts
- Modify: client/src/App.svelte
- Modify: client/src/ui/Hud.svelte
- Modify: client/src/ui/M3ProgressPanel.svelte

**Interfaces:**
- Consumes: protocol helpers from Task 4, applyAuthoritativePlayerPosition, and the existing GameScene HUD callback.
- Produces: generation-safe ServerConnection with onJoin/onSnapshot callbacks, ConnectionState, optional GameScene serverUrl/onConnectionStateChange props, authority-demo input gates, and ConnectionNotice.
- Consumed by: M5.1 manual browser validation.

- [ ] **Step 1: Write failing connection and scene-boundary tests**

Make the connection test inject a socket factory, random source, and scheduler. It must verify the actual initial send order and refusal behavior:

~~~ts
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
  const connection = createTestConnection(socket, scheduled);
  connection.connect();
  socket.open();
  socket.close(4001);
  expect(connection.state).toMatchObject({ kind: 'protocol_mismatch' });
  expect(scheduled).toEqual([]);
});

it('ignores pre-join and wrong-player snapshots, then forwards only increasing joined-player ticks', () => {
  const received: number[] = [];
  const joinedPositions: Array<{ x: number; z: number }> = [];
  const socket = new FakeSocket();
  const connection = createTestConnection(
    socket,
    [],
    (snapshot) => received.push(snapshot.tick),
    (position) => joinedPositions.push(position),
  );
  connection.connect();
  socket.open();
  socket.message(snapshotFrame(1, 2));
  socket.message(joinAcceptedFrame(1, { x: 0, z: 0 }));
  socket.message(snapshotFrame(1, 2));
  socket.message(snapshotFrame(1, 1));
  socket.message(snapshotFrame(2, 3));
  expect(received).toEqual([2]);
  expect(joinedPositions).toEqual([{ x: 0, z: 0 }]);
});

it('uses full jitter under the 1s-to-30s exponential cap and stops after ten retries', () => {
    expect(reconnectDelayMs(1, () => 0.5)).toBe(500);
    expect(reconnectDelayMs(6, () => 1)).toBe(30_000);
    expect(reconnectDelayMs(10, () => 1)).toBe(30_000);
});

it('accepts tick 1 after a new JoinAccepted and ignores the old socket', () => {
  const scheduler = new FakeScheduler();
  const first = new FakeSocket();
  const second = new FakeSocket();
  const connection = createTestConnection([first, second], scheduler);
  connection.connect();
  first.open();
  first.message(joinAcceptedFrame(1, { x: 0, z: 0 }));
  first.message(snapshotFrame(1, 20));
  first.close(1006);
  scheduler.runNext();
  second.open();
  second.message(joinAcceptedFrame(2, { x: 0, z: 0 }));
  second.message(snapshotFrame(2, 1));
  first.message(snapshotFrame(1, 21));
  expect(connection.acceptedTicks).toEqual([20, 1]);
  expect(connection.state).toMatchObject({ kind: 'connected', playerId: 2 });
});

it('creates exactly ten reconnect sockets, then fails without another timer', () => {
  const scheduler = new FakeScheduler();
  const sockets = Array.from({ length: 11 }, () => new FakeSocket());
  const connection = createTestConnection(sockets, scheduler);
  connection.connect();
  for (const socket of sockets) {
    socket.open();
    socket.close(1006);
    scheduler.runNextIfPresent();
  }
  expect(connection.state).toMatchObject({ kind: 'failed' });
  expect(scheduler.pendingCount).toBe(0);
  expect(connection.socketFactoryCalls).toBe(11);
});

it('dispose cancels a pending reconnect without creating another socket', () => {
  const scheduler = new FakeScheduler();
  const socket = new FakeSocket();
  const connection = createTestConnection([socket], scheduler);
  connection.connect();
  socket.open();
  socket.close(1006);
  connection.dispose();
  scheduler.runAll();
  expect(connection.socketFactoryCalls).toBe(1);
  expect(scheduler.pendingCount).toBe(0);
});

it('keeps authority mode failed when socket creation throws for an invalid server URL', () => {
  const scheduled: number[] = [];
  const connection = new ServerConnection({
    url: 'not-a-websocket-url',
    clientVersion: '0.0.0',
    nickname: '모험가',
    socketFactory: () => { throw new SyntaxError('Invalid URL'); },
    random: () => 0.5,
    schedule: () => { scheduled.push(1); return 1; },
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
  const received: number[] = [];
  const socket = new FakeSocket();
  const connection = createTestConnection(socket, [], (snapshot) => received.push(snapshot.tick));
  connection.connect();
  socket.open();
  socket.message(new ArrayBuffer(1));
  expect(received).toEqual([]);
});
~~~

`FakeScheduler` stores scheduled callbacks by numeric handle, exposes `runNext`, `runNextIfPresent`, and `runAll`, and removes each callback before invoking it. `createTestConnection` accepts a socket array and scheduler, records `acceptedTicks` through onSnapshot, forwards its optional fourth `onJoin` callback, and exposes the factory-call count. `FakeSocket.message` accepts `unknown` so non-text `MessageEvent.data` is exercised. `snapshotFrame(playerId, tick)` and `joinAcceptedFrame(playerId, position)` serialize the actual externally tagged JSON frames.

Add raw-source contract checks that GameScene creates the world in authoritative mode only when serverUrl exists, calls connection.sendMove for ground clicks, applies the initial position on JoinAccepted and subsequent positions only from accepted WorldSnapshot frames, and contains no local enqueue fallback in that server branch. Also assert that the authority-demo gate reaches MonsterEntity, M3SupplyCache, M4BossGate, and M3ProgressPanel; their handlers must refuse input and the M3 button must use a real `disabled` attribute. Test ConnectionNotice for aria-live, the Korean reload copy 다시 불러오기, the authority-demo copy `서버 권위 이동 모드`, the error and info CSS tokens, pointer-events: auto, and a prefers-reduced-motion rule.

- [ ] **Step 2: Run the client connection RED tests**

Run: cd client && npx vitest run src/net/__tests__/connection.test.ts src/scene/__tests__/server-authority-contract.test.ts src/ui/__tests__/connection-notice-contract.test.ts

Expected: FAIL because the browser connection, notice component, and optional scene boundary do not exist.

- [ ] **Step 3: Implement lifecycle, retry policy, scene routing, and accessible notice**

Implement the connection outside client/src/game. Its state union is:

~~~ts
export type ConnectionState =
  | { kind: 'connecting' }
  | { kind: 'joining' }
  | { kind: 'connected'; playerId: number; nickname: string }
  | { kind: 'reconnecting'; attempt: number; delayMs: number; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'protocol_mismatch'; message: string };
~~~

ServerConnection has `onJoin: (position: Vec2) => void` in addition to onState and onSnapshot. It keeps `generation: number`, `currentSocket: Socket | null`, `joinedPlayerId: number | null`, and `lastAcceptedSnapshotTick: number | null`. `connect` increments generation, clears joinedPlayerId, and then creates one WebSocket through the injected SocketFactory inside try/catch. If factory construction throws (for example, an invalid `?server=` value), set `{ kind: 'failed', message: '서버 주소가 올바르지 않습니다. 로컬 이동으로 전환하지 않았습니다.' }`, leave `currentSocket` null, and schedule no retry; `serverUrl` remains non-null so GameScene stays authoritative. Every event handler captures that generation and returns immediately unless it still equals generation and its socket is currentSocket. On open it sends clientInfoMessage(clientVersion) and joinGuestMessage(nickname) in that order. On inbound data, first reject `typeof event.data !== 'string'` with console.warn; only a string proceeds to the JSON parser:

1. Ignore and console.warn malformed frames.
2. On JoinAccepted set joinedPlayerId, reset lastAcceptedSnapshotTick to null, call onJoin with its position, then publish connected with the server-issued ID and nickname. This is the only boundary that admits a lower tick from a restarted server.
3. On WorldSnapshot, first ignore and warn unless joinedPlayerId equals player.id. Otherwise, when lastAcceptedSnapshotTick is null or the tick is greater, save the tick and call onSnapshot with the contained player snapshot. Ignore an older or duplicate tick from the current socket so a delayed frame cannot rewind the client.
4. On AuthError retain its message for a subsequent close state.

On any non-4001 close, schedule min(30000, 1000 * 2 to the power of attempt minus 1) multiplied by random(), incrementing attempts from 1 through 10. After the initial connection and exactly ten reconnect sockets have closed, publish failed with 서버에 연결하지 못했습니다. 로컬 이동으로 전환하지 않았습니다. and schedule nothing. Dispose clears a timer, increments generation, clears currentSocket, marks the connection closed by the caller, and suppresses retries. On 4001, publish protocol_mismatch with the received AuthError message or 프로토콜 버전이 맞지 않습니다. 다시 불러오세요. and schedule nothing.

In GameScene, add these props and setup:

~~~ts
let {
  onHudChange,
  serverUrl = null,
  onConnectionStateChange,
}: {
  onHudChange: (snapshot: HudSnapshot) => void;
  serverUrl?: string | null;
  onConnectionStateChange: (state: ConnectionState | null) => void;
} = $props();

const world = createWorld({
  scenario: 'm4',
  playerMovement: serverUrl ? 'authoritative' : 'local',
});
~~~

Create ServerConnection only inside onMount when serverUrl is non-null. Use client version 0.0.0 and guest nickname 모험가. Its onJoin and snapshot callbacks both call applyAuthoritativePlayerPosition(world, position) followed by publishHud(). Its state callback passes the state to App. In the ground-click callback, call connection.sendMove({ x, z }) when serverUrl exists; otherwise retain the existing enqueueIntent local branch.

Set `const authorityDemo = serverUrl !== null`. In GameScene, `requestM3Action` and `handleMonsterGesture` must return immediately when authorityDemo, and the M4 gate callback must likewise return before enqueueing enter_m4_boss_room. Pass `inputEnabled={!authorityDemo}` to MonsterLayer, M3SupplyCache, and M4BossGate. Thread that prop to MonsterEntity, whose click and double-click handlers return before `onGesture` when false. In M3SupplyCache and M4BossGate, click handlers also return before their callbacks when false. This blocks input in the scene and protects against future callers; the WorldState authoritative intent guard from Task 4 is the final defense.

In App.svelte compute the same authorityDemo from serverUrl. Pass it to Hud and ConnectionNotice. Add `authorityDemo = false` to Hud's props and pass `disabled={authorityDemo}` to M3ProgressPanel. Add `disabled = false` to M3ProgressPanel's props and render the M3 action as `<button type="button" disabled={disabled} onclick={() => onAction(action)}>` so keyboard and pointer input are both disabled. This preserves every existing local-mode handler and visual treatment.

Create ConnectionNotice.svelte as a status-only overlay with `authorityDemo = false`. Render it for authorityDemo, reconnecting, failed, and protocol_mismatch states; the normal local POC therefore has no new visual element. When authorityDemo is true and the connection is not failed/refused, show `서버 권위 이동 모드` and `전투·M3·M4 상호작용은 로컬 POC에서만 사용할 수 있습니다.` as an info notice. Use an assertive aria-live region for failed/refused states, Crystal Glow plus --rd-info for informational states, --rd-danger plus a textual 상태 label for failures, and a real button only for protocol mismatch:

~~~svelte
{#if state?.kind === 'protocol_mismatch'}
  <aside class="connection-notice failure" aria-live="assertive">
    <strong>서버 연결 거부</strong>
    <span>{state.message}</span>
    <button type="button" onclick={onReload}>다시 불러오기</button>
  </aside>
{/if}
~~~

Place the desktop notice at the top right. At 720px or below, place it below the player panel; its visibility only during an unusable connection means error guidance takes priority over temporarily obscured combat HUD. Give it pointer-events: auto, theme typography/spacing/radius variables, and disable transition/animation in prefers-reduced-motion.

In App.svelte, read new URLSearchParams(window.location.search).get('server') once. Pass it as serverUrl, retain debugHud behavior, store ConnectionState | null, render ConnectionNotice outside Canvas, and pass onReload={() => window.location.reload()}. A missing parameter supplies null, authorityDemo false, and leaves both the connection and notice absent.

- [ ] **Step 4: Run client integration and static UI tests**

Run: cd client && npx vitest run src/net/__tests__/connection.test.ts src/scene/__tests__/server-authority-contract.test.ts src/ui/__tests__/connection-notice-contract.test.ts

Expected: PASS. The first two frames are ordered; pre-join, wrong-player, stale, and old-socket snapshots cannot mutate state; a new join immediately applies its spawn and accepts tick 1; an invalid URL remains visibly failed without a retry or local fallback; non-text and malformed frames are non-fatal; exactly ten reconnect sockets are attempted; dispose cancels a pending retry; 4001 never retries; and a server URL cannot enqueue local ground movement.

Run: cd client && npm run check

Expected: PASS with no Svelte or TypeScript diagnostics.

- [ ] **Step 5: Commit the browser authority integration**

~~~bash
git add client/src/net/connection.ts client/src/net/__tests__/connection.test.ts client/src/scene/GameScene.svelte client/src/scene/MonsterLayer.svelte client/src/scene/MonsterEntity.svelte client/src/scene/M3SupplyCache.svelte client/src/scene/M4BossGate.svelte client/src/scene/__tests__/server-authority-contract.test.ts client/src/ui/ConnectionNotice.svelte client/src/ui/Hud.svelte client/src/ui/M3ProgressPanel.svelte client/src/ui/__tests__/connection-notice-contract.test.ts client/src/App.svelte
git commit -m "feat: connect authoritative movement snapshots"
~~~

### Task 6: Run all gates, perform the two-path smoke test, and record the handoff

**Files:**
- Modify: client/README.md
- Modify: progress.md
- Test: all Rust and client test suites

**Interfaces:**
- Consumes: the completed server, shared contract, client adapter, and UI from Tasks 1–5.
- Produces: a documented M5.1 handoff with reproducible local and server-authority launch paths.
- Consumed by: M5.2 combat-rule migration planning.

- [ ] **Step 1: Write the documentation assertions and completion text**

Add an M5.1 row to the client README milestone table with the status completed. Add an execution section that contains both commands:

~~~bash
# terminal A, repository root
cargo run -p rune-dungeon-server -- --addr 127.0.0.1:8080

# terminal B
cd client
npm run dev
~~~

Document that normal http://localhost:5173 retains the full M1–M4 local simulation and http://localhost:5173/?server=ws://127.0.0.1:8080 makes only player ground movement authoritative. State explicitly that the server URL path is an M5.1 movement demonstration: combat, M3 actions, and M4 gate entry are disabled and remain available in the no-server POC. State explicitly that an unavailable server is visibly reported and does not revert to local movement.

In progress.md, replace the next implementation sentence with a dated M5.1 completion note listing protocol v1, guest IDs, 5Hz target movement, authoritative snapshots, and the no-server local POC preservation. The next handoff is M5.2: migrate a selected combat rule into shared Rust plus WASM/MessagePack only when that scope is designed.

- [ ] **Step 2: Run static and automated gates**

Run from the repository root:

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

Expected: every command exits 0. Cargo tests include the shared fixture, server handshake/world behavior, and Rust movement formula. Vitest includes the same fixture plus the unchanged M1–M4 suite.

Run the purity gate from the repository root:

~~~bash
if rg -n "from ['\\"](?:svelte|three|@threlte)|import\\(['\\"](?:svelte|three|@threlte)" client/src/game; then exit 1; fi
if rg -n "\\b(window|document|navigator|location|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|HTMLElement|HTMLCanvasElement|fetch|WebSocket)\\b" client/src/game; then exit 1; fi
~~~

Expected: both searches print nothing and exit 0.

- [ ] **Step 3: Perform the manual two-path verification**

1. Start only the client and open http://localhost:5173. Click the ground, then verify M4 player movement, monsters, M3/M4 HUD, and local gameplay remain unchanged.
2. Start the server at 127.0.0.1:8080 and open http://localhost:5173/?server=ws://127.0.0.1:8080. Verify the `서버 권위 이동 모드` notice explains that combat, M3, and M4 interactions are disabled. Ground-click once and verify Network shows a JoinAccepted before WorldSnapshot frames, each 200ms server snapshot advances the logical position by 1.2 units, and the player plus camera interpolate smoothly over each 200ms interval. Monster clicks, M3 controls, and an unlocked M4 gate must not alter local world state.
3. Stop the server while the server URL remains open. Verify reconnect copy appears and the player does not move after additional ground clicks.
4. Restart the server. Verify reconnect succeeds within ten attempts, JoinAccepted resets the player to the newly joined origin immediately, and the first tick-1 WorldSnapshot resumes movement without waiting for the previous server's tick count.
5. Temporarily set the TypeScript protocol constant to 2 without committing it, reload the server URL, and verify AuthError copy plus a 다시 불러오기 button appear; verify no retry timer is scheduled. Restore the constant to 1 before proceeding.
6. Open http://localhost:5173/?server=not-a-websocket-url. Verify a visible connection failure states that local movement was not enabled, the authority-demo interaction restrictions remain active, and no retry timer starts.

- [ ] **Step 4: Commit only M5.1 documentation**

~~~bash
git add client/README.md progress.md
git commit -m "docs: record M5.1 server authority scaffold"
git status --short --branch
~~~

Expected: the status output may still list the user’s pre-existing .gitignore, .DS_Store, and .superpowers changes, but no generated build output or unrelated file is staged by this task.

## Plan Self-Review

| Design requirement | Plan coverage |
| --- | --- |
| Root shared/server workspace, cdylib plus rlib, no empty future directories | Task 1 |
| JSON protocol, v1 exact match, first-message rule, frozen error shape, 4001 | Tasks 1 and 3 |
| One-player session lifecycle, malformed-frame policy, ordered refusal frame then close | Task 3 pure and loopback session tests |
| Guest ID, origin spawn, target-only movement, 200ms snapshots, client interpolation | Tasks 2, 3, and 4 |
| Per-player rather than broadcast snapshot | Tasks 2 and 3 |
| Slow receiver memory bound, writer/reader cleanup, and skipped delayed ticks | Task 3 bounded mailbox, finalizer, and server interval |
| Shared deterministic movement and cross-language golden fixture | Tasks 1 and 4 |
| game/ browser-free authority adapter | Task 4 plus Task 6 purity gate |
| URL-gated authority mode preserving no-server POC | Tasks 4 and 5 |
| Server URL movement-only boundary and disabled M2–M4 controls | Tasks 4 and 5 |
| 1s/30s/10 retry policy, join-boundary tick reset, old-socket isolation, invalid-server failure, and refusal reload | Task 5 |
| Required automated gates and manual local/server/error flows | Task 6 |
| M5.2 boundaries remain outside the milestone | Global Constraints and Task 6 handoff |

The plan contains no unspecified implementation step, conflicting protocol name, or unresolved file ownership. After WorldState initialization, authoritative-mode player-position writes are confined to JoinAccepted/WorldSnapshot application, the connected ground-click path never invokes local enqueue, and every M2–M4 input route is blocked both in the scene and the pure world.
