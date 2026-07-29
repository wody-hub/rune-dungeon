# Rune Dungeon 3D Online Vertical Slice Design

## Decision

Rune Dungeon begins as an online, fixed-isometric 3D vertical slice. It retains
the existing `아르카디아` gameplay loop. The former Phaser 2D, local-only
baseline is historical context only and is not an implementation option.

## Product Boundary

The first playable online slice contains one `공유 마을 허브`, `아르카디아`,
and three `협동 인스턴스`: `새벽 들판`, a compact `흑심 채굴장`, and its
boss room.
Only the town is shared. The server creates each gameplay instance on entry for
the same party or invited guests, while other groups receive separate instances.
Town and zone `포털` plus entry triggers preserve the route from Arcadia to field,
dungeon, boss room, and back to Arcadia; the slice does not use a continuous world.

Later regions follow the same portal network: each region hub connects its field
and dungeon instances without reclassifying the first-slice field as a multiplayer hub.

The slice does not include procedural world generation, housing, trading, parties,
guilds, AI agents, offline rewards, automatic hunting, or a production economy.
Those are follow-on product phases, not blocked features of the slice.

## Technology Baseline

- Client: Svelte, TypeScript, Vite, Three.js, and Threlte.
- Rendering: fixed-isometric 3D camera with constrained zoom; no free camera.
- Server: Rust with WebSocket connections.
- Authority: the server is authoritative for player identity, positions, combat,
  monster state, drops, inventory, crafting results, and transformations.
- Shared rules: protocol messages and deterministic game-rule types are defined in
  a shared Rust crate, compiled for browser use only where client-side prediction
  or display needs the same definition.
- Persistence: the server owns persistence. A local development adapter may use
  a simple file or SQLite store; the client never treats localStorage as game truth.

## First-Session Access

The first playtest uses guest nickname entry. The server assigns a player ID and
holds the session identity. OAuth, account recovery, and cross-device ownership
are deferred until multiplayer movement and combat are reliable.

## Client and Server Data Flow

1. The client sends an intent such as movement direction, basic attack, pickup,
   crafting request, or transformation toggle.
2. The server validates the intent against authoritative state and resolves all
   combat, drops, inventory changes, and crafting success/failure.
3. The server broadcasts the resulting state changes to relevant connected clients.
4. The client renders replicated state and may predict only immediately reversible
   visual feedback such as facing, attack wind-up, and local effects.

No client message may directly set HP, inventory quantities, drop outcomes,
crafting outcomes, or final position.

## Preserved Gameplay Rules

- Automatic/idle play remains the long-term accumulation pillar; manual dungeons
  are the high-value acceleration pillar. Neither is required in the first slice.
- There is no mana resource.
- An equipped incantation triggers independently on each successful basic-attack
  hit, has no internal cooldown, can multi-proc with other equipped incantations,
  and always affects one target.
- Proc chance is capped at 20% and is controlled by incantation base chance,
  weapon bonus, narrow mantra bonuses, and later 천지인 bonuses.
- `INT` does not directly add proc chance in the first slice.

## Player-Facing Terminology

The player-facing name for every consonant and vowel collection resource is
`음` (Eum). UI, dialogue, rewards, and item labels use `음` consistently, for
example `음 · ㄱ ×3` and `음 · ㅏ ×2`. `음 조각` may describe an individual
world drop in prose, but it is not a separate inventory category.

The game keeps consonant, vowel, initial, medial, and final classifications only
inside combination rules and runtime data. Players do not need to learn those
technical labels to collect 음 and make 자형. Tutorial copy explains once that
음 is the scattered power from which Hangul forms can be assembled.

## Runtime Content Schema

The current `client/src/game/data` JSON is a 전환용 fixture used to validate the
first-slice contracts before the server implementation exists. The implementation
moves canonical content to `shared/content` as the 서버 정본, validates it before
startup, and 생성 steps produce client display copies from that canonical source:

- `CharacterVisualState`: orientation in radians plus model, rig, animation clip,
  optional weapon model, material variant, and aura keys; no sprite/frame contract.
- `DropTable`: independent gold/item probabilities plus a grouped `eumRollGroup`
  with draw-count range, symbol weights, and quantity ranges.
- `CraftingRecipe`: inputs, gold cost, catalyst/support material rules, success
  rate, success output, and failure consumption/result.
- `WorldContent`: the Arcadia shared hub and exactly three four-player cooperative
  instance maps, with spawn locations and validated entry/exit portal links.

All runtime data is validated before the server starts. Generated client copies
are display data only; server validation and resolution remain authoritative.

## Combat Balance Baseline

The combat formula applies the greatsword damage multiplier before defense. With
the current Lv.12 test loadout, expected basic-attack damage is `41.615` against
the slime, `37.832` against the elite, and `13.005` during the boss's 50% normal
phase.
Monster HP and boss state rewards must be recalibrated from this formula, rather
than from the pre-multiplier `24–32` range.

## OpenMMO Reference Policy

`/Users/j.jaeyo/Project/ETC/OpenMMO` is a read-only architecture reference for
the Svelte/Three client, Rust WebSocket server, shared protocol, and testing
boundaries. Its PolyForm Noncommercial license prohibits copying its code, assets,
or derivative implementation into Rune Dungeon. Rune Dungeon implements its own
code, assets, protocol names, and content.

## Implementation Handoff

The next implementation plan establishes the Rust/WebSocket authoritative server
and the Svelte/Threlte fixed-isometric 3D client together. It begins with guest
session issuance, intent validation, replicated world state, and a minimal camera
and rendering path; it does not reintroduce a local-only or 2D client path.

The current fixtures already contain the explicit drop entries, `그룹 음 보상`,
and the first two `제작 레시피`; these contracts `이미 존재` and are inputs to
the server content loader, not future design work.

OpenMMO remains an architecture-only reference for boundaries and implementation
principles. Rune Dungeon does not copy its code, assets, protocol names, or
content.

## Verification Criteria

- Two guest clients can enter the same town and observe synchronized movement.
- The server rejects invalid movement, combat, pickup, and crafting state changes.
- A player can complete the field-to-dungeon-to-boss loop and retain server-owned
  progress after reconnecting.
- Drop and crafting test cases cover probability boundaries, quantities, failure
  consumption, and duplicate-request protection.
- Combat tests prove the documented damage formula and boss state modifiers.
