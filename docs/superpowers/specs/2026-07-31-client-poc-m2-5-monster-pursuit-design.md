# Client POC M2.5 Monster Pursuit Design

**Date:** 2026-07-31
**Status:** Approved direction, pending written-spec review

## Goal

Give each living ink slime a small deterministic movement state machine:

> wait at spawn → detect a nearby player → pursue → hold at attack range →
> disengage when the chase is invalid → return to spawn

This step validates monster movement and pursuit feel before monster attack
timing, player damage, hit reactions, or player defeat are introduced.

## Approaches Considered

### A. Add distance branches directly to `world.ts`

- Smallest initial diff.
- Mixes player combat orchestration and monster behavior in the same growing
  module.
- Rejected because the next step will add monster attack timing and transitions.

### B. Add a focused pure monster AI module

- Keeps state transitions and movement testable without Svelte or Three.js.
- Leaves `world.ts` responsible for tick ordering and shared state only.
- Extends naturally with an attack state in the next M2.5 slice.
- Selected.

### C. Introduce a generic behavior tree

- Could eventually support bosses and varied monster behaviors.
- Adds an abstraction before the first ordinary monster behavior is validated.
- Rejected for the POC.

## Scope

### Included

- Monster movement modes: `idle`, `chasing`, `engaged`, `returning`.
- Player-distance detection from `idle`.
- Pursuit toward the current player position.
- Stopping at the configured monster attack range without overshooting it.
- Disengaging when the player is too far away.
- Disengaging when the monster reaches its maximum spawn leash.
- Returning to the exact spawn position.
- Ignoring new detection while returning.
- Resetting movement mode on death and respawn.
- Pure tests for transitions, distance boundaries, movement, and lifecycle.
- Browser verification of idle, pursuit, hold, disengage, and return.

### Deferred

- Monster attack cadence, hit frame, and player damage.
- Player HP, hit reaction, defeat, and revival.
- Threat tables, multiplayer target selection, and target switching.
- Navigation meshes, obstacle avoidance, pathfinding, and monster collisions.
- Facing, walk/attack animation, aggro indicators, and combat VFX.
- Per-monster authoring of disengage and leash multipliers.

## POC Tuning Contract

The existing runtime conversion remains:

```ts
LOGICAL_PX_TO_WORLD_UNIT = 0.1;
```

Tune only the ink slime fixture:

```json
{
  "moveSpeed": 42,
  "aggroRange": 30,
  "attackRange": 14
}
```

Runtime values:

- movement speed: `4.2` world units per second;
- detection range: `3.0` world units;
- engaged/attack range: `1.4` world units.

Derived POC return values:

```ts
disengageRange = aggroRange * 1.5; // 4.5
leashRange = aggroRange * 2;       // 6.0
```

Detection uses a strict boundary: distance must be less than `aggroRange`.
The closest initial slime is exactly `3.0` units away, so all three slimes
remain idle at initial load. Moving even slightly inside the closest slime's
detection radius starts pursuit.

`moveSpeed` remains unchanged. Damage, HP, reward, respawn duration, player
weapon range, and spawn positions remain unchanged.

## Runtime State

Extend `MonsterState`:

```ts
export type MonsterMode = 'idle' | 'chasing' | 'engaged' | 'returning';

interface MonsterState {
  // existing identity, position, HP, death, and respawn fields
  mode: MonsterMode;
}
```

There is one local player in this POC, so the monster does not store a target
ID yet. Multiplayer target identity is deferred until server-authoritative
combat work.

## State Transitions

### `idle`

- Hold the current position.
- If player distance is strictly less than `aggroRange`, transition to:
  - `engaged` when already within `attackRange`;
  - otherwise `chasing`.

### `chasing`

Evaluate return conditions before movement:

1. If player distance is greater than `disengageRange`, enter `returning`.
2. If distance from spawn is greater than or equal to `leashRange`, enter
   `returning`.
3. If player distance is less than or equal to `attackRange`, enter `engaged`.
4. Otherwise move toward the player.

Movement is clamped so the monster cannot cross inside `attackRange` during a
large tick. After movement, transition to `engaged` when the remaining distance
is at the range boundary.

### `engaged`

- Hold position while the player remains within `attackRange`.
- Apply the same disengage and leash checks as `chasing`.
- If the player moves beyond `attackRange` but remains a valid target,
  transition to `chasing`.

### `returning`

- Ignore player detection and movement.
- Move toward `spawnPos`.
- On exact arrival, set position to `spawnPos` and transition to `idle`.
- Detection can resume on a later tick, not the arrival tick.

## Lifecycle Rules

- A newly created monster starts in `idle`.
- Killing a monster sets its mode to `idle`; dead monsters never execute AI.
- Respawn restores HP, spawn position, death-processing state, and `idle` mode.
- A dead or respawning monster cannot pursue, engage, or return.

## Module Boundaries

```text
game/sim/
├── entities/monster.ts      runtime state and death/respawn lifecycle
├── ai/monster-ai.ts         pure movement transitions for one living monster
└── world.ts                 shared tick order and player/monster orchestration
```

`monster-ai.ts` consumes a monster, player position, runtime movement values,
and `dt`. It mutates only the supplied `MonsterState`. It does not know about
inventory, drops, player attacks, Svelte, Three.js, or browser input.

## World Tick Order

For positive `dt`:

1. Drain player intents.
2. Advance dead-monster respawn timers.
3. Advance player movement or player combat.
4. Advance AI for each living monster.
5. Render layers and publish HUD through the existing `GameScene` loop.

The player phase must no longer return from the entire world tick early.
Instead it completes its own branch and allows monster AI to run afterward.
If the player kills a monster in step 3, that dead monster is skipped in
step 4.

This ordering is deterministic. When both actors approach, the player moves
first and the living monster responds to the updated player position.

## Rendering and HUD

No new render component is required. `MonsterLayer.update()` already copies
monster positions every rendered frame, so pursuit and return become visible
automatically.

The minimal HUD remains unchanged. Monster mode labels, aggro markers, and
attack indicators are deferred.

## Error and Edge-Case Rules

- Non-positive `dt` advances neither player nor monster state.
- Dead monsters ignore AI.
- A monster exactly at detection range remains idle.
- A monster exactly at attack range is engaged.
- A monster exactly at leash range returns.
- Movement never overshoots the attack boundary or spawn position.
- Returning ignores a player standing beside the monster until spawn arrival.
- Large frame delays remain bounded by the existing fixed-step loop.

## Testing Strategy

Implementation follows red-green-refactor:

1. Test new monster lifecycle mode initialization and reset.
2. Test the strict detection boundary and transition inside it.
3. Test pursuit movement and attack-range clamping.
4. Test engaged hold and re-pursuit.
5. Test player-distance disengage.
6. Test spawn-leash disengage.
7. Test returning ignores detection and reaches exact spawn.
8. Test world tick continues into monster AI after every player branch.
9. Run the full simulation and existing browser regression suite.
10. Inspect the browser for idle, pursuit, hold, disengage, and return.

## Acceptance Criteria

- All three slimes remain stationary on initial load.
- Moving inside one slime's `3.0` detection radius makes that slime pursue.
- The slime stops `1.4` units from the player without overshoot.
- Moving a still-valid distance away resumes pursuit.
- Exceeding `4.5` player distance or `6.0` spawn displacement starts return.
- A returning slime ignores the nearby player until it reaches spawn.
- The slime arrives exactly at its original spawn and becomes idle.
- Death and respawn restore idle mode and spawn position.
- Existing player selection, auto-attack, rewards, respawn, and HUD behavior
  continue to work.
- No file under `client/src/game/` imports Svelte, Three.js, or browser APIs.
- Type checking, all tests, build, runtime-data validation, and browser
  verification succeed.
