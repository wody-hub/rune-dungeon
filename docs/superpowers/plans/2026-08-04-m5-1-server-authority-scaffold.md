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
- Keep the ClientInfo and AuthError field shapes frozen. New information belongs in a new message variant.
- The only accepted game intent is MoveToGround. It changes a server target and never teleports the player.
- Tick the server every 200ms (5Hz) with PLAYER_MOVE_SPEED = 6.0, matching client/src/game/sim/world.ts.
- Keep client/src/game free of Svelte, Three.js, Threlte, browser globals, and WebSocket references.
- A server URL must never quietly fall back to local movement. Connection loss retries with full-jitter exponential backoff (1s base, 30s cap, 10 attempts); code 4001 stops retries and offers a reload action.
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
| server/src/main.rs | Address parsing, TCP accept loop, 200ms tick task, and session registry. |
| server/src/world/mod.rs | In-memory player ownership, target application, movement tick, snapshots. |
| server/src/session/mod.rs | First-message validation, guest join lifecycle, WebSocket read/write loop. |
| client/src/net/protocol.ts | Intentional TypeScript mirror, JSON encode/decode guards, shared-fixture parser. |
| client/src/net/connection.ts | Browser-only WebSocket lifecycle, snapshots, retry policy, and state notifications. |
| client/src/net/__tests__/protocol.test.ts | Golden fixture and malformed-frame coverage. |
| client/src/net/__tests__/connection.test.ts | Handshake order, 4001 refusal, and deterministic backoff coverage. |
| client/src/game/sim/world.ts | Optional player-movement authority mode, pure snapshot-position application, and 200ms render interpolation state. |
| client/src/game/sim/__tests__/world.test.ts | Local movement preservation and authoritative-mode regression tests. |
| client/src/scene/PlayerLayer.svelte | Draws the interpolated authoritative position while retaining current combat effects. |
| client/src/scene/IsoCamera.svelte | Follows that same rendered position so the player remains visually centered. |
| client/src/scene/GameScene.svelte | Owns the optional connection and routes ground clicks to exactly one authority. |
| client/src/scene/__tests__/server-authority-contract.test.ts | Static scene boundary and no-local-fallback contract. |
| client/src/ui/ConnectionNotice.svelte | Small, accessible connection/reload notice outside game logic. |
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
tokio-tungstenite = "0.26"
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

Expected: PASS. The fixture decodes and re-encodes without JSON-shape drift; movement advances 1.2 units in 200ms, snaps on arrival, and avoids division by zero.

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

**Interfaces:**
- Consumes: shared protocol types and WorldState from Task 2.
- Produces: validate_handshake, run_session, SessionRegistry, and the runnable rune-dungeon-server binary.
- Consumed by: manual M5.1 browser validation and client/src/net/connection.ts.

- [ ] **Step 1: Write RED tests for the immutable handshake boundary**

Add these pure session tests before opening a socket:

~~~rust
#[test]
fn rejects_every_non_client_info_first_message_with_the_frozen_error_shape() {
    let result = validate_handshake(
        HandshakeState::AwaitingClientInfo,
        &ClientMessage::JoinAsGuest { nickname: "모험가".to_owned() },
    );
    assert_eq!(result, HandshakeDecision::Refuse {
        error: ServerMessage::AuthError {
            message: "Send ClientInfo first. Reload this client.".to_owned(),
        },
        close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
    });
}

#[test]
fn rejects_a_wrong_protocol_version_and_accepts_exactly_v1() {
    let wrong = validate_handshake(
        HandshakeState::AwaitingClientInfo,
        &ClientMessage::ClientInfo {
            protocol_version: 2,
            client_kind: "web".to_owned(),
            client_version: "0.0.0".to_owned(),
        },
    );
    assert!(matches!(wrong, HandshakeDecision::Refuse { close_code: 4001, .. }));

    let accepted = validate_handshake(
        HandshakeState::AwaitingClientInfo,
        &ClientMessage::ClientInfo {
            protocol_version: PROTOCOL_VERSION,
            client_kind: "web".to_owned(),
            client_version: "0.0.0".to_owned(),
        },
    );
    assert_eq!(accepted, HandshakeDecision::Advance);
}
~~~

- [ ] **Step 2: Run the focused handshake tests to verify they fail**

Run: cargo test -p rune-dungeon-server session::

Expected: FAIL because the session module, state machine, and validation result do not exist.

- [ ] **Step 3: Implement a single-owner WebSocket session and server loop**

Keep protocol validation pure and side-effect free. The socket layer serializes a refusal error as text first, then closes with 4001. After a valid ClientInfo, only JoinAsGuest creates a player; only Intent forwards to WorldState::apply_intent.

~~~rust
// server/src/session/mod.rs: handshake decision
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum HandshakeState {
    AwaitingClientInfo,
    Ready,
}

#[derive(Clone, Debug, PartialEq)]
pub enum HandshakeDecision {
    Advance,
    Refuse { error: ServerMessage, close_code: u16 },
}

pub fn validate_handshake(
    state: HandshakeState,
    message: &ClientMessage,
) -> HandshakeDecision {
    if state == HandshakeState::Ready {
        return HandshakeDecision::Advance;
    }
    match message {
        ClientMessage::ClientInfo { protocol_version, .. }
            if *protocol_version == PROTOCOL_VERSION => HandshakeDecision::Advance,
        ClientMessage::ClientInfo { .. } => HandshakeDecision::Refuse {
            error: ServerMessage::AuthError {
                message: "Protocol v1 required. Reload this client.".to_owned(),
            },
            close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
        },
        _ => HandshakeDecision::Refuse {
            error: ServerMessage::AuthError {
                message: "Send ClientInfo first. Reload this client.".to_owned(),
            },
            close_code: CLOSE_CODE_PROTOCOL_MISMATCH,
        },
    }
}
~~~

In run_session, use tokio_tungstenite::accept_async, futures_util::StreamExt and SinkExt, and a tokio::select loop that owns the split socket writer. Serialize every ServerMessage with serde_json::to_string. On a malformed inbound text frame, write a warning and continue; on a malformed or missing first message, apply validate_handshake and close. On a valid JoinAsGuest:

~~~rust
let player = world.lock().await.join_guest(nickname.clone());
registry.insert(player.id, outbound_tx.clone()).await;
send_message(&mut writer, ServerMessage::JoinAccepted {
    player_id: player.id,
    nickname,
    position: player.position,
}).await?;
player_id = Some(player.id);
~~~

Use this main-loop shape. It deliberately starts the first simulation round after 200ms, not immediately at connection time:

~~~rust
const DEFAULT_ADDR: &str = "127.0.0.1:8080";
const SERVER_TICK: Duration = Duration::from_millis(200);

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
    let mut interval = tokio::time::interval_at(Instant::now() + SERVER_TICK, SERVER_TICK);
    loop {
        interval.tick().await;
        let snapshots = world.lock().await.tick(SERVER_TICK_SECONDS);
        for (player_id, message) in snapshots {
            registry.send(player_id, message).await;
        }
    }
}
~~~

Use this registry so the tick task can send only a player’s own snapshot without giving WorldState a WebSocket dependency:

~~~rust
#[derive(Clone, Default)]
pub struct SessionRegistry {
    senders: Arc<Mutex<BTreeMap<u64, mpsc::UnboundedSender<ServerMessage>>>>,
}

impl SessionRegistry {
    pub async fn insert(&self, player_id: u64, sender: mpsc::UnboundedSender<ServerMessage>) {
        self.senders.lock().await.insert(player_id, sender);
    }

    pub async fn remove(&self, player_id: u64) {
        self.senders.lock().await.remove(&player_id);
    }

    pub async fn send(&self, player_id: u64, message: ServerMessage) {
        let sender = self.senders.lock().await.get(&player_id).cloned();
        if sender.is_some_and(|sender| sender.send(message).is_err()) {
            self.remove(player_id).await;
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

On cleanup after the WebSocket reader closes, call registry.remove(player_id).await and world.lock().await.remove_player(player_id) when player_id is Some. A protocol refusal has no player_id and therefore removes neither.

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

parse_address accepts no arguments or the exact pair --addr ADDRESS. Return a user-readable Err for unknown flags and a missing address, then let main print it through Result handling. The writer type alias is SplitSink<WebSocketStream<TcpStream>, Message>; import CloseFrame, CloseCode, Message, and tungstenite from tokio_tungstenite::tungstenite.

- [ ] **Step 4: Run all server tests and the binary help-path check**

Run: cargo test -p rune-dungeon-server

Expected: PASS. The server enforces ClientInfo ordering and v1, world ownership tests remain green, and no networking test depends on a fixed port.

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
    expect(encodeClientMessage(fixture.move_to_ground as never)).toBe(
      JSON.stringify(fixture.move_to_ground),
    );
  });

  it('drops malformed and unknown server frames without throwing', () => {
    expect(parseServerMessage('{not json')).toBeNull();
    expect(parseServerMessage(JSON.stringify({ Unknown: {} }))).toBeNull();
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

Initialize playerMovement to options.playerMovement ?? 'local'. In tickPlayer, return before any position-integrating player branch when w.playerMovement is authoritative. drainIntents still clears the queued ground intent, so a connected browser never accumulates a fallback command; monster AI, monster counterattack, M3 actions, and M4 state continue to tick against the latest snapshot position.

Modify PlayerLayer.svelte and IsoCamera.svelte to import getRenderedPlayerPosition and use its result at their existing group.position.set and camera follow sites. No Svelte component or scene file writes player.pos. This makes the player and camera move together over 200ms between snapshots; local mode returns world.player.pos and preserves the existing direct rendering path.

- [ ] **Step 4: Run focused client tests to verify they pass**

Run: cd client && npx vitest run src/net/__tests__/protocol.test.ts src/game/sim/__tests__/world.test.ts

Expected: PASS. Both languages load the same fixture, malformed inbound data is harmless, local movement retains 6 m/s, and authoritative mode changes logical position only through the pure application function while rendering reaches it over 200ms.

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
- Create: client/src/scene/__tests__/server-authority-contract.test.ts
- Modify: client/src/App.svelte

**Interfaces:**
- Consumes: protocol helpers from Task 4, applyAuthoritativePlayerPosition, and the existing GameScene HUD callback.
- Produces: ServerConnection, ConnectionState, optional GameScene serverUrl/onConnectionStateChange props, and ConnectionNotice.
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

it('forwards increasing snapshots and ignores an out-of-order snapshot tick', () => {
  const received: number[] = [];
  const socket = new FakeSocket();
  const connection = createTestConnection(socket, [], (snapshot) => received.push(snapshot.tick));
  connection.connect();
  socket.open();
  socket.message('{"WorldSnapshot":{"tick":2,"player":{"id":1,"position":{"x":1.2,"z":0},"target":null}}}');
  socket.message('{"WorldSnapshot":{"tick":1,"player":{"id":1,"position":{"x":0,"z":0},"target":null}}}');
  expect(received).toEqual([2]);
});

it('uses full jitter under the 1s-to-30s exponential cap and stops after ten retries', () => {
  expect(reconnectDelayMs(1, () => 0.5)).toBe(500);
  expect(reconnectDelayMs(6, () => 1)).toBe(30_000);
  expect(reconnectDelayMs(10, () => 1)).toBe(30_000);
});
~~~

Add raw-source contract checks that GameScene creates the world in authoritative mode only when serverUrl exists, calls connection.sendMove for ground clicks, calls applyAuthoritativePlayerPosition only for WorldSnapshot, and contains no local enqueue fallback in that server branch. Test ConnectionNotice for aria-live, the Korean reload copy 다시 불러오기, the error and info CSS tokens, pointer-events: auto, and a prefers-reduced-motion rule.

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

ServerConnection.connect creates one WebSocket through the injected SocketFactory. On open it sends clientInfoMessage(clientVersion) and joinGuestMessage(nickname) in that order. On inbound data:

1. Ignore and console.warn malformed frames.
2. On JoinAccepted publish connected with the server-issued ID and nickname.
3. On WorldSnapshot with a tick greater than the last accepted snapshot tick, call onSnapshot with the contained player snapshot. Ignore an older or duplicate tick so a delayed frame cannot rewind the client.
4. On AuthError retain its message for a subsequent close state.

On any non-4001 close, schedule min(30000, 1000 * 2 to the power of attempt minus 1) multiplied by random(), incrementing attempts from 1 through 10. Once the tenth retry closes, publish failed with 서버에 연결하지 못했습니다. 로컬 이동으로 전환하지 않았습니다. Dispose clears a timer, marks the connection closed by the caller, and suppresses retries. On 4001, publish protocol_mismatch with the received AuthError message or 프로토콜 버전이 맞지 않습니다. 다시 불러오세요. and schedule nothing.

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

Create ServerConnection only inside onMount when serverUrl is non-null. Use client version 0.0.0 and guest nickname 모험가. Its snapshot callback calls applyAuthoritativePlayerPosition(world, snapshot.position) followed by publishHud(). Its state callback passes the state to App. In the ground-click callback, call connection.sendMove({ x, z }) when serverUrl exists; otherwise retain the existing enqueueIntent local branch. Do not send M2–M4 actions to the server in this milestone.

Create ConnectionNotice.svelte as a status-only overlay. Render it only for reconnecting, failed, and protocol_mismatch states; the normal local POC therefore has no new visual element. Use an assertive aria-live region for failed/refused states, Crystal Glow plus --rd-info for retrying, --rd-danger plus a textual 상태 label for failures, and a real button only for protocol mismatch:

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

In App.svelte, read new URLSearchParams(window.location.search).get('server') once. Pass it as serverUrl, retain debugHud behavior, store ConnectionState | null, render ConnectionNotice outside Canvas, and pass onReload={() => window.location.reload()}. A missing parameter supplies null and leaves both the connection and notice absent.

- [ ] **Step 4: Run client integration and static UI tests**

Run: cd client && npx vitest run src/net/__tests__/connection.test.ts src/scene/__tests__/server-authority-contract.test.ts src/ui/__tests__/connection-notice-contract.test.ts

Expected: PASS. The first two frames are ordered, stale snapshots cannot rewind a newer state, parser failures are non-fatal, retry delays are bounded/full-jitter, 4001 never retries, and a server URL cannot enqueue local ground movement.

Run: cd client && npm run check

Expected: PASS with no Svelte or TypeScript diagnostics.

- [ ] **Step 5: Commit the browser authority integration**

~~~bash
git add client/src/net/connection.ts client/src/net/__tests__/connection.test.ts client/src/scene/GameScene.svelte client/src/scene/__tests__/server-authority-contract.test.ts client/src/ui/ConnectionNotice.svelte client/src/ui/__tests__/connection-notice-contract.test.ts client/src/App.svelte
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

Document that normal http://localhost:5173 retains M1–M4 local simulation and http://localhost:5173/?server=ws://127.0.0.1:8080 makes only player ground movement authoritative. State explicitly that an unavailable server is visibly reported and does not revert to local movement.

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
2. Start the server at 127.0.0.1:8080 and open http://localhost:5173/?server=ws://127.0.0.1:8080. Ground-click once and verify Network shows a JoinAccepted before WorldSnapshot frames, each 200ms server snapshot advances the logical position by 1.2 units, and the player plus camera interpolate smoothly over each 200ms interval.
3. Stop the server while the server URL remains open. Verify reconnect copy appears and the player does not move after additional ground clicks.
4. Restart the server. Verify reconnect succeeds within ten attempts and movement resumes from a newly joined origin position.
5. Temporarily set the TypeScript protocol constant to 2 without committing it, reload the server URL, and verify AuthError copy plus a 다시 불러오기 button appear; verify no retry timer is scheduled. Restore the constant to 1 before proceeding.

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
| Guest ID, origin spawn, target-only movement, 200ms snapshots, client interpolation | Tasks 2, 3, and 4 |
| Per-player rather than broadcast snapshot | Tasks 2 and 3 |
| Shared deterministic movement and cross-language golden fixture | Tasks 1 and 4 |
| game/ browser-free authority adapter | Task 4 plus Task 6 purity gate |
| URL-gated authority mode preserving no-server POC | Tasks 4 and 5 |
| 1s/30s/10 retry policy, malformed-frame handling, refusal reload | Task 5 |
| Required automated gates and manual local/server/error flows | Task 6 |
| M5.2 boundaries remain outside the milestone | Global Constraints and Task 6 handoff |

The plan contains no unspecified implementation step, conflicting protocol name, or unresolved file ownership. Player-position writes are confined to server world ticks or applyAuthoritativePlayerPosition; the connected ground-click path never invokes the local enqueue branch.
