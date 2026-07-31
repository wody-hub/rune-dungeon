# Client POC M2 Combat Simulation Design

**Date:** 2026-07-31  
**Status:** Approved direction, pending written-spec review

## Goal

Extend the client-only POC from click movement into one complete, repeatable
player-driven combat loop:

> spawn ink slimes → select one target → enable auto-attack → approach into
> range → attack on cadence → kill once → award gold and eum once → respawn

M2 proves the local simulation boundary and combat feel before monster attacks,
player damage, production assets, or the Rust server are introduced.

## Approaches Considered

### A. One large `world.ts` implementation

Keep movement, combat, drops, and spawning in the existing world module.

- Fastest initial implementation.
- Becomes difficult to test and later transfer behind the server boundary.
- Rejected because M2 adds multiple independent state transitions and timers.

### B. Pure simulation modules with a small world orchestrator

Keep `WorldState` as the owner of runtime state, but split player state,
combat calculation, drops, and spawning into focused pure modules. The world
tick coordinates them.

- Maintains the existing `game/` → `scene/` dependency direction.
- Supports deterministic tests through injected random values.
- Provides a clear future seam for the Rust authoritative server.
- Selected.

### C. Build the network protocol and local server mock first

Make all local play pass through protocol-shaped commands and snapshots before
combat exists.

- Closest to the eventual online architecture.
- Front-loads protocol decisions before combat behavior has been validated.
- Rejected for M2. Only stable command/event types needed by the local loop will
  be introduced; WebSocket transport remains deferred.

## Scope

### Included

- Player FSM: `idle`, `moving`, `attacking`.
- Runtime monster entities created from the existing ink slime fixture.
- Target selection through a simulation intent.
- Auto-attack toggle through a simulation intent.
- Automatic approach until weapon range is reached.
- Attack cadence and hit timing based on weapon fixture values.
- Physical damage calculation using the existing MVP formula.
- Monster death processed exactly once.
- Deterministic gold and eum rolls processed exactly once per death.
- Immediate inventory update in the local POC.
- Timed monster respawn so the loop can repeat.
- Pure unit tests for state transitions, timing, damage, death, and drops.

### Deferred

- Monster aggro, pursuit, attacks, and player damage.
- Automatic selection of a new target after the current target dies.
- Critical hits and incantation procs.
- Hit stun, evasion, groggy, and boss exceptions.
- Item drops other than the M2 gold/eum HUD loop.
- Production WebSocket transport or Rust server implementation.
- Final animation, VFX, audio, and balance tuning.

## Runtime Units

Design fixtures keep their existing logical-pixel values. A single adapter
converts distance and speed values into world units when runtime definitions
are created.

```ts
const LOGICAL_PX_TO_WORLD_UNIT = 0.1;
```

The exact coefficient remains a POC tuning knob, but all weapon ranges and
monster movement values must pass through the same conversion boundary. Raw
fixture values must not leak into simulation distance comparisons.

## State Model

The existing player `target` field is separated into movement and combat
concepts:

```ts
type PlayerMode = 'idle' | 'moving' | 'attacking';

interface PlayerState {
  pos: Vec2;
  mode: PlayerMode;
  moveTarget: Vec2 | null;
  combatTargetId: string | null;
  autoAttackEnabled: boolean;
  attackElapsedMs: number;
  pendingHitMs: number | null;
}
```

Monster runtime state contains only what M2 needs:

```ts
interface MonsterState {
  entityId: string;
  definitionId: string;
  spawnPos: Vec2;
  pos: Vec2;
  hp: number;
  alive: boolean;
  deathProcessed: boolean;
  respawnRemainingMs: number | null;
}
```

The inventory uses the normalized `PlayerInventory` shape already exposed by
`game/types/data.ts`.

## Intents and Transitions

The input queue expands to:

```ts
type GameIntent =
  | { type: 'move_to_ground'; point: Vec2 }
  | { type: 'select_target'; monsterId: string }
  | { type: 'toggle_auto_attack' };
```

Rules:

1. `move_to_ground` disables auto-attack, clears the combat target, and enters
   `moving`.
2. `select_target` selects a living monster but does not start auto-attack.
3. `toggle_auto_attack` only enables when a living target is selected.
4. With auto-attack enabled and the target out of range, the player approaches
   the target and remains in `moving`.
5. In range, the player enters `attacking` and advances the attack timer.
6. Damage is applied only when the attack reaches `hitFrameMs`.
7. After a target dies, the player becomes `idle`, clears the target, and turns
   auto-attack off. No replacement target is chosen automatically.

Double-click and fast-double-Tab detection belong to the input layer. Both
normalize into `select_target` followed by an auto-attack toggle; the simulation
does not own browser timing rules.

## Combat and Drops

M2 physical damage follows the current design contract:

```text
rolledWeaponDamage = randomInt(minDamage, maxDamage)
rawDamage = (rolledWeaponDamage + attackBonus) × damageMultiplier
finalDamage = max(1, floor(rawDamage × 100 / (100 + targetDefense)))
```

Randomness is supplied through a small `RandomSource` interface. Tests use a
fixed sequence; production uses `Math.random`.

On the first transition to zero HP:

1. Mark the monster dead.
2. Roll its guaranteed/probabilistic gold entries.
3. Roll the configured number of eum symbols without duplicates when the
   fixture requires it.
4. Apply rewards to the local inventory.
5. Mark death processing complete.
6. Start the respawn timer.

Further ticks must not award rewards again. Respawn restores HP and position,
then clears the death-processing flag for the next life.

## Module Boundaries

```text
game/sim/
├── world.ts                 world state, intent drain, tick orchestration
├── fsm/player-fsm.ts        player transition rules
├── combat/damage.ts         deterministic physical damage calculation
├── combat/drops.ts          deterministic gold/eum rolls
├── entities/monster.ts      runtime monster creation and respawn
└── runtime-content.ts       fixture-to-runtime unit conversion
```

The modules remain pure TypeScript and must not import Svelte, Three.js, or
browser APIs.

## Error and Edge-Case Rules

- Selecting an unknown or dead monster is ignored and does not corrupt the
  current state.
- Auto-attack cannot be enabled without a living target.
- A target dying before the pending hit cancels the hit.
- Large frame delays remain bounded by the existing fixed-step loop.
- Non-positive `dt` performs no time-based progression.
- Reward quantities are integers and never negative.
- Respawn creates a new life of the same entity, not another collection entry.

## Testing Strategy

Every behavior is implemented red-green-refactor:

1. FSM intent and transition tests.
2. Approach and range-boundary tests.
3. Attack cadence and hit-frame tests.
4. Damage formula tests with fixed randomness.
5. Death idempotency tests.
6. Gold/eum deterministic drop tests.
7. Respawn reset tests.
8. Existing movement, camera, and fixed-step regression suite.

M2 is not complete until `npm run check`, `npx vitest run`, and
`npm run build` all exit successfully.

## Acceptance Criteria

- Three or more ink slimes can exist simultaneously in the pure world state.
- A selected slime is approached and attacked only after auto-attack is enabled.
- Damage occurs at the weapon hit frame and respects attack cadence.
- Killing a slime awards its gold/eum exactly once.
- The player stops after the selected slime dies.
- The slime respawns after the configured delay and can be killed again.
- Simulation behavior is deterministic under a fixed random source.
- No file under `game/` imports Svelte, Three.js, or browser APIs.

## Repository Maintenance Included With M2

- Remove stale `progress.md` claims that the gap checklist is uncommitted.
- Replace the obsolete simultaneous client/server implementation paragraph
  with the current client-only POC ordering.
- Pin Node.js 22.12 or newer for Vite 8 through repository configuration and
  declare the supported version in `client/package.json`.
