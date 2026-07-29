# Rune Dungeon 3D Online Vertical Slice Design

## Decision

Rune Dungeon begins as an online, fixed-isometric 3D vertical slice. It retains
the existing `아르카디아` gameplay loop, but replaces the previous Phaser 2D,
local-only implementation baseline.

## Product Boundary

The first playable online slice contains one shared `아르카디아` town, one field,
one compact dungeon, and one boss encounter. Players can see one another, move,
fight monsters, receive drops, craft and equip 결, transform, and return to town.

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

## Runtime Content Schema

The current JSON content remains the authoring source for the first slice. It is
extended with explicit server-readable structures:

- `DropTable`: per-entry item/fragment ID, quantity range, probability, and any
  guaranteed reward.
- `CraftingRecipe`: inputs, gold cost, catalyst/support material rules, success
  rate, success output, and failure consumption/result.
- `WorldContent`: spawn locations, portal links, dungeon boundaries, boss-state
  transitions, and NPC interaction IDs.

All runtime data is validated before the server starts. Client copies are display
data only; server validation and resolution remain authoritative.

## Combat Balance Baseline

The combat formula applies the greatsword damage multiplier before defense. With
the current Lv.12 test loadout, expected basic-attack damage is about 41.6 against
the slime, 37.8 against the elite, and 13.0 during the boss's 50% normal phase.
Monster HP and boss state rewards must be recalibrated from this formula, rather
than from the pre-multiplier `24–32` range.

## OpenMMO Reference Policy

`/Users/j.jaeyo/Project/ETC/OpenMMO` is a read-only architecture reference for
the Svelte/Three client, Rust WebSocket server, shared protocol, and testing
boundaries. Its PolyForm Noncommercial license prohibits copying its code, assets,
or derivative implementation into Rune Dungeon. Rune Dungeon implements its own
code, assets, protocol names, and content.

## Verification Criteria

- Two guest clients can enter the same town and observe synchronized movement.
- The server rejects invalid movement, combat, pickup, and crafting state changes.
- A player can complete the field-to-dungeon-to-boss loop and retain server-owned
  progress after reconnecting.
- Drop and crafting test cases cover probability boundaries, quantities, failure
  consumption, and duplicate-request protection.
- Combat tests prove the documented damage formula and boss state modifiers.
