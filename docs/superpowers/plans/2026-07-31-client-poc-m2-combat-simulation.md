# Client POC M2 Combat Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, client-only combat simulation in which a player selects an ink slime, auto-approaches, attacks on the configured cadence, receives gold and eum exactly once on kill, and can repeat the loop after respawn.

**Architecture:** Keep `WorldState` as the simulation owner and split unit conversion, monster lifecycle, damage, drops, and player transitions into focused pure TypeScript modules. Browser input and Threlte rendering continue to normalize actions into intents and remain outside the M2 core.

**Tech Stack:** Svelte 5, TypeScript 6, Vitest 4, Vite 8, Node.js 22.12+

## Global Constraints

- `game/` must not import Svelte, Three.js, or browser APIs.
- Use `LOGICAL_PX_TO_WORLD_UNIT = 0.1` for all fixture distance and speed conversion.
- Random behavior must use an injected `RandomSource`; tests must not patch `Math.random`.
- Monster death rewards must be processed exactly once per life.
- Ground movement cancels auto-attack and clears the combat target.
- Target death stops auto-attack; M2 does not automatically select another target.
- Monster attacks, player damage, critical hits, incantations, and item drops are deferred.
- Pin Node.js `22.12.0`; declare `>=22.12.0` in the client package.

---

## File Map

**Create**

- `.nvmrc`: repository Node version.
- `client/src/game/sim/random.ts`: random-source contract and helpers.
- `client/src/game/sim/runtime-content.ts`: logical-unit conversion and runtime combat definition.
- `client/src/game/sim/entities/monster.ts`: monster creation, death, and respawn lifecycle.
- `client/src/game/sim/combat/damage.ts`: physical damage calculation.
- `client/src/game/sim/combat/drops.ts`: deterministic gold/eum reward rolling.
- `client/src/game/sim/fsm/player-fsm.ts`: player modes and transition helpers.
- Matching `__tests__` files beside each module.

**Modify**

- `client/package.json` and `client/package-lock.json`: Node engine contract.
- `client/src/game/sim/world.ts`: world state, intents, fixed-step combat orchestration.
- `client/src/game/sim/__tests__/world.test.ts`: end-to-end pure simulation behavior.
- `progress.md`: remove stale source-control claims and replace the obsolete simultaneous client/server plan.
- `client/README.md`: mark the M2 core sub-milestone complete and record tuning constants.

---

### Task 1: Repository Runtime and Handoff Cleanup

**Files:**

- Create: `.nvmrc`
- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `progress.md:105,145-157,212-220`

**Interfaces:**

- Consumes: Vite 8 requirement for Node.js 20.19+ or 22.12+.
- Produces: repository runtime contract `22.12.0` and current POC handoff text.

- [ ] **Step 1: Add the Node version contract**

Create `.nvmrc`:

```text
22.12.0
```

Add to `client/package.json` after `"type": "module"`:

```json
"engines": {
  "node": ">=22.12.0"
},
```

- [ ] **Step 2: Regenerate the root lockfile metadata**

Run:

```bash
cd client
npm install --package-lock-only
```

Expected: `client/package-lock.json` root package contains:

```json
"engines": {
  "node": ">=22.12.0"
}
```

- [ ] **Step 3: Correct `progress.md`**

Make these exact semantic changes:

- Remove “현재 아직 커밋되지 않은 신규 문서” from the gap-checklist entry.
- Keep `클라 단독 POC 구현` as the top priority.
- Record that M2 pure combat simulation is the active task.
- Replace the final simultaneous client/Rust implementation plan with:

```markdown
## 다음 구현 계획
- 현재 최우선은 클라이언트 단독 POC다. Rust 서버와 WebSocket 전환은 M4 이후, 로컬 플레이 루프의 재미와 경계가 검증된 뒤 진행한다.
- M2는 순수 TypeScript 전투 시뮬레이션부터 구현한다: 플레이어 FSM, 먹물 슬라임 런타임 상태, 타깃 선택, 자동 접근·공격, 피해, 사망 1회 처리, 골드·음 드랍, 재스폰.
- M2.5에서 몬스터 추적·공격과 플레이어 피격을 붙인다. HUD와 3D 몬스터 표현은 순수 시뮬레이션 검증 뒤 연결한다.
- `client/src/game/data` fixture는 POC 동안 콘텐츠 입력으로 유지하고, 거리·속도는 런타임 어댑터에서 월드 단위로 변환한다.
- Node.js는 Vite 8 기준에 맞춰 저장소에서 `22.12.0`으로 고정한다.
```

- [ ] **Step 4: Verify configuration**

Run:

```bash
cd client
npm run check
```

Expected: exit 0 with `svelte-check found 0 errors and 0 warnings`.

- [ ] **Step 5: Commit**

```bash
git add .nvmrc client/package.json client/package-lock.json progress.md
git commit -m "chore: align POC handoff and Node runtime"
```

---

### Task 2: Deterministic Runtime Content and Monster Lifecycle

**Files:**

- Create: `client/src/game/sim/random.ts`
- Create: `client/src/game/sim/runtime-content.ts`
- Create: `client/src/game/sim/entities/monster.ts`
- Create: `client/src/game/sim/__tests__/runtime-content.test.ts`
- Create: `client/src/game/sim/entities/__tests__/monster.test.ts`

**Interfaces:**

- Consumes: `MonsterItem`, `WeaponItem`, `Vec2`.
- Produces: `RandomSource`, `randomInt`, `RuntimeCombatContent`, `MonsterState`, `createMonster`, `killMonster`, `tickMonsterRespawn`.

- [ ] **Step 1: Write failing runtime conversion tests**

Create `client/src/game/sim/__tests__/runtime-content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LOGICAL_PX_TO_WORLD_UNIT, toWorldDistance } from '../runtime-content';

describe('runtime content units', () => {
  it('converts every logical distance through one scale', () => {
    expect(LOGICAL_PX_TO_WORLD_UNIT).toBe(0.1);
    expect(toWorldDistance(56)).toBeCloseTo(5.6);
    expect(toWorldDistance(42)).toBeCloseTo(4.2);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/__tests__/runtime-content.test.ts
```

Expected: FAIL because `runtime-content` does not exist.

- [ ] **Step 3: Implement the conversion and random contracts**

Create `client/src/game/sim/random.ts`:

```ts
export interface RandomSource {
  next(): number;
}

export const mathRandom: RandomSource = { next: () => Math.random() };

export function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random.next() * (max - min + 1));
}
```

Create `client/src/game/sim/runtime-content.ts`:

```ts
import type { MonsterItem, PlayerData, WeaponItem } from '../types/data';

export const LOGICAL_PX_TO_WORLD_UNIT = 0.1;

export function toWorldDistance(logicalPx: number): number {
  return logicalPx * LOGICAL_PX_TO_WORLD_UNIT;
}

export interface RuntimeWeapon extends WeaponItem {
  range: number;
}

export interface RuntimeCombatContent {
  monster: MonsterItem;
  weapon: RuntimeWeapon;
  player: PlayerData;
}

export function createRuntimeCombatContent(
  monster: MonsterItem,
  weapon: WeaponItem,
  player: PlayerData,
): RuntimeCombatContent {
  return {
    monster,
    weapon: { ...weapon, range: toWorldDistance(weapon.rangePx) },
    player,
  };
}
```

- [ ] **Step 4: Run the conversion test and verify GREEN**

Run the command from Step 2.

Expected: 1 test passes.

- [ ] **Step 5: Write failing monster lifecycle tests**

Create `client/src/game/sim/entities/__tests__/monster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMonster, killMonster, tickMonsterRespawn } from '../monster';

const definition = { id: 'slime', maxHp: 140 };

describe('monster lifecycle', () => {
  it('creates a live monster at its spawn position', () => {
    const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
    expect(monster).toMatchObject({
      entityId: 'slime-1',
      definitionId: 'slime',
      hp: 140,
      alive: true,
      deathProcessed: false,
      pos: { x: 3, z: 4 },
    });
  });

  it('respawns a killed monster with full hp at its spawn', () => {
    const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
    killMonster(monster, 2_000);
    tickMonsterRespawn(monster, 1_999, definition.maxHp);
    expect(monster.alive).toBe(false);
    tickMonsterRespawn(monster, 1, definition.maxHp);
    expect(monster).toMatchObject({
      hp: 140,
      alive: true,
      deathProcessed: false,
      respawnRemainingMs: null,
      pos: { x: 3, z: 4 },
    });
  });
});
```

- [ ] **Step 6: Run monster tests and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/entities/__tests__/monster.test.ts
```

Expected: FAIL because `entities/monster` does not exist.

- [ ] **Step 7: Implement monster lifecycle**

Create `client/src/game/sim/entities/monster.ts`:

```ts
import type { Vec2 } from '../movement';

export interface MonsterDefinitionRef {
  id: string;
  maxHp: number;
}

export interface MonsterState {
  entityId: string;
  definitionId: string;
  spawnPos: Vec2;
  pos: Vec2;
  hp: number;
  alive: boolean;
  deathProcessed: boolean;
  respawnRemainingMs: number | null;
}

export function createMonster(
  entityId: string,
  definition: MonsterDefinitionRef,
  spawnPos: Vec2,
): MonsterState {
  return {
    entityId,
    definitionId: definition.id,
    spawnPos: { ...spawnPos },
    pos: { ...spawnPos },
    hp: definition.maxHp,
    alive: true,
    deathProcessed: false,
    respawnRemainingMs: null,
  };
}

export function killMonster(monster: MonsterState, respawnMs: number): void {
  monster.hp = 0;
  monster.alive = false;
  monster.respawnRemainingMs = respawnMs;
}

export function tickMonsterRespawn(
  monster: MonsterState,
  elapsedMs: number,
  maxHp: number,
): void {
  if (monster.alive || monster.respawnRemainingMs === null) return;
  monster.respawnRemainingMs = Math.max(0, monster.respawnRemainingMs - elapsedMs);
  if (monster.respawnRemainingMs > 0) return;
  monster.hp = maxHp;
  monster.alive = true;
  monster.deathProcessed = false;
  monster.respawnRemainingMs = null;
  monster.pos = { ...monster.spawnPos };
}
```

- [ ] **Step 8: Run Task 2 tests and commit**

Run:

```bash
cd client
npx vitest run src/game/sim/__tests__/runtime-content.test.ts src/game/sim/entities/__tests__/monster.test.ts
```

Expected: 3 tests pass.

Commit:

```bash
git add client/src/game/sim/random.ts client/src/game/sim/runtime-content.ts client/src/game/sim/entities
git add client/src/game/sim/__tests__/runtime-content.test.ts
git commit -m "feat: add combat runtime units and monster lifecycle"
```

---

### Task 3: Physical Damage Pipeline

**Files:**

- Create: `client/src/game/sim/combat/damage.ts`
- Create: `client/src/game/sim/combat/__tests__/damage.test.ts`

**Interfaces:**

- Consumes: `RandomSource`, weapon min/max damage, attack bonus, multiplier, target defense.
- Produces: `rollPhysicalDamage(input, random): number`.

- [ ] **Step 1: Write the failing damage tests**

```ts
import { describe, expect, it } from 'vitest';
import { rollPhysicalDamage } from '../damage';

describe('physical damage', () => {
  it('uses the configured weapon roll, bonus, multiplier, and defense', () => {
    const damage = rollPhysicalDamage(
      { minDamage: 12, maxDamage: 20, attackBonus: 12, damageMultiplier: 1.45, defense: 10 },
      { next: () => 0 },
    );
    expect(damage).toBe(31);
  });

  it('always deals at least one damage', () => {
    const damage = rollPhysicalDamage(
      { minDamage: 1, maxDamage: 1, attackBonus: 0, damageMultiplier: 1, defense: 999_999 },
      { next: () => 0 },
    );
    expect(damage).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/combat/__tests__/damage.test.ts
```

Expected: FAIL because `combat/damage` does not exist.

- [ ] **Step 3: Implement minimal physical damage**

```ts
import { randomInt, type RandomSource } from '../random';

export interface PhysicalDamageInput {
  minDamage: number;
  maxDamage: number;
  attackBonus: number;
  damageMultiplier: number;
  defense: number;
}

export function rollPhysicalDamage(input: PhysicalDamageInput, random: RandomSource): number {
  const weaponDamage = randomInt(random, input.minDamage, input.maxDamage);
  const rawDamage = (weaponDamage + input.attackBonus) * input.damageMultiplier;
  return Math.max(1, Math.floor((rawDamage * 100) / (100 + input.defense)));
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/game/sim/combat/damage.ts client/src/game/sim/combat/__tests__/damage.test.ts
git commit -m "feat: add deterministic physical damage"
```

---

### Task 4: Gold and Eum Drop Rolls

**Files:**

- Create: `client/src/game/sim/combat/drops.ts`
- Create: `client/src/game/sim/combat/__tests__/drops.test.ts`

**Interfaces:**

- Consumes: `DropTable`, `RandomSource`.
- Produces: `CombatRewards`, `rollCombatRewards(dropTable, random)`.

- [ ] **Step 1: Write failing deterministic drop tests**

```ts
import { describe, expect, it } from 'vitest';
import type { DropTable } from '../../../types/data';
import { rollCombatRewards } from '../drops';

const drops: DropTable = {
  entries: [
    { kind: 'GOLD', probability: 1, quantity: { min: 5, max: 10 }, guaranteed: true },
  ],
  eumRollGroup: {
    draws: { min: 1, max: 2 },
    allowDuplicateSymbols: false,
    entries: [
      { symbol: 'ㄱ', weight: 1, quantity: { min: 1, max: 1 } },
      { symbol: 'ㅏ', weight: 1, quantity: { min: 1, max: 1 } },
      { symbol: 'ㅇ', weight: 1, quantity: { min: 1, max: 1 } },
    ],
  },
};

function sequence(values: number[]) {
  let index = 0;
  return { next: () => values[index++] ?? 0 };
}

describe('combat rewards', () => {
  it('rolls guaranteed gold and non-duplicate eum deterministically', () => {
    const rewards = rollCombatRewards(drops, sequence([0, 0.99, 0, 0]));
    expect(rewards.gold).toBe(5);
    expect(rewards.eum).toEqual([
      { symbol: 'ㄱ', quantity: 1 },
      { symbol: 'ㅏ', quantity: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/combat/__tests__/drops.test.ts
```

Expected: FAIL because `combat/drops` does not exist.

- [ ] **Step 3: Implement weighted, non-duplicate rolls**

Create `client/src/game/sim/combat/drops.ts`:

```ts
import type { DropTable, EumStack } from '../../types/data';
import { randomInt, type RandomSource } from '../random';

export interface CombatRewards {
  gold: number;
  eum: EumStack[];
}

function pickWeighted<T extends { weight: number }>(
  entries: T[],
  random: RandomSource,
): number {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random.next() * total;
  for (let index = 0; index < entries.length; index += 1) {
    roll -= entries[index].weight;
    if (roll < 0) return index;
  }
  return entries.length - 1;
}

export function rollCombatRewards(
  dropTable: DropTable,
  random: RandomSource,
): CombatRewards {
  let gold = 0;
  for (const entry of dropTable.entries) {
    if (entry.kind !== 'GOLD') continue;
    if (!entry.guaranteed && random.next() >= entry.probability) continue;
    gold += randomInt(random, entry.quantity.min, entry.quantity.max);
  }

  const available = [...dropTable.eumRollGroup.entries];
  const drawCount = Math.min(
    available.length,
    randomInt(
      random,
      dropTable.eumRollGroup.draws.min,
      dropTable.eumRollGroup.draws.max,
    ),
  );
  const quantities = new Map<string, number>();

  for (let draw = 0; draw < drawCount && available.length > 0; draw += 1) {
    const index = pickWeighted(available, random);
    const entry = available[index];
    const quantity = randomInt(random, entry.quantity.min, entry.quantity.max);
    quantities.set(entry.symbol, (quantities.get(entry.symbol) ?? 0) + quantity);
    if (!dropTable.eumRollGroup.allowDuplicateSymbols) available.splice(index, 1);
  }

  return {
    gold,
    eum: [...quantities].map(([symbol, quantity]) => ({ symbol, quantity })),
  };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the command from Step 2.

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add client/src/game/sim/combat/drops.ts client/src/game/sim/combat/__tests__/drops.test.ts
git commit -m "feat: add deterministic combat rewards"
```

---

### Task 5: Player FSM and Combat World Integration

**Files:**

- Create: `client/src/game/sim/fsm/player-fsm.ts`
- Create: `client/src/game/sim/fsm/__tests__/player-fsm.test.ts`
- Modify: `client/src/game/sim/world.ts`
- Modify: `client/src/game/sim/__tests__/world.test.ts`

**Interfaces:**

- Consumes: movement, runtime monster state, damage, drops, fixture-derived combat content.
- Produces: `PlayerState`, `GameIntent`, `createWorld(options?)`, `tick(world, dt)`.

- [ ] **Step 1: Write failing FSM transition tests**

Create `client/src/game/sim/fsm/__tests__/player-fsm.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import type { MonsterState } from '../../entities/monster';
import {
  beginGroundMove,
  createPlayerState,
  selectCombatTarget,
  stopCombat,
  toggleAutoAttack,
} from '../player-fsm';

const livingMonster: MonsterState = {
  entityId: 'slime-1',
  definitionId: 'slime',
  spawnPos: { x: 3, z: 0 },
  pos: { x: 3, z: 0 },
  hp: 140,
  alive: true,
  deathProcessed: false,
  respawnRemainingMs: null,
};

describe('player combat FSM', () => {
  let player = createPlayerState();

  beforeEach(() => {
    player = createPlayerState();
  });

  it('ground movement clears target and disables auto attack', () => {
    selectCombatTarget(player, livingMonster);
    toggleAutoAttack(player, livingMonster);
    beginGroundMove(player, { x: 9, z: 2 });
    expect(player).toMatchObject({
      mode: 'moving',
      moveTarget: { x: 9, z: 2 },
      combatTargetId: null,
      autoAttackEnabled: false,
    });
  });

  it('selecting a living target does not start auto attack', () => {
    selectCombatTarget(player, livingMonster);
    expect(player.combatTargetId).toBe('slime-1');
    expect(player.autoAttackEnabled).toBe(false);
  });

  it('auto attack cannot start without a living target', () => {
    toggleAutoAttack(player, undefined);
    expect(player.autoAttackEnabled).toBe(false);
  });

  it('target death returns the player to idle and clears combat state', () => {
    selectCombatTarget(player, livingMonster);
    toggleAutoAttack(player, livingMonster);
    stopCombat(player);
    expect(player).toMatchObject({
      mode: 'idle',
      combatTargetId: null,
      autoAttackEnabled: false,
      attackElapsedMs: 0,
      pendingHitMs: null,
    });
  });
});
```

- [ ] **Step 2: Run FSM tests and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts
```

Expected: FAIL because `fsm/player-fsm` does not exist.

- [ ] **Step 3: Implement minimal FSM helpers**

Create `player-fsm.ts` with:

```ts
import type { MonsterState } from '../entities/monster';
import type { Vec2 } from '../movement';

export type PlayerMode = 'idle' | 'moving' | 'attacking';

export interface PlayerState {
  pos: Vec2;
  mode: PlayerMode;
  moveTarget: Vec2 | null;
  combatTargetId: string | null;
  autoAttackEnabled: boolean;
  attackElapsedMs: number;
  pendingHitMs: number | null;
}

export function createPlayerState(): PlayerState {
  return {
    pos: { x: 0, z: 0 },
    mode: 'idle',
    moveTarget: null,
    combatTargetId: null,
    autoAttackEnabled: false,
    attackElapsedMs: 0,
    pendingHitMs: null,
  };
}

export function beginGroundMove(player: PlayerState, point: Vec2): void {
  player.mode = 'moving';
  player.moveTarget = { ...point };
  player.combatTargetId = null;
  player.autoAttackEnabled = false;
  player.attackElapsedMs = 0;
  player.pendingHitMs = null;
}

export function selectCombatTarget(
  player: PlayerState,
  monster: MonsterState | undefined,
): void {
  if (!monster?.alive) return;
  player.combatTargetId = monster.entityId;
}

export function toggleAutoAttack(
  player: PlayerState,
  monster: MonsterState | undefined,
): void {
  if (player.autoAttackEnabled) {
    player.autoAttackEnabled = false;
    player.mode = 'idle';
    return;
  }
  if (!monster?.alive || monster.entityId !== player.combatTargetId) return;
  player.autoAttackEnabled = true;
}

export function stopCombat(player: PlayerState): void {
  player.mode = 'idle';
  player.moveTarget = null;
  player.combatTargetId = null;
  player.autoAttackEnabled = false;
  player.attackElapsedMs = 0;
  player.pendingHitMs = null;
}
```

Each function must implement only the rules asserted in Step 1.

- [ ] **Step 4: Run FSM tests and verify GREEN**

Run the command from Step 2.

Expected: all FSM tests pass.

- [ ] **Step 5: Write failing world combat tests**

Append these tests to `world.test.ts`, retaining the existing movement tests
and renaming their `player.target` assertions to `player.moveTarget`:

```ts
function zeroRandom() {
  return { next: () => 0 };
}

function startCombat(w: WorldState, monsterId = 'slime-1') {
  enqueueIntent(w, { type: 'select_target', monsterId });
  enqueueIntent(w, { type: 'toggle_auto_attack' });
}

describe('world combat loop', () => {
  it('spawns three ink slimes', () => {
    const w = createWorld({ random: zeroRandom() });
    expect([...w.monsters.values()]).toHaveLength(3);
    expect([...w.monsters.values()].every((monster) => monster.alive)).toBe(true);
  });

  it('approaches a selected target before attacking', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 10, z: 0 };
    monster.spawnPos = { ...monster.pos };
    startCombat(w);
    tick(w, 0.1);
    expect(w.player.mode).toBe('moving');
    expect(w.player.pos.x).toBeGreaterThan(0);
    expect(monster.hp).toBe(w.content.monster.maxHp);
  });

  it('applies no damage before hitFrameMs', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    startCombat(w);
    tick(w, 0.319);
    expect(monster.hp).toBe(w.content.monster.maxHp);
    tick(w, 0.001);
    expect(monster.hp).toBeLessThan(w.content.monster.maxHp);
  });

  it('does not apply a second hit before the next attack cadence', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    startCombat(w);
    tick(w, 0.32);
    const hpAfterFirstHit = monster.hp;
    tick(w, 0.929);
    expect(monster.hp).toBe(hpAfterFirstHit);
    tick(w, 0.001);
    tick(w, 0.32);
    expect(monster.hp).toBeLessThan(hpAfterFirstHit);
  });

  it('awards gold and eum exactly once when the target dies', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.hp = 1;
    const initialGold = w.inventory.gold;
    startCombat(w);
    tick(w, 0.32);
    const goldAfterDeath = w.inventory.gold;
    const eumAfterDeath = structuredClone(w.inventory.eum);
    expect(goldAfterDeath).toBe(initialGold + 5);
    expect(eumAfterDeath).toContainEqual({ symbol: 'ㄱ', quantity: 4 });
    tick(w, 1);
    expect(w.inventory.gold).toBe(goldAfterDeath);
    expect(w.inventory.eum).toEqual(eumAfterDeath);
  });

  it('stops combat when the selected target dies', () => {
    const w = createWorld({ random: zeroRandom() });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    expect(w.player).toMatchObject({
      mode: 'idle',
      combatTargetId: null,
      autoAttackEnabled: false,
    });
  });

  it('respawns a monster as a rewardable new life', () => {
    const w = createWorld({ random: zeroRandom(), respawnMs: 1_000 });
    const monster = w.monsters.get('slime-1')!;
    monster.pos = { x: 1, z: 0 };
    monster.spawnPos = { ...monster.pos };
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    const goldAfterFirstLife = w.inventory.gold;
    tick(w, 1);
    expect(monster.alive).toBe(true);
    monster.hp = 1;
    startCombat(w);
    tick(w, 0.32);
    expect(w.inventory.gold).toBe(goldAfterFirstLife + 5);
  });

  it('ignores non-positive dt for timed progression', () => {
    const w = createWorld({ random: zeroRandom() });
    const before = structuredClone(w.player);
    enqueueIntent(w, { type: 'move_to_ground', point: { x: 10, z: 0 } });
    tick(w, 0);
    expect(w.player).toEqual(before);
    expect(w.pendingIntents).toHaveLength(1);
  });
});
```

- [ ] **Step 6: Run world tests and verify RED**

Run:

```bash
cd client
npx vitest run src/game/sim/__tests__/world.test.ts
```

Expected: new combat tests fail because the world has no monsters or combat tick.

- [ ] **Step 7: Implement the minimal world orchestration**

Update the intent union:

```ts
export type GameIntent =
  | { type: 'move_to_ground'; point: Vec2 }
  | { type: 'select_target'; monsterId: string }
  | { type: 'toggle_auto_attack' };
```

Update `WorldState` to own:

```ts
export interface WorldOptions {
  random?: RandomSource;
  respawnMs?: number;
}

export interface WorldState {
  content: RuntimeCombatContent;
  respawnMs: number;
  player: PlayerState;
  monsters: Map<string, MonsterState>;
  inventory: PlayerInventory;
  pendingIntents: GameIntent[];
  random: RandomSource;
}

export function createWorld(options: WorldOptions = {}): WorldState;
```

Tick order:

1. Ignore non-positive `dt`.
2. Drain intents in queue order.
3. Tick dead-monster respawn timers.
4. Resolve the selected living target.
5. If auto-attack is off, run ordinary ground movement.
6. If the target is out of range, move toward it.
7. If in range, advance attack and pending-hit timers.
8. On the hit frame, roll damage and subtract HP.
9. On first death, roll/apply rewards, mark processed, and stop combat.

Retain the existing `enqueueIntent` export, so `GameScene.svelte` keeps its
current ground-click call without modification.

- [ ] **Step 8: Run focused and full tests**

Run:

```bash
cd client
npx vitest run src/game/sim
npx vitest run
```

Expected: all simulation tests and all existing tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/game/sim/fsm client/src/game/sim/world.ts
git add client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: add player-driven auto-attack simulation"
```

---

### Task 6: Documentation and Final Verification

**Files:**

- Modify: `client/README.md`
- Modify: `progress.md`

**Interfaces:**

- Consumes: verified M2 implementation and actual tuning values.
- Produces: accurate handoff for the rendering/HUD phase.

- [ ] **Step 1: Update milestone documentation**

In `client/README.md`:

- Mark “M2 순수 전투 코어” complete.
- Keep 3D monster rendering and HUD explicitly active/next.
- Record `LOGICAL_PX_TO_WORLD_UNIT`, respawn delay, and the FSM modes.

In `progress.md`:

- Record the completion date and implemented files.
- State that the next work is MonsterLayer, target input, and HUD.
- Do not mark the full visual M2 milestone complete.

- [ ] **Step 2: Run fresh full verification**

Run under Node.js 22.12+:

```bash
cd client
node --version
npm run check
npx vitest run
npm run build
cd ..
node scripts/validate-runtime-data.mjs
git diff --check
```

Expected:

- Node reports `v22.12.0` or newer.
- `svelte-check` reports 0 errors and 0 warnings.
- Every Vitest test passes.
- Vite build exits 0 without the old Node version warning.
- Runtime data prints `runtime data OK`.
- `git diff --check` exits 0.

- [ ] **Step 3: Commit documentation**

```bash
git add client/README.md progress.md
git commit -m "docs: record M2 combat core progress"
```

- [ ] **Step 4: Inspect final repository state**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: clean worktree and the Task 1–6 commits visible above the design and
implementation-plan commits.
