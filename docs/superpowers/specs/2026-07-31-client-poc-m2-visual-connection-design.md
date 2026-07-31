# Client POC M2 Visual Connection Design

**Date:** 2026-07-31
**Status:** Approved direction, pending written-spec review

## Goal

Connect the completed pure combat simulation to a minimal playable screen:

> see three ink slimes → select one → start auto-attack with a double-click →
> watch approach, damage, death, rewards, and respawn through the scene and HUD

This step validates behavior and data flow. Production art, animation, effects,
and polished HUD styling remain deferred so each visible element can be tuned
incrementally after it works.

## Chosen Approach

Use imperative 3D layer updates plus a change-only reactive HUD snapshot.

- `MonsterLayer` follows the existing `PlayerLayer` pattern. The game loop calls
  `update()` and mutates Three.js objects directly without putting per-frame
  positions into Svelte reactivity.
- The HUD receives a small serializable snapshot. `GameScene` publishes it only
  when HUD-visible values change.
- `game/` remains pure TypeScript and does not import Svelte, Three.js, or
  browser APIs.

Alternatives rejected for this step:

- Making the whole world reactive would violate the established frame-update
  boundary and add unnecessary work.
- Giving the HUD its own animation loop would duplicate scheduling and blur the
  single game-loop ownership model.

## Scope

### Included

- Render all three runtime ink slimes with simple placeholder geometry.
- Update monster position and alive visibility from `WorldState`.
- Highlight the selected living monster with a color change and ground ring.
- Single-click a monster to enqueue target selection.
- Double-click a monster to enqueue target selection followed by auto-attack.
- Keep ground click movement behavior unchanged.
- Show a minimal HUD:
  - player FSM mode;
  - auto-attack on/off;
  - gold;
  - current eum inventory;
  - selected monster name;
  - selected monster current and maximum HP.
- Hide the target panel when there is no selected living monster.
- Publish HUD state only when visible values change.

### Deferred

- Final slime model, animation, VFX, audio, damage numbers, and health bars in
  the 3D world.
- Tab targeting and fast-double-Tab detection.
- Mobile/touch-specific input behavior.
- Automatic target replacement after a kill.
- Monster attacks, player HP changes, and combat consumables.
- Production HUD layout, responsive polish, localization, and accessibility
  pass.

## Components and Boundaries

### Pure presentation adapters

Add a small pure TypeScript adapter outside the simulation core that:

- creates a `HudSnapshot` from `WorldState`;
- compares snapshots by HUD-visible values;
- converts a monster click gesture into ordered `GameIntent` values.

These functions are tested without mounting Svelte or WebGL.

### `MonsterLayer.svelte`

`MonsterLayer` receives the existing plain `WorldState` and exposes:

```ts
update(): void
```

It creates one placeholder group per existing monster entity. Each update:

1. copies runtime position to the corresponding Three.js group;
2. hides dead monsters;
3. applies selected or default material state;
4. shows the selection ring only for the selected living target.

Monster entities are fixed for this POC step. Dynamic collection
mounting/unmounting is deferred until runtime spawning can add or remove entity
IDs.

### `GameScene.svelte`

`GameScene` continues to own `WorldState` and the single fixed-step/render loop.
It:

- forwards monster gestures into the intent queue;
- calls `MonsterLayer.update()` after simulation steps;
- creates a HUD snapshot after simulation updates;
- calls its HUD callback only when the snapshot differs from the last published
  snapshot;
- publishes an initial snapshot on mount so the HUD is never blank.

### `Hud.svelte` and `App.svelte`

`App.svelte` keeps the latest `HudSnapshot` as low-frequency reactive state.
The Canvas and HUD are siblings. `Hud.svelte` only formats and displays the
snapshot; it does not read or mutate `WorldState`.

## Input Rules

- A monster single-click enqueues one `select_target` intent.
- A monster double-click enqueues `select_target`, then
  `toggle_auto_attack`, in that order.
- If the browser emits the normal click before the double-click, repeated target
  selection is harmless because selection does not toggle combat.
- Monster interaction stops propagation so the same gesture does not also
  enqueue a ground movement.
- Ground movement retains the current simulation rule: it clears the combat
  target and disables auto-attack.
- Dead monsters are hidden and cannot produce interaction intents.

## HUD Snapshot

The snapshot contains only user-visible state:

```ts
interface HudSnapshot {
  playerMode: PlayerMode;
  autoAttackEnabled: boolean;
  gold: number;
  eum: EumStack[];
  target: {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
  } | null;
}
```

No player or monster positions are included. This prevents movement from
causing reactive HUD updates every frame.

Eum stacks are copied and sorted by symbol so comparison and display are
deterministic. A selected dead or unknown target produces `target: null`.

## Minimal Visual Contract

- Placeholder slimes use a compact rounded body positioned above the ground.
- Default and selected colors must be visibly different.
- The selection ring sits slightly above the ground to avoid z-fighting.
- HUD uses high-contrast translucent panels and system fonts.
- The player panel sits at the upper-left.
- The target panel sits at the upper-center and is absent without a target.
- HUD elements do not capture pointer events in this verification step.

Exact colors, spacing, sizes, and labels are tuning values rather than stable
architecture. They may be adjusted after browser inspection without changing
the data flow.

## Error and Edge-Case Rules

- Missing monster references are ignored instead of throwing during input.
- A dead target is not shown in the HUD even before the next selection.
- Respawn makes the existing monster group visible again.
- Repeated identical HUD snapshots do not trigger a Svelte state assignment.
- HUD snapshot data is copied; presentation code cannot mutate world inventory.
- The first frame renders valid HUD state before any user input.

## Testing Strategy

Implementation follows red-green-refactor:

1. Test deterministic HUD snapshot creation.
2. Test that snapshot comparison ignores object identity but detects visible
   changes.
3. Test single-click and double-click intent ordering.
4. Implement the Svelte layers against those pure contracts.
5. Run the full Vitest suite, `npm run check`, and `npm run build`.
6. Inspect the browser to verify monster visibility, selection, auto-attack,
   HUD updates, death, reward changes, and respawn.

## Acceptance Criteria

- Three placeholder ink slimes are visible at their runtime spawn positions.
- Clicking a living slime selects and highlights it without starting combat.
- Double-clicking a living slime starts the existing auto-attack loop.
- Player and monster visual state follows the pure world state.
- The selected target panel reflects HP changes and disappears on death.
- Gold and eum values visibly update after a kill.
- A dead slime disappears and reappears after the configured respawn delay.
- HUD updates do not depend on a second animation loop.
- No file under `client/src/game/` imports Svelte, Three.js, or browser APIs.
- Type checking, all tests, build, runtime-data validation, and browser
  verification succeed.
