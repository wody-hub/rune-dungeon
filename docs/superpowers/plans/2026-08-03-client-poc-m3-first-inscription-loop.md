# Client POC M3 First Inscription Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the deterministic client-only M3 loop from the first slime reward through `결: 화` crafting, equipment, and fire transformation on/off without changing existing combat outcomes.

**Architecture:** Add a framework-free M3 progression module that owns the scenario seed, one-time cache, recipe transactions, current-Gyeol slot, and transformation gate. `world.ts` queues all M3 actions through the existing intent boundary, while the HUD receives an immutable M3 snapshot and the scene only renders an imperative supply-cache handle plus temporary fire-aura feedback.

**Tech Stack:** Svelte 5.56, TypeScript 6, Vite 8, Threlte 8, Three.js 0.185, Vitest 4.

## Global Constraints

- Follow `DESIGN.md` and `plan/06_Art_Direction.md`: the approved Inkbound Crystal tokens, typography, compact angular panels, semantic glow, and reduced-motion behavior are mandatory.
- Preserve all existing movement, targeting, auto attack, chase, counterattack, slime gold/음 drops, damage values, attack timing, and respawn behavior.
- The normal slime still supplies only its current `ㄱ`/`ㅏ`/`ㅇ` group and gold. Do not implement generic `ITEM` drop processing or change its drop table.
- M3 starts at gold `15` without `음 · ㅎ`, `음 · ㅘ`, `돌: 새김`, `자형: 화`, or `결: 화`; `인: 움결 화` remains equipped and normal.
- `각인 보급함` is a one-time M3 alternate supplier, enabled after the first slime death, that grants exactly `음 · ㅎ ×1`, `음 · ㅘ ×1`, and `돌: 새김 ×1`.
- Use the existing recipe data for 100% `자형: 화` and `결: 화` transactions. Each successful transaction consumes exactly its inputs.
- `결: 화` equips only into the M3 `현재 결` slot. It enables on/off transformation only with `인: 움결 화`; it does not change combat calculations.
- Current player, cache, weapon, and transformation geometry are functional placeholders, never final character art.
- Do not add dependencies, persistence, server work, maps, elite/boss content, general inventory/equipment UI, other recipes, crafting failure, a push, or a tag.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `client/src/game/sim/m3-progression.ts` | Framework-free M3 IDs, seed, action types, gated transactions, derived stage, and presentation sequence counters. |
| `client/src/game/sim/__tests__/m3-progression.test.ts` | Deterministic rules for the M3 seed, cache, recipes, equipment, and transformation gate. |
| `client/src/game/sim/world.ts` | Owns `m3` alongside existing world state, applies M3 intents during `tick`, and unlocks the cache after the normal reward path. |
| `client/src/game/sim/__tests__/world.test.ts` | Verifies the integrated first-death reward/cache path without regressing M2/M2.5 behavior. |
| `client/src/ui/hud-model.ts` | Serializes visible M3 state and detects its changes at the existing HUD snapshot boundary. |
| `client/src/ui/M3ProgressPanel.svelte` | Compact, keyboard-accessible, bottom-center, one-action-at-a-time M3 UI and CSS-only feedback overlays. |
| `client/src/ui/Hud.svelte` | Composes the M3 panel and exposes `현재 결` in the player HUD without moving existing HUD responsibilities. |
| `client/src/ui/__tests__/hud-model.test.ts` | Covers the M3 snapshot and its equality contract. |
| `client/src/ui/__tests__/m3-progress-style-contract.test.ts` | Keeps the M3 panel tokenized, mobile-stacked, keyboard-interactive, and reduced-motion safe without a DOM test dependency. |
| `client/src/scene/M3SupplyCache.svelte` | Imperative temporary cache mesh; handles one click and visibility/pulse updates. |
| `client/src/scene/GameScene.svelte` | Bridges DOM/scene M3 actions into world intents and forwards imperative cache/transformation state. |
| `client/src/scene/PlayerLayer.svelte` | Adds only placeholder-safe fire aura/weapon emission during transformation. |
| `client/src/scene/visual-state.ts` | Pure transformation progress calculation using a shared timing token. |
| `client/src/scene/__tests__/visual-state.test.ts` | Covers normal and reduced-motion transformation timing. |
| `client/src/scene/__tests__/m3-scene-contract.test.ts` | Guards the cache/action bridge and non-final transformation presentation contract from source. |
| `client/src/design/visual-theme.ts` | Adds the approved 800ms transformation token and CSS variable. |
| `client/src/design/__tests__/visual-theme.test.ts` | Locks the transformation token and its CSS serialization. |
| `client/src/App.svelte` | Connects the sibling HUD control callback to the scene's imperative M3 action entry point. |
| `client/README.md`, `progress.md` | Record M3 completion only after all automated and browser verification passes. |

---

### Task 1: Pure M3 progression rules and deterministic transactions

**Files:**
- Create: `client/src/game/sim/m3-progression.ts`
- Create: `client/src/game/sim/__tests__/m3-progression.test.ts`

**Interfaces:**
- Consumes: `PlayerInventory` and `CraftingRecipe` definitions from `game/types/data.ts`, plus `crafting-recipes.json`.
- Produces: `M3Progress`, `M3Action`, `M3Stage`, `M3_IDS`, `createM3InventorySeed()`, `createM3Progress()`, `enableM3SupplyCache()`, `applyM3Action()`, `getM3Stage()`, and `isM3Action()`.

- [ ] **Step 1: Write the failing progression-rule tests**

Create `client/src/game/sim/__tests__/m3-progression.test.ts` with these exact behavioral tests. Keep the fixture local so no test mutates shared JSON data.

```ts
import { describe, expect, it } from 'vitest';
import type { PlayerInventory } from '../../types/data';
import {
  M3_IDS,
  applyM3Action,
  createM3InventorySeed,
  createM3Progress,
  enableM3SupplyCache,
  getM3Stage,
} from '../m3-progression';

function sourceInventory(): PlayerInventory {
  return {
    gold: 100,
    eum: [
      { symbol: 'ㄱ', quantity: 3 },
      { symbol: 'ㅎ', quantity: 1 },
      { symbol: 'ㅘ', quantity: 1 },
    ],
    items: [M3_IDS.stone, M3_IDS.jahyeong, M3_IDS.letter],
  };
}

describe('M3 progression', () => {
  it('creates the approved checkpoint without Hwa inputs or pre-crafted output', () => {
    expect(createM3InventorySeed(sourceInventory())).toEqual({
      gold: 15,
      eum: [{ symbol: 'ㄱ', quantity: 3 }],
      items: [],
    });
  });

  it('enables and collects the supply cache exactly once', () => {
    const progress = createM3Progress();
    const inventory = createM3InventorySeed(sourceInventory());
    enableM3SupplyCache(progress);

    expect(getM3Stage(progress, inventory)).toBe('collect_cache');
    expect(applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache')).toMatchObject({ accepted: true });
    expect(inventory).toMatchObject({
      eum: expect.arrayContaining([
        { symbol: 'ㅎ', quantity: 1 },
        { symbol: 'ㅘ', quantity: 1 },
      ]),
      items: [M3_IDS.stone],
    });
    expect(applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache')).toMatchObject({
      accepted: false,
      message: '각인 보급함은 이미 회수했습니다.',
    });
  });

  it('consumes the two approved recipes once and records their outputs', () => {
    const progress = createM3Progress();
    const inventory = createM3InventorySeed(sourceInventory());
    inventory.gold = 20;
    enableM3SupplyCache(progress);
    applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache');

    expect(applyM3Action(progress, inventory, 'in_fire_001', 'craft_m3_jahyeong_hwa')).toMatchObject({ accepted: true });
    expect(inventory.eum.some(({ symbol }) => symbol === 'ㅎ' || symbol === 'ㅘ')).toBe(false);
    expect(inventory.items).toContain(M3_IDS.jahyeong);

    expect(applyM3Action(progress, inventory, 'in_fire_001', 'inscribe_m3_letter_hwa')).toMatchObject({ accepted: true });
    expect(inventory).toMatchObject({ gold: 0, items: [M3_IDS.letter] });
    expect(progress.inscriptionSequence).toBe(1);
  });

  it('requires the equipped current Gyeol and matching In before transformation can toggle', () => {
    const progress = createM3Progress();
    const inventory: PlayerInventory = { gold: 20, eum: [], items: [M3_IDS.letter] };

    expect(applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation')).toMatchObject({ accepted: false });
    expect(applyM3Action(progress, inventory, 'in_fire_001', 'equip_m3_letter_hwa')).toMatchObject({ accepted: true });
    expect(applyM3Action(progress, inventory, 'in_water_001', 'toggle_m3_transformation')).toMatchObject({ accepted: false });
    expect(applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation')).toMatchObject({ accepted: true });
    expect(progress.transformed).toBe(true);
    expect(applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation')).toMatchObject({ accepted: true });
    expect(progress.transformed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test to verify the missing-module failure**

Run:

```bash
cd client && npx vitest run src/game/sim/__tests__/m3-progression.test.ts
```

Expected: FAIL because `../m3-progression` does not exist.

- [ ] **Step 3: Implement the framework-free progression module**

Create `client/src/game/sim/m3-progression.ts`. Use the two existing recipe IDs; never duplicate recipe quantities in UI or scene code.

```ts
import craftingRecipes from '../data/crafting-recipes.json';
import type { CraftingRecipe, PlayerInventory } from '../types/data';

export const M3_IDS = {
  hwaInitial: 'ㅎ',
  hwaMedial: 'ㅘ',
  stone: 'stone_inscribe_mantra_001',
  jahyeong: 'jahyeong_hwa_001',
  letter: 'letter_gyeol_hwa_001',
  fireIn: 'in_fire_001',
  jahyeongRecipe: 'recipe_jahyeong_hwa_001',
  letterRecipe: 'recipe_letter_hwa_001',
} as const;

export const M3_ACTIONS = [
  'collect_m3_supply_cache',
  'craft_m3_jahyeong_hwa',
  'inscribe_m3_letter_hwa',
  'equip_m3_letter_hwa',
  'toggle_m3_transformation',
] as const;
export type M3Action = (typeof M3_ACTIONS)[number];
export type M3Stage =
  | 'defeat_slime'
  | 'collect_cache'
  | 'craft_jahyeong'
  | 'inscribe_letter'
  | 'equip_letter'
  | 'transform'
  | 'transformed';

export interface M3Progress {
  cacheAvailable: boolean;
  cacheCollected: boolean;
  currentGyeolId: string | null;
  transformed: boolean;
  statusMessage: string;
  acquisitionSequence: number;
  inscriptionSequence: number;
  equipSequence: number;
  transformationSequence: number;
}

export interface M3ActionResult {
  accepted: boolean;
  message: string;
}

const recipes = craftingRecipes as CraftingRecipe[];
const resetItemIds = new Set<string>([M3_IDS.stone, M3_IDS.jahyeong, M3_IDS.letter]);

function recipe(id: string): CraftingRecipe {
  const found = recipes.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing M3 crafting recipe: ${id}`);
  return found;
}

function eumQuantity(inventory: PlayerInventory, symbol: string): number {
  return inventory.eum.find((stack) => stack.symbol === symbol)?.quantity ?? 0;
}

function addEum(inventory: PlayerInventory, symbol: string, quantity: number): void {
  const stack = inventory.eum.find((entry) => entry.symbol === symbol);
  if (stack) stack.quantity += quantity;
  else inventory.eum.push({ symbol, quantity });
}

function removeEum(inventory: PlayerInventory, symbol: string, quantity: number): void {
  const index = inventory.eum.findIndex((entry) => entry.symbol === symbol);
  if (index < 0 || inventory.eum[index].quantity < quantity) throw new Error(`Missing M3 음: ${symbol}`);
  inventory.eum[index].quantity -= quantity;
  if (inventory.eum[index].quantity === 0) inventory.eum.splice(index, 1);
}

function removeItem(inventory: PlayerInventory, id: string): void {
  const index = inventory.items.indexOf(id);
  if (index < 0) throw new Error(`Missing M3 item: ${id}`);
  inventory.items.splice(index, 1);
}

function canCraft(inventory: PlayerInventory, entry: CraftingRecipe): boolean {
  const goldInputs = entry.inputs
    .filter((input) => input.kind === 'GOLD')
    .reduce((sum, input) => sum + input.quantity, 0);
  if (inventory.gold < entry.goldCost + goldInputs) return false;
  return entry.inputs.every((input) =>
    input.kind === 'EUM'
      ? !!input.symbol && eumQuantity(inventory, input.symbol) >= input.quantity
      : input.kind === 'ITEM'
        ? !!input.id && inventory.items.filter((id) => id === input.id).length >= input.quantity
        : inventory.gold >= input.quantity,
  ) && entry.catalystItemIds.every((id) => inventory.items.includes(id));
}

function craft(inventory: PlayerInventory, entry: CraftingRecipe): boolean {
  if (!canCraft(inventory, entry)) return false;
  for (const input of entry.inputs) {
    if (input.kind === 'EUM') removeEum(inventory, input.symbol!, input.quantity);
    if (input.kind === 'ITEM') for (let count = 0; count < input.quantity; count += 1) removeItem(inventory, input.id!);
    if (input.kind === 'GOLD') inventory.gold -= input.quantity;
  }
  for (const id of entry.catalystItemIds) removeItem(inventory, id);
  inventory.gold -= entry.goldCost;
  inventory.items.push(entry.successOutputId);
  return true;
}

function result(progress: M3Progress, accepted: boolean, message: string): M3ActionResult {
  progress.statusMessage = message;
  return { accepted, message };
}

export function createM3InventorySeed(source: PlayerInventory): PlayerInventory {
  return {
    gold: 15,
    eum: source.eum
      .filter(({ symbol }) => symbol !== M3_IDS.hwaInitial && symbol !== M3_IDS.hwaMedial)
      .map((stack) => ({ ...stack })),
    items: source.items.filter((id) => !resetItemIds.has(id)),
  };
}

export function createM3Progress(): M3Progress {
  return {
    cacheAvailable: false,
    cacheCollected: false,
    currentGyeolId: null,
    transformed: false,
    statusMessage: '먹물 슬라임을 처치해 보급함을 깨우세요.',
    acquisitionSequence: 0,
    inscriptionSequence: 0,
    equipSequence: 0,
    transformationSequence: 0,
  };
}

export function enableM3SupplyCache(progress: M3Progress): void {
  if (progress.cacheAvailable || progress.cacheCollected) return;
  progress.cacheAvailable = true;
  progress.statusMessage = '각인 보급함이 깨어났습니다.';
}

export function isM3Action(intent: { type: string }): intent is { type: M3Action } {
  return (M3_ACTIONS as readonly string[]).includes(intent.type);
}

export function getM3Stage(progress: M3Progress, inventory: PlayerInventory): M3Stage {
  if (!progress.cacheAvailable) return 'defeat_slime';
  if (!progress.cacheCollected) return 'collect_cache';
  if (progress.currentGyeolId === M3_IDS.letter) return progress.transformed ? 'transformed' : 'transform';
  if (inventory.items.includes(M3_IDS.letter)) return 'equip_letter';
  if (inventory.items.includes(M3_IDS.jahyeong)) return 'inscribe_letter';
  return 'craft_jahyeong';
}

export function applyM3Action(
  progress: M3Progress,
  inventory: PlayerInventory,
  equippedInId: string,
  action: M3Action,
): M3ActionResult {
  if (action === 'collect_m3_supply_cache') {
    if (progress.cacheCollected) return result(progress, false, '각인 보급함은 이미 회수했습니다.');
    if (!progress.cacheAvailable) return result(progress, false, '먼저 먹물 슬라임을 처치하세요.');
    addEum(inventory, M3_IDS.hwaInitial, 1);
    addEum(inventory, M3_IDS.hwaMedial, 1);
    inventory.items.push(M3_IDS.stone);
    progress.cacheCollected = true;
    progress.acquisitionSequence += 1;
    return result(progress, true, '음 · ㅎ, 음 · ㅘ, 돌: 새김을 획득했습니다.');
  }

  if (action === 'craft_m3_jahyeong_hwa') {
    if (!craft(inventory, recipe(M3_IDS.jahyeongRecipe))) return result(progress, false, '자형: 화 재료가 부족합니다.');
    return result(progress, true, '자형: 화를 조합했습니다.');
  }

  if (action === 'inscribe_m3_letter_hwa') {
    if (!craft(inventory, recipe(M3_IDS.letterRecipe))) return result(progress, false, '결: 화 각인 재료가 부족합니다.');
    progress.inscriptionSequence += 1;
    return result(progress, true, '결: 화가 점화되었습니다.');
  }

  if (action === 'equip_m3_letter_hwa') {
    if (!inventory.items.includes(M3_IDS.letter)) return result(progress, false, '결: 화를 먼저 각인하세요.');
    removeItem(inventory, M3_IDS.letter);
    progress.currentGyeolId = M3_IDS.letter;
    progress.equipSequence += 1;
    return result(progress, true, '결: 화를 현재 결에 장착했습니다.');
  }

  if (progress.currentGyeolId !== M3_IDS.letter || equippedInId !== M3_IDS.fireIn) {
    return result(progress, false, '현재 결과 인: 움결 화를 먼저 준비하세요.');
  }
  progress.transformed = !progress.transformed;
  if (progress.transformed) progress.transformationSequence += 1;
  return result(progress, true, progress.transformed ? '화 변신이 활성화되었습니다.' : '변신을 해제했습니다.');
}
```

- [ ] **Step 4: Run focused rules tests and static checking**

Run:

```bash
cd client && npx vitest run src/game/sim/__tests__/m3-progression.test.ts && npm run check
```

Expected: all four M3 progression tests PASS; Svelte/TypeScript reports 0 errors and 0 warnings.

- [ ] **Step 5: Commit the isolated progression core**

```bash
git add client/src/game/sim/m3-progression.ts client/src/game/sim/__tests__/m3-progression.test.ts
git commit -m "feat: add M3 progression core"
```

---

### Task 2: Integrate the M3 rules into the fixed-step world

**Files:**
- Modify: `client/src/game/sim/world.ts`
- Modify: `client/src/game/sim/__tests__/world.test.ts`

**Interfaces:**
- Consumes: Task 1's M3 module and the current normal monster reward path.
- Produces: `WorldState.m3`, M3 `GameIntent` variants, and `tick()`-owned application of every M3 action.

- [ ] **Step 1: Write a failing world-integration test**

Add this test to `client/src/game/sim/__tests__/world.test.ts` after the existing reward tests. Import `M3_IDS` from `../m3-progression`.

```ts
it('preserves the first slime reward while enabling the one-time M3 supply cache', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;
  monster.pos = { x: 1, z: 0 };
  monster.hp = 1;

  startCombat(w);
  tick(w, 0.32);

  expect(w.inventory.gold).toBe(20);
  expect(w.inventory.eum).toContainEqual({ symbol: 'ㄱ', quantity: 4 });
  expect(w.m3).toMatchObject({ cacheAvailable: true, cacheCollected: false });

  enqueueIntent(w, { type: 'collect_m3_supply_cache' });
  tick(w, 1 / 60);
  expect(w.inventory.eum).toEqual(expect.arrayContaining([
    { symbol: 'ㅎ', quantity: 1 },
    { symbol: 'ㅘ', quantity: 1 },
  ]));
  expect(w.inventory.items).toContain(M3_IDS.stone);
});
```

- [ ] **Step 2: Run the focused world test to verify the missing M3 state failure**

Run:

```bash
cd client && npx vitest run src/game/sim/__tests__/world.test.ts
```

Expected: FAIL because `WorldState` has no `m3` field and `collect_m3_supply_cache` is not a valid intent.

- [ ] **Step 3: Wire the world to the M3 module without altering combat calculations**

In `client/src/game/sim/world.ts`, add this import beside the other simulation imports:

```ts
import {
  applyM3Action,
  createM3InventorySeed,
  createM3Progress,
  enableM3SupplyCache,
  isM3Action,
  type M3Progress,
} from './m3-progression';
```

Extend the intent and state interfaces exactly as follows:

```ts
export type GameIntent =
  | { type: 'move_to_ground'; point: Vec2 }
  | { type: 'select_target'; monsterId: string }
  | { type: 'toggle_auto_attack' }
  | { type: 'enable_auto_attack' }
  | { type: 'collect_m3_supply_cache' }
  | { type: 'craft_m3_jahyeong_hwa' }
  | { type: 'inscribe_m3_letter_hwa' }
  | { type: 'equip_m3_letter_hwa' }
  | { type: 'toggle_m3_transformation' };

export interface WorldState {
  content: RuntimeCombatContent;
  respawnMs: number;
  player: PlayerState;
  monsters: Map<string, MonsterState>;
  inventory: PlayerInventory;
  m3: M3Progress;
  pendingIntents: GameIntent[];
  random: RandomSource;
}
```

In `createWorld()`, construct the seed once and store the new progress state. Do not modify `player.json`; it remains the runtime-content contract fixture.

```ts
const inventory = createM3InventorySeed(player.inventory);

return {
  content,
  respawnMs: options.respawnMs ?? DEFAULT_RESPAWN_MS,
  player: createPlayerState({ hp: content.player.hp.current, maxHp: content.player.hp.max }),
  monsters,
  inventory,
  m3: createM3Progress(),
  pendingIntents: [],
  random: options.random ?? mathRandom,
};
```

Append this branch to `drainIntents()` after the existing auto-attack branches. The type guard keeps the M3 module independent of `world.ts`.

```ts
    } else if (isM3Action(intent)) {
      applyM3Action(w.m3, w.inventory, w.content.player.equipped.inId, intent.type);
    }
```

Finally, retain the existing reward call in `processHit()` and invoke the idempotent cache unlock immediately after it:

```ts
  killMonster(target, w.respawnMs);
  applyRewards(w.inventory, rollCombatRewards(monster.drops, w.random));
  enableM3SupplyCache(w.m3);
  target.deathProcessed = true;
  stopCombat(w.player);
```

The `enableM3SupplyCache()` call must be after reward application so the HUD sees the normal reward and next objective together. It must not change `rollCombatRewards()`, `applyRewards()`, or attack/AI code.

- [ ] **Step 4: Run regression and focused world verification**

Run:

```bash
cd client && npx vitest run src/game/sim/__tests__/m3-progression.test.ts src/game/sim/__tests__/world.test.ts && npm run check
```

Expected: all focused M3 and world tests PASS; all existing M2/M2.5 tests in `world.test.ts` remain green; 0 check errors and warnings.

- [ ] **Step 5: Commit world integration**

```bash
git add client/src/game/sim/world.ts client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: wire M3 progression into world"
```

---

### Task 3: Publish M3 HUD state and render the single progression panel

**Files:**
- Create: `client/src/ui/M3ProgressPanel.svelte`
- Create: `client/src/ui/__tests__/m3-progress-style-contract.test.ts`
- Modify: `client/src/ui/hud-model.ts`
- Modify: `client/src/ui/__tests__/hud-model.test.ts`
- Modify: `client/src/ui/Hud.svelte`
- Modify: `client/src/App.svelte`
- Modify: `client/src/scene/GameScene.svelte`

**Interfaces:**
- Consumes: `WorldState.m3`, Task 1's `M3Action`/`M3Stage`, existing HUD snapshot publication, and existing CSS variables.
- Produces: `HudSnapshot.m3`, `<M3ProgressPanel snapshot onAction>`, the player HUD's current-Gyeol label, and `GameScene.requestM3Action(action)` for the sibling DOM HUD.

- [ ] **Step 1: Write failing HUD model and source-contract tests**

First extend `client/src/ui/__tests__/hud-model.test.ts` with this test and import `M3_IDS` plus `applyM3Action`/`enableM3SupplyCache` from the M3 module:

```ts
it('publishes M3 stage, requirements, current Gyeol, and transformed state', () => {
  const world = createWorld();
  enableM3SupplyCache(world.m3);
  applyM3Action(world.m3, world.inventory, 'in_fire_001', 'collect_m3_supply_cache');
  world.inventory.gold = 20;
  applyM3Action(world.m3, world.inventory, 'in_fire_001', 'craft_m3_jahyeong_hwa');
  applyM3Action(world.m3, world.inventory, 'in_fire_001', 'inscribe_m3_letter_hwa');
  applyM3Action(world.m3, world.inventory, 'in_fire_001', 'equip_m3_letter_hwa');
  applyM3Action(world.m3, world.inventory, 'in_fire_001', 'toggle_m3_transformation');

  const snapshot = createHudSnapshot(world);
  expect(snapshot.m3).toMatchObject({
    stage: 'transformed',
    hwaInitial: 0,
    hwaMedial: 0,
    stone: 0,
    currentGyeolId: M3_IDS.letter,
    transformed: true,
  });
  expect(hudSnapshotsEqual(snapshot, { ...snapshot, m3: { ...snapshot.m3, statusMessage: 'changed' } })).toBe(false);
});
```

Create `client/src/ui/__tests__/m3-progress-style-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import panelSource from '../M3ProgressPanel.svelte?raw';

describe('M3 progression panel style contract', () => {
  it('uses the approved panel, fire, and motion tokens without blocking the game overlay', () => {
    expect(panelSource).toContain('pointer-events: auto;');
    expect(panelSource).toContain('var(--rd-fire-gyeol)');
    expect(panelSource).toContain('var(--rd-motion-transformation)');
    expect(panelSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('stacks above the resource panel on narrow screens and preserves keyboard controls', () => {
    expect(panelSource).toContain('@media (max-width: 720px)');
    expect(panelSource).toContain('bottom: 176px;');
    expect(panelSource).toMatch(/<button[\s\S]*onAction\(action\)/);
  });
});
```

- [ ] **Step 2: Run focused UI tests to verify the missing state and panel failures**

Run:

```bash
cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/ui/__tests__/m3-progress-style-contract.test.ts
```

Expected: FAIL because `HudSnapshot` has no `m3` property and `M3ProgressPanel.svelte` does not exist.

- [ ] **Step 3: Extend the snapshot boundary with visible M3 data**

In `client/src/ui/hud-model.ts`, import `getM3Stage`, `M3_IDS`, and `M3Stage`, then add this public shape:

```ts
export interface M3HudSnapshot {
  stage: M3Stage;
  statusMessage: string;
  gold: number;
  hwaInitial: number;
  hwaMedial: number;
  stone: number;
  jahyeongOwned: boolean;
  letterOwned: boolean;
  currentGyeolId: string | null;
  transformed: boolean;
  acquisitionSequence: number;
  inscriptionSequence: number;
  equipSequence: number;
  transformationSequence: number;
}
```

Add `m3: M3HudSnapshot` to `HudSnapshot`. Use local helpers that count an 음 stack and an item ID, then return the following M3 object from `createHudSnapshot()`:

```ts
    m3: {
      stage: getM3Stage(world.m3, world.inventory),
      statusMessage: world.m3.statusMessage,
      gold: world.inventory.gold,
      hwaInitial: world.inventory.eum.find(({ symbol }) => symbol === M3_IDS.hwaInitial)?.quantity ?? 0,
      hwaMedial: world.inventory.eum.find(({ symbol }) => symbol === M3_IDS.hwaMedial)?.quantity ?? 0,
      stone: world.inventory.items.filter((id) => id === M3_IDS.stone).length,
      jahyeongOwned: world.inventory.items.includes(M3_IDS.jahyeong),
      letterOwned: world.inventory.items.includes(M3_IDS.letter),
      currentGyeolId: world.m3.currentGyeolId,
      transformed: world.m3.transformed,
      acquisitionSequence: world.m3.acquisitionSequence,
      inscriptionSequence: world.m3.inscriptionSequence,
      equipSequence: world.m3.equipSequence,
      transformationSequence: world.m3.transformationSequence,
    },
```

Add a dedicated `m3SnapshotsEqual()` helper and call it from `hudSnapshotsEqual()`. Compare every primitive property above; do not use object identity or JSON serialization.

Amend the existing full-object assertion in `copies and sorts visible inventory state without exposing positions` to include an `m3` object. At minimum it must assert the fresh stage and starting values below; preserve the test's existing sorted `eum` assertion.

```ts
m3: expect.objectContaining({
  stage: 'defeat_slime',
  gold: 15,
  hwaInitial: 0,
  hwaMedial: 0,
  stone: 0,
  currentGyeolId: null,
  transformed: false,
}),
```

- [ ] **Step 4: Create the panel and compose it into the HUD**

Create `client/src/ui/M3ProgressPanel.svelte` with a typed stage map. Keep every action name in the game-layer `M3Action` type and make scene-cache click plus button collection invoke the same `collect_m3_supply_cache` action.

```svelte
<script lang="ts">
  import type { M3Action } from '../game/sim/m3-progression';
  import type { M3HudSnapshot } from './hud-model';

  let { snapshot, onAction }: { snapshot: M3HudSnapshot; onAction: (action: M3Action) => void } = $props();

  const steps = {
    defeat_slime: { title: '첫 전투', detail: '먹물 슬라임을 처치해 보급함을 깨우세요.', action: null },
    collect_cache: { title: '각인 보급함', detail: '깨어난 보급함에서 첫 각인 재료를 회수하세요.', action: 'collect_m3_supply_cache' },
    craft_jahyeong: { title: '자형 조합', detail: '음 · ㅎ과 음 · ㅘ을 조합하세요.', action: 'craft_m3_jahyeong_hwa' },
    inscribe_letter: { title: '결 각인', detail: '자형: 화에 의미를 새기세요.', action: 'inscribe_m3_letter_hwa' },
    equip_letter: { title: '현재 결', detail: '완성한 결: 화를 장착하세요.', action: 'equip_m3_letter_hwa' },
    transform: { title: '화 변신', detail: '현재 결과 인의 힘을 전투폼으로 드러내세요.', action: 'toggle_m3_transformation' },
    transformed: { title: '화 변신 활성', detail: '임시 전투폼의 오라와 무기광이 강화되었습니다.', action: 'toggle_m3_transformation' },
  } as const;

  function actionLabel(action: M3Action | null): string | null {
    return action === 'collect_m3_supply_cache' ? '보급함 회수'
      : action === 'craft_m3_jahyeong_hwa' ? '자형: 화 조합'
      : action === 'inscribe_m3_letter_hwa' ? '결: 화 각인'
      : action === 'equip_m3_letter_hwa' ? '현재 결에 장착'
      : snapshot.transformed ? '변신 해제' : '화 변신';
  }
</script>

<section class="m3-progress-panel" aria-label="M3 첫 각인 진행">
  {#key snapshot.inscriptionSequence}
    {#if snapshot.inscriptionSequence > 0}<div class="inscription-flash" aria-hidden="true">印</div>{/if}
  {/key}
  {#key snapshot.acquisitionSequence}
    {#if snapshot.acquisitionSequence > 0}
      <div class="acquisition-chips" aria-hidden="true"><span>음 · ㅎ</span><span>음 · ㅘ</span><span>돌: 새김</span></div>
    {/if}
  {/key}
  {@const step = steps[snapshot.stage]}
  <span class="panel-kicker">M3 · 첫 각인</span>
  <h2>{step.title}</h2>
  <p>{step.detail}</p>
  <div class="requirements" aria-label="제작 재료">
    <span>음 · ㅎ {snapshot.hwaInitial}/1</span><span>음 · ㅘ {snapshot.hwaMedial}/1</span>
    <span>돌: 새김 {snapshot.stone}/1</span><span>골드 {snapshot.gold}/20</span>
  </div>
  {#if snapshot.currentGyeolId}<p class="current-gyeol">현재 결 · 화</p>{/if}
  <p class="status" aria-live="polite">{snapshot.statusMessage}</p>
  {@const action = step.action}
  {#if action}
    <button type="button" onclick={() => onAction(action)}>{actionLabel(action)}</button>
  {/if}
</section>
```

Append these component-scoped styles. They keep the game overlay transparent except for the active panel controls, use the existing tokens, and reserve a fixed mobile gap above the current resource panel.

```svelte
<style>
  .m3-progress-panel {
    box-sizing: border-box;
    position: absolute;
    z-index: 2;
    left: 50%;
    bottom: var(--rd-panel-inset);
    width: min(360px, calc(100vw - var(--rd-panel-mobile-gutter)));
    padding: var(--rd-panel-padding-block) var(--rd-panel-padding-inline);
    transform: translateX(-50%);
    pointer-events: auto;
    overflow: hidden;
    border: var(--rd-panel-border-width) solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-crystal-glow);
    border-radius: var(--rd-radius-sm);
    background: linear-gradient(135deg, rgb(24 35 40 / 96%), rgb(13 20 24 / 93%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 2px 0 var(--rd-crystal-glow);
  }
  .panel-kicker { display: block; color: var(--rd-muted-text); font: 600 var(--rd-type-label-size)/1.2 var(--rd-font-data); letter-spacing: 0.12em; }
  h2 { margin: var(--rd-space-xs) 0 0; font: 700 var(--rd-type-panel-title-size)/1.2 var(--rd-font-display); }
  p { margin: var(--rd-space-xs) 0 0; font-size: var(--rd-type-body-size); }
  .requirements { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--rd-space-xs); margin-top: var(--rd-space-sm); color: var(--rd-muted-text); font: 500 var(--rd-type-label-size)/1.2 var(--rd-font-data); }
  .current-gyeol { color: var(--rd-fire-gyeol); font-family: var(--rd-font-display); }
  .status { min-height: 1.2em; color: var(--rd-paper-text); }
  button { width: 100%; margin-top: var(--rd-space-sm); padding: var(--rd-space-sm); border: 1px solid color-mix(in srgb, var(--rd-fire-gyeol) 60%, transparent); border-radius: var(--rd-radius-sm); color: var(--rd-ink-950); background: var(--rd-fire-gyeol); font: 700 var(--rd-type-emphasized-size)/1.2 var(--rd-font-body); cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--rd-paper-text); outline-offset: 2px; }
  .acquisition-chips, .inscription-flash { position: absolute; pointer-events: none; }
  .acquisition-chips { top: var(--rd-space-sm); right: var(--rd-space-sm); display: flex; gap: var(--rd-space-xs); color: var(--rd-crystal-glow); font: 600 var(--rd-type-label-size)/1 var(--rd-font-data); animation: m3-acquire var(--rd-motion-short) ease-out both; }
  .inscription-flash { inset: 0; display: grid; place-items: center; color: var(--rd-seal-vermilion); font: 700 var(--rd-type-display-size)/1 var(--rd-font-display); animation: m3-inscribe var(--rd-motion-transformation) ease-out both; }
  @keyframes m3-acquire { to { transform: translate(24px, 48px); opacity: 0; } }
  @keyframes m3-inscribe { 0% { opacity: 0; transform: scale(0.72); } 20% { opacity: 1; } 100% { color: var(--rd-fire-gyeol); opacity: 0; transform: scale(1.28); } }
  @media (max-width: 720px) { .m3-progress-panel { bottom: 176px; } }
  @media (prefers-reduced-motion: reduce) { .acquisition-chips, .inscription-flash { animation: none; } }
</style>
```

In `client/src/ui/Hud.svelte`:

```svelte
<script lang="ts">
  import type { M3Action } from '../game/sim/m3-progression';
  import M3ProgressPanel from './M3ProgressPanel.svelte';
  import { playerHpFillRatio, type HudSnapshot } from './hud-model';
  let { snapshot, showDebug = false, onM3Action }: {
    snapshot: HudSnapshot | null;
    showDebug?: boolean;
    onM3Action: (action: M3Action) => void;
  } = $props();

  const modeLabel = {
    idle: '대기',
    moving: '이동',
    attacking: '공격',
  } as const;
</script>
```

Render `<M3ProgressPanel snapshot={snapshot.m3} onAction={onM3Action} />` within the existing `{#if snapshot}` block. In the player panel, render `<span class="current-gyeol-label">현재 결 · 화</span>` only when `snapshot.m3.currentGyeolId` is truthy. Add `pointer-events: auto` only to the M3 panel/button; do not make the full HUD intercept ground clicks.

In `GameScene.svelte`, export this narrow bridge after `world` is created:

```ts
import type { M3Action } from '../game/sim/m3-progression';

export function requestM3Action(action: M3Action): void {
  enqueueIntent(world, { type: action });
}
```

In `App.svelte`, bind that handle and pass it into the HUD without putting game state in Svelte:

```svelte
<script lang="ts">
  import type { M3Action } from './game/sim/m3-progression';
  let scene = $state<{ requestM3Action: (action: M3Action) => void }>();
</script>

<GameScene bind:this={scene} onHudChange={(snapshot) => (hud = snapshot)} />
<Hud snapshot={hud} showDebug={showDebugHud} onM3Action={(action) => scene?.requestM3Action(action)} />
```

- [ ] **Step 5: Add the 800ms shared motion token**

In `client/src/design/visual-theme.ts`, add `transformationMs: 800` next to `microMs` and `shortMs`, then add this CSS serialization entry:

```ts
['--rd-motion-transformation', `${theme.motion.transformationMs}ms`],
```

Extend `client/src/design/__tests__/visual-theme.test.ts` to assert both values:

```ts
expect(visualTheme.motion.transformationMs).toBe(800);
expect(variables).toContain('--rd-motion-transformation:800ms');
```

- [ ] **Step 6: Run the HUD/theme tests, typecheck, and build**

Run:

```bash
cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/ui/__tests__/m3-progress-style-contract.test.ts src/design/__tests__/visual-theme.test.ts && npm run check && npm run build
```

Expected: all focused tests PASS, Svelte/TypeScript reports 0 errors and 0 warnings, and Vite build succeeds with only its existing non-blocking bundle-size notice if emitted.

- [ ] **Step 7: Commit the M3 panel and snapshot boundary**

```bash
git add client/src/ui client/src/App.svelte client/src/scene/GameScene.svelte client/src/design
git commit -m "feat: add M3 progression HUD"
```

---

### Task 4: Render the one-time cache and temporary transformation feedback

**Files:**
- Create: `client/src/scene/M3SupplyCache.svelte`
- Create: `client/src/scene/__tests__/m3-scene-contract.test.ts`
- Modify: `client/src/scene/GameScene.svelte`
- Modify: `client/src/scene/PlayerLayer.svelte`
- Modify: `client/src/scene/visual-state.ts`
- Modify: `client/src/scene/__tests__/visual-state.test.ts`

**Interfaces:**
- Consumes: `WorldState.m3`, Task 3's `requestM3Action()`, shared visual tokens, and the existing imperative scene update pattern.
- Produces: `M3SupplyCache.update(visible, nowMs)`, `transformationProgress()`, and `PlayerLayer.update(nowMs, transformed, transformationSequence)`.

- [ ] **Step 1: Write failing visual and scene-boundary tests**

Add these tests to `client/src/scene/__tests__/visual-state.test.ts`:

```ts
import { transformationProgress } from '../visual-state';

it('reaches full transformation at the approved 800ms duration', () => {
  expect(transformationProgress(1_000, 1_000, false)).toBe(0);
  expect(transformationProgress(1_400, 1_000, false)).toBe(0.5);
  expect(transformationProgress(1_800, 1_000, false)).toBe(1);
});

it('uses the finished transformation state without motion when reduced', () => {
  expect(transformationProgress(1_000, 1_000, true)).toBe(1);
  expect(transformationProgress(1_000, null, true)).toBe(0);
});
```

Create `client/src/scene/__tests__/m3-scene-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import cacheSource from '../M3SupplyCache.svelte?raw';
import sceneSource from '../GameScene.svelte?raw';
import playerSource from '../PlayerLayer.svelte?raw';

describe('M3 scene contract', () => {
  it('forwards the one-time cache through the existing imperative update loop', () => {
    expect(cacheSource).toContain("onCollect('collect_m3_supply_cache')");
    expect(cacheSource).toContain('export function update(visible: boolean, nowMs: number): void');
    expect(sceneSource).toContain('supplyCache?.update(world.m3.cacheAvailable && !world.m3.cacheCollected, now);');
  });

  it('keeps transformation to an aura and weapon-light treatment on temporary geometry', () => {
    expect(playerSource).toContain('Primitive geometry remains an explicitly temporary silhouette.');
    expect(playerSource).toContain('transformed: boolean');
    expect(playerSource).toContain('visualTheme.colors.fireGyeol');
    expect(playerSource).toContain('transformationProgress');
  });
});
```

- [ ] **Step 2: Run the focused scene tests to verify they fail**

Run:

```bash
cd client && npx vitest run src/scene/__tests__/visual-state.test.ts src/scene/__tests__/m3-scene-contract.test.ts
```

Expected: FAIL because `transformationProgress` and `M3SupplyCache.svelte` do not exist.

- [ ] **Step 3: Add the pure transformation timing calculation**

Append this export to `client/src/scene/visual-state.ts`:

```ts
export function transformationProgress(
  nowMs: number,
  startedAtMs: number | null,
  reducedMotion: boolean,
): number {
  if (startedAtMs === null) return 0;
  if (reducedMotion) return 1;
  return Math.min(1, Math.max(0, (nowMs - startedAtMs) / visualTheme.motion.transformationMs));
}
```

- [ ] **Step 4: Create the imperative cache mesh**

Create `client/src/scene/M3SupplyCache.svelte`. It starts hidden, never owns gameplay state, and calls the same action string as the accessible panel button.

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import type { Group, MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { M3Action } from '../game/sim/m3-progression';
  import { glowPulse } from './visual-state';

  let { onCollect }: { onCollect: (action: M3Action) => void } = $props();
  let group = $state<Group>();
  let coreMaterial = $state<MeshStandardMaterial>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(visible: boolean, nowMs: number): void {
    if (!group) return;
    group.visible = visible;
    if (coreMaterial) coreMaterial.emissiveIntensity = glowPulse(nowMs, reducedMotion) + 0.16;
  }
</script>

<!-- M3-only functional cache, not final prop art. -->
<T.Group bind:ref={group} position={[-1.8, 0, -1.4]} visible={false}>
  <T.Mesh
    position.y={0.3}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      event.stopPropagation();
      onCollect('collect_m3_supply_cache');
    }}
  >
    <T.BoxGeometry args={[0.68, 0.56, 0.68]} />
    <T.MeshStandardMaterial color={visualTheme.colors.metalSurface} metalness={0.66} roughness={0.34} />
  </T.Mesh>
  <T.Mesh position={[0, 0.68, 0]} scale={[0.2, 0.3, 0.2]}>
    <T.OctahedronGeometry args={[0.5, 0]} />
    <T.MeshStandardMaterial bind:ref={coreMaterial} color={visualTheme.colors.crystalGlow} emissive={visualTheme.colors.crystalGlow} emissiveIntensity={0.51} />
  </T.Mesh>
</T.Group>
```

- [ ] **Step 5: Wire cache visibility and transformation visuals through `GameScene` and `PlayerLayer`**

In `GameScene.svelte`, import and render `M3SupplyCache`. Add `supplyCache` and replace the existing one-argument `playerLayer` declaration with these imperative handles:

```ts
import M3SupplyCache from './M3SupplyCache.svelte';

let supplyCache = $state<{ update: (visible: boolean, nowMs: number) => void }>();
let playerLayer = $state<{
  update: (nowMs: number, transformed: boolean, transformationSequence: number) => void;
}>();
```

Inside the existing frame loop, after simulation ticks and before `advance()`, replace the player update and add the cache update:

```ts
playerLayer?.update(now, world.m3.transformed, world.m3.transformationSequence);
monsterLayer?.update(now);
supplyCache?.update(world.m3.cacheAvailable && !world.m3.cacheCollected, now);
```

Render the cache next to the existing scene layers:

```svelte
<M3SupplyCache bind:this={supplyCache} onCollect={requestM3Action} />
```

In `PlayerLayer.svelte`, change the Three import and visual-state import, add the shown aura state, and change the update signature to:

```ts
export function update(nowMs: number, transformed: boolean, transformationSequence: number): void
```

```ts
import { BackSide, Color, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { glowPulse, transformationProgress, transientPulse } from './visual-state';

let aura = $state<Mesh>();
let auraMaterial = $state<MeshBasicMaterial>();
let previousTransformationSequence = 0;
let transformationStartedAtMs: number | null = null;
```

Inside `update()`, keep the existing attack/damage detection and insert this sequence detection before assigning material values. The surrounding function continues to position the group and update the existing combat feedback exactly as it does today.

```ts
if (transformationSequence > previousTransformationSequence) transformationStartedAtMs = nowMs;
const transformation = transformationProgress(nowMs, transformationStartedAtMs, reducedMotion);
const fireIntensity = transformed ? 0.38 + transformation * 0.52 : 0;
if (weaponMaterial) {
  weaponMaterial.emissive.set(transformed ? visualTheme.colors.fireGyeol : visualTheme.colors.crystalGlow);
  weaponMaterial.emissiveIntensity = (transformed ? fireIntensity : 0.04) + attackPulse * 0.9;
}
if (aura) {
  aura.visible = transformed;
  aura.scale.setScalar(1 + transformation * 0.22);
}
if (auraMaterial) {
  auraMaterial.color.set(visualTheme.colors.fireGyeol);
  auraMaterial.opacity = transformed ? 0.2 + transformation * 0.25 : 0;
}
previousTransformationSequence = transformationSequence;
```

Add this thin horizontal torus before the existing player placeholder meshes. It supplements the capsule silhouette and must not introduce body, face, armor, or weapon geometry.

```svelte
<T.Mesh bind:ref={aura} position.y={0.06} rotation.x={Math.PI / 2} visible={false}>
  <T.TorusGeometry args={[0.84, 0.025, 8, 32]} />
  <T.MeshBasicMaterial
    bind:ref={auraMaterial}
    color={visualTheme.colors.fireGyeol}
    transparent
    opacity={0}
    depthWrite={false}
  />
</T.Mesh>
```

Keep the existing comment `Primitive geometry remains an explicitly temporary silhouette.` immediately above the player mesh.

- [ ] **Step 6: Run scene tests, full client checks, and build**

Run:

```bash
cd client && npx vitest run src/scene/__tests__/visual-state.test.ts src/scene/__tests__/m3-scene-contract.test.ts && npm run check && npm run build
```

Expected: focused scene tests PASS; 0 Svelte/TypeScript errors and warnings; production build succeeds with no new blocking diagnostics.

- [ ] **Step 7: Commit M3 scene feedback**

```bash
git add client/src/scene client/src/design/visual-theme.ts client/src/design/__tests__/visual-theme.test.ts
git commit -m "feat: render M3 cache and fire transformation"
```

---

### Task 5: Complete regression verification and record the completed checkpoint

**Files:**
- Modify: `client/README.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: Tasks 1–4 and existing validation commands.
- Produces: verified M3 milestone documentation only after every required automated and browser check passes.

- [ ] **Step 1: Run the entire automated suite before documentation is updated**

Run:

```bash
cd client && npx vitest run && npm run check && npm run build
cd .. && node scripts/validate-runtime-data.mjs
```

Expected: all existing and M3 Vitest cases PASS; Svelte/TypeScript reports 0 errors and 0 warnings; production build PASS; runtime data validation PASS. Treat the known Vite bundle-size note as non-blocking only if it remains informational and the build exit code is zero.

- [ ] **Step 2: Perform browser regression QA at both required viewports**

Start the local client:

```bash
cd client && npm run dev -- --host 127.0.0.1
```

At 1280×720, verify and capture evidence for each ordered state:

1. Fresh seed: gold is `15`, `결: 화` is not pre-owned, and the progression panel tells the player to defeat a slime.
2. First normal slime kill: existing gold/음 reward appears, counterattack behavior is unchanged, and the crystal cache becomes visible.
3. Cache: in separate fresh sessions, verify that both one scene click and the equivalent keyboard-focusable `보급함 회수` button produce the specified materials once; in either session, a second attempt reports the already-collected state without changing inventory.
4. Craft: `자형: 화`, then `결: 화`, consume exactly the displayed materials and show the seal/ink/fire feedback.
5. Equip: `현재 결 · 화` appears in both M3 and player HUD locations.
6. Transformation: fire aura/weapon light appears without changing player damage or monster behavior; `변신 해제` restores normal presentation.
7. Regression: target selection, auto attack, target/player damage feedback, reward, and respawn still work. Confirm default HUD hides debug information and `?debugHud` still reveals it.

At 390×844, repeat the complete M3 loop enough to verify that the player and target panels stay clear, resource panel stays at bottom, M3 panel stays above it, every button can be tapped, and `document.documentElement.scrollWidth === innerWidth === 390`.

Emulate `prefers-reduced-motion: reduce` and confirm state changes remain readable while cache chip, inscription, and transformation motion do not animate. Confirm source copy and visual result do not portray placeholder geometry as final character art. A new-session favicon 404 remains non-blocking only if there are no application exceptions or test failures.

- [ ] **Step 3: Update the milestone documents after all verification passes**

In `client/README.md`, replace the M3 row with:

```markdown
| M3 | 수집 → 제작(`결: 화`) → 현재 결 장착 → 화 변신 on/off | **완료** (2026-08-03) |
```

In the `## 다음 구현 계획` section of `progress.md`, replace the M3 sentence with this completed checkpoint followed by the unchanged M4 direction:

```markdown
- M3 최소 기능 검증 완료(2026-08-03): 기존 먹물 슬라임 처치 뒤 1회용 `각인 보급함`에서 `음 · ㅎ`, `음 · ㅘ`, `돌: 새김`을 얻고, `자형: 화` → `결: 화`를 100% 제작해 `현재 결`에 장착한 뒤 `인: 움결 화`의 변신 on/off를 검증했다. 결 수치 효과와 최종 캐릭터 조형은 적용하지 않았고, 기존 전투·추적·반격·드랍·재스폰은 회귀 검증으로 보존했다.
- 다음은 M4 흑심 채굴장 씬 + 몽당연필 기사단장 + 첫 20분 연결이다.
```

- [ ] **Step 4: Re-run final checks after documentation changes**

Run:

```bash
git diff --check
cd client && npx vitest run && npm run check && npm run build
cd .. && node scripts/validate-runtime-data.mjs && git status --short --branch
```

Expected: no whitespace errors; all checks PASS; the only unrelated untracked file remains root `.DS_Store`; no push or tag is created.

- [ ] **Step 5: Commit the verified milestone documentation**

```bash
git add client/README.md progress.md
git commit -m "docs: record M3 POC completion"
```

---

## Self-Review Results

- **Spec coverage:** Task 1 implements the deterministic M3 seed, one-time supplier, exact recipes, equipment slot, blocked actions, and transformation gate. Task 2 places every mutation behind the existing intent/tick boundary and preserves reward/AI code. Task 3 implements the compact HUD, current-Gyeol label, text-based requirements, keyboard path, mobile stacking, and reduced motion. Task 4 implements only cache/fire presentation over the temporary geometry. Task 5 covers all automated and browser acceptance criteria plus documentation.
- **Placeholder scan:** The plan contains no unresolved decision markers. All cache coordinates, IDs, messages, action strings, recipes, timing values, commands, expected states, and commit boundaries are specified.
- **Type consistency:** `M3Action` is produced by `m3-progression.ts`, carried as a `GameIntent`, accepted by `GameScene.requestM3Action()`, and consumed by `M3ProgressPanel`. `M3Progress` is owned by `WorldState`, serialized as `M3HudSnapshot`, and read by the imperative cache/player layers without importing Svelte into `game/`.
- **Scope check:** M3 is one cohesive progression loop. Mine/elite/boss/map and general inventory systems stay deliberately outside this plan.
