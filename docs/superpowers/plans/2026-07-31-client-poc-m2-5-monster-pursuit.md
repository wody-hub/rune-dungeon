# Client POC M2.5 Monster Pursuit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic ink-slime detection, pursuit, engaged hold, disengage, and return-to-spawn behavior without adding monster attacks or player damage.

**Architecture:** Extend `MonsterState` with a small movement mode and keep death/respawn reset in the entity lifecycle module. Implement all movement transitions in a new pure `monster-ai.ts`, while `world.ts` only sequences player behavior and living-monster AI so the existing imperative render layer displays movement without new scene state.

**Tech Stack:** TypeScript 6, Vitest 4, Svelte 5, Threlte 8, Vite 8, Node.js 22.12+

## Global Constraints

- `client/src/game/` must not import Svelte, Three.js, or browser APIs.
- Monster modes are exactly `idle`, `chasing`, `engaged`, and `returning`.
- Ink-slime runtime tuning is move speed `4.2`, detection range `3.0`, engaged range `1.4`, disengage range `4.5`, and leash range `6.0`.
- Detection is strict: a monster exactly `3.0` units away remains idle.
- A monster exactly `1.4` units away is engaged.
- A monster exactly `6.0` units from spawn returns.
- Returning ignores player detection until a later tick after exact spawn arrival.
- Dead and respawning monsters never execute AI; creation, death, and respawn reset mode to `idle`.
- Keep player combat, rewards, respawn duration, weapon tuning, monster spawns, rendering, and HUD behavior unchanged.
- Monster attacks, player HP/damage, multiplayer targeting, pathfinding, collisions, animation, and aggro VFX remain deferred.

---

## File Map

**Create**

- `client/src/game/sim/ai/monster-ai.ts`: pure mode transitions and pursuit/return movement for one monster.
- `client/src/game/sim/ai/__tests__/monster-ai.test.ts`: state, boundary, movement, disengage, and return tests.

**Modify**

- `client/src/game/data/monsters.json`: tune only the ink-slime detection and engaged ranges.
- `client/src/game/sim/runtime-content.ts`: expose derived disengage and leash ranges.
- `client/src/game/sim/__tests__/runtime-content.test.ts`: lock the fixture and runtime values.
- `client/src/game/sim/entities/monster.ts`: add and reset `MonsterMode`.
- `client/src/game/sim/entities/__tests__/monster.test.ts`: test lifecycle mode reset.
- `client/src/game/sim/world.ts`: remove whole-tick player early returns and run living-monster AI afterward.
- `client/src/game/sim/__tests__/world.test.ts`: verify initial idle and world integration.
- `client/README.md`: record the pursuit sub-milestone and tuning.
- `progress.md`: update the current handoff and next M2.5 slice.

---

### Task 1: Runtime Tuning and Monster Lifecycle Mode

**Files:**

- Modify: `client/src/game/data/monsters.json`
- Modify: `client/src/game/sim/runtime-content.ts`
- Modify: `client/src/game/sim/__tests__/runtime-content.test.ts`
- Modify: `client/src/game/sim/entities/monster.ts`
- Modify: `client/src/game/sim/entities/__tests__/monster.test.ts`

**Interfaces:**

- Consumes: `MonsterItem`, `LOGICAL_PX_TO_WORLD_UNIT`, and existing monster lifecycle functions.
- Produces: `MonsterMode`, `MonsterState.mode`, and runtime monster fields `disengageRange` and `leashRange`.

- [ ] **Step 1: Write failing fixture and runtime tuning tests**

Add the import to `client/src/game/sim/__tests__/runtime-content.test.ts`:

```ts
import monstersData from '../../data/monsters.json';
```

Replace the second test with:

```ts
it('converts pursuit values and derives return ranges', () => {
  const monster = {
    moveSpeed: 42,
    aggroRange: 30,
    attackRange: 14,
  } as MonsterItem;
  const weapon = { rangePx: 18, hitboxWidthPx: 32 } as WeaponItem;
  const content = createRuntimeCombatContent(monster, weapon, {} as PlayerData);

  expect(content.monster.moveSpeed).toBeCloseTo(4.2);
  expect(content.monster.aggroRange).toBeCloseTo(3);
  expect(content.monster.attackRange).toBeCloseTo(1.4);
  expect(content.monster.disengageRange).toBeCloseTo(4.5);
  expect(content.monster.leashRange).toBeCloseTo(6);
  expect(content.weapon.range).toBeCloseTo(1.8);
  expect(content.weapon.hitboxWidth).toBeCloseTo(3.2);
});

it('keeps the POC ink slime idle-safe tuning in its fixture', () => {
  expect(monstersData[0]).toMatchObject({
    id: 'monster_ink_slime_001',
    moveSpeed: 42,
    aggroRange: 30,
    attackRange: 14,
  });
});
```

- [ ] **Step 2: Write failing lifecycle mode assertions**

In `client/src/game/sim/entities/__tests__/monster.test.ts`, add `mode: 'idle'`
to both existing `toMatchObject` expectations.

Add:

```ts
it('clears pursuit mode when killed', () => {
  const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
  monster.mode = 'chasing';

  killMonster(monster, 2_000);

  expect(monster.mode).toBe('idle');
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run \
    src/game/sim/__tests__/runtime-content.test.ts \
    src/game/sim/entities/__tests__/monster.test.ts
```

Expected failures:

- fixture still contains `aggroRange: 180` and `attackRange: 28`;
- runtime monster has no `disengageRange` or `leashRange`;
- lifecycle state has no `mode`.

- [ ] **Step 4: Tune the ink-slime fixture**

In only the first monster entry of `client/src/game/data/monsters.json`:

```diff
-    "aggroRange": 180,
-    "attackRange": 28,
+    "aggroRange": 30,
+    "attackRange": 14,
```

Do not change `moveSpeed` or any other fixture field.

- [ ] **Step 5: Add derived runtime ranges**

In `client/src/game/sim/runtime-content.ts`, extend `RuntimeMonster`:

```ts
export interface RuntimeMonster extends MonsterItem {
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
  disengageRange: number;
  leashRange: number;
}
```

Inside `createRuntimeCombatContent`, calculate once before the return:

```ts
const aggroRange = toWorldDistance(monster.aggroRange);
```

Replace the monster distance fields with:

```ts
moveSpeed: toWorldDistance(monster.moveSpeed),
aggroRange,
attackRange: toWorldDistance(monster.attackRange),
disengageRange: aggroRange * 1.5,
leashRange: aggroRange * 2,
```

- [ ] **Step 6: Add lifecycle mode initialization and reset**

In `client/src/game/sim/entities/monster.ts`, add:

```ts
export type MonsterMode = 'idle' | 'chasing' | 'engaged' | 'returning';
```

Add to `MonsterState`:

```ts
mode: MonsterMode;
```

Set `mode: 'idle'` in `createMonster`.

Set:

```ts
monster.mode = 'idle';
```

in `killMonster`, and set the same field when `tickMonsterRespawn` restores the
monster.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the command from Step 3.

Expected: every focused test passes.

- [ ] **Step 8: Run the full suite and commit**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run check
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npx vitest run
```

Expected: type checking and every test pass.

Commit:

```bash
git add client/src/game/data/monsters.json
git add client/src/game/sim/runtime-content.ts client/src/game/sim/__tests__/runtime-content.test.ts
git add client/src/game/sim/entities/monster.ts client/src/game/sim/entities/__tests__/monster.test.ts
git commit -m "feat: add monster pursuit runtime state"
```

---

### Task 2: Pure Monster Pursuit State Machine

**Files:**

- Create: `client/src/game/sim/ai/monster-ai.ts`
- Create: `client/src/game/sim/ai/__tests__/monster-ai.test.ts`

**Interfaces:**

- Consumes: `MonsterState`, `Vec2`, and `MonsterAiConfig`.
- Produces: `MonsterAiConfig` and `tickMonsterAi(monster, playerPos, config, dt): void`.

- [ ] **Step 1: Write failing AI behavior tests**

Create `client/src/game/sim/ai/__tests__/monster-ai.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createMonster, type MonsterState } from '../../entities/monster';
import { tickMonsterAi, type MonsterAiConfig } from '../monster-ai';

const config: MonsterAiConfig = {
  moveSpeed: 4.2,
  aggroRange: 3,
  attackRange: 1.4,
  disengageRange: 4.5,
  leashRange: 6,
};

describe('monster pursuit AI', () => {
  let monster: MonsterState;

  beforeEach(() => {
    monster = createMonster('slime-1', { id: 'slime', maxHp: 140 }, { x: 0, z: 0 });
  });

  it('stays idle exactly at the strict detection boundary', () => {
    tickMonsterAi(monster, { x: 3, z: 0 }, config, 0.1);
    expect(monster).toMatchObject({ mode: 'idle', pos: { x: 0, z: 0 } });
  });

  it('detects inside the boundary and starts pursuing immediately', () => {
    tickMonsterAi(monster, { x: 2.9, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeCloseTo(0.42);
  });

  it('clamps pursuit at attack range without overshooting', () => {
    tickMonsterAi(monster, { x: 2, z: 0 }, config, 1);
    expect(monster.mode).toBe('engaged');
    expect(monster.pos.x).toBeCloseTo(0.6);
    expect(monster.pos.z).toBe(0);
    expect(Math.hypot(2 - monster.pos.x, monster.pos.z)).toBeCloseTo(1.4);
  });

  it('holds while engaged and resumes pursuit when the player moves', () => {
    monster.mode = 'engaged';
    monster.pos = { x: 0.6, z: 0 };
    tickMonsterAi(monster, { x: 2, z: 0 }, config, 0.1);
    expect(monster.pos).toEqual({ x: 0.6, z: 0 });

    tickMonsterAi(monster, { x: 2.5, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('chasing');
    expect(monster.pos.x).toBeGreaterThan(0.6);
  });

  it('returns when the player exceeds disengage range', () => {
    monster.mode = 'chasing';
    monster.pos = { x: 2, z: 0 };
    tickMonsterAi(monster, { x: 6.6, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('returning');
    expect(monster.pos.x).toBeLessThan(2);
  });

  it('returns at the exact spawn leash boundary', () => {
    monster.mode = 'chasing';
    monster.pos = { x: 6, z: 0 };
    tickMonsterAi(monster, { x: 7, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('returning');
    expect(monster.pos.x).toBeLessThan(6);
  });

  it('ignores nearby detection while returning and idles at exact spawn', () => {
    monster.mode = 'returning';
    monster.pos = { x: 0.2, z: 0 };
    tickMonsterAi(monster, { x: 0.1, z: 0 }, config, 1);
    expect(monster).toMatchObject({ mode: 'idle', pos: { x: 0, z: 0 } });

    tickMonsterAi(monster, { x: 0.1, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('engaged');
  });

  it('does not advance dead monsters or non-positive time', () => {
    monster.alive = false;
    tickMonsterAi(monster, { x: 1, z: 0 }, config, 0.1);
    expect(monster.mode).toBe('idle');

    monster.alive = true;
    tickMonsterAi(monster, { x: 1, z: 0 }, config, 0);
    expect(monster.mode).toBe('idle');
  });
});
```

- [ ] **Step 2: Run the AI tests and verify RED**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim/ai/__tests__/monster-ai.test.ts
```

Expected: FAIL because `../monster-ai` does not exist.

- [ ] **Step 3: Implement the pure state machine**

Create `client/src/game/sim/ai/monster-ai.ts`:

```ts
import type { MonsterState } from '../entities/monster';
import { stepToward, type Vec2 } from '../movement';

export interface MonsterAiConfig {
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
  disengageRange: number;
  leashRange: number;
}

function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function shouldReturn(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
): boolean {
  return (
    distance(monster.pos, playerPos) > config.disengageRange ||
    distance(monster.pos, monster.spawnPos) >= config.leashRange
  );
}

function returnToSpawn(
  monster: MonsterState,
  config: MonsterAiConfig,
  dt: number,
): void {
  monster.mode = 'returning';
  monster.pos = stepToward(monster.pos, monster.spawnPos, config.moveSpeed, dt);
  if (
    monster.pos.x === monster.spawnPos.x &&
    monster.pos.z === monster.spawnPos.z
  ) {
    monster.mode = 'idle';
  }
}

function pursue(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
  dt: number,
): void {
  const playerDistance = distance(monster.pos, playerPos);
  if (playerDistance <= config.attackRange) {
    monster.mode = 'engaged';
    return;
  }

  monster.mode = 'chasing';
  const allowedStep = Math.min(
    config.moveSpeed * dt,
    playerDistance - config.attackRange,
  );
  monster.pos = stepToward(monster.pos, playerPos, allowedStep, 1);
  if (distance(monster.pos, playerPos) <= config.attackRange) {
    monster.mode = 'engaged';
  }
}

export function tickMonsterAi(
  monster: MonsterState,
  playerPos: Vec2,
  config: MonsterAiConfig,
  dt: number,
): void {
  if (!monster.alive || dt <= 0) return;

  if (monster.mode === 'returning') {
    returnToSpawn(monster, config, dt);
    return;
  }

  const playerDistance = distance(monster.pos, playerPos);
  if (monster.mode === 'idle') {
    if (playerDistance >= config.aggroRange) return;
  } else if (shouldReturn(monster, playerPos, config)) {
    returnToSpawn(monster, config, dt);
    return;
  }

  pursue(monster, playerPos, config, dt);
}
```

- [ ] **Step 4: Run the AI tests and verify GREEN**

Run the command from Step 2.

Expected: all 8 tests pass.

- [ ] **Step 5: Run simulation regression tests and commit**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim
```

Expected: every simulation test passes.

Commit:

```bash
git add client/src/game/sim/ai
git commit -m "feat: add pure monster pursuit FSM"
```

---

### Task 3: World Tick Integration

**Files:**

- Modify: `client/src/game/sim/world.ts`
- Modify: `client/src/game/sim/__tests__/world.test.ts`

**Interfaces:**

- Consumes: `tickMonsterAi`, `RuntimeMonster`, player position, and the existing player simulation branches.
- Produces: a world tick that always advances player behavior and then every living monster.

- [ ] **Step 1: Write failing initial-idle and world-AI tests**

Add under `world combat loop` in
`client/src/game/sim/__tests__/world.test.ts`:

```ts
it('keeps every slime idle at its initial detection boundary', () => {
  const w = createWorld({ random: zeroRandom() });
  const initial = [...w.monsters.values()].map(({ pos }) => ({ ...pos }));

  tick(w, 0.5);

  expect([...w.monsters.values()].map(({ mode }) => mode)).toEqual([
    'idle',
    'idle',
    'idle',
  ]);
  expect([...w.monsters.values()].map(({ pos }) => pos)).toEqual(initial);
});

it('advances monster pursuit after an ordinary player movement branch', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;
  w.player.pos = { x: 0.2, z: 0 };
  enqueueIntent(w, { type: 'move_to_ground', point: { x: 0.3, z: 0 } });

  tick(w, 0.1);

  expect(w.player.pos).toEqual({ x: 0.3, z: 0 });
  expect(monster.mode).toBe('chasing');
  expect(monster.pos.x).toBeLessThan(3);
});

it('advances player and monster pursuit in the same combat tick', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;

  startCombat(w);
  tick(w, 0.1);

  expect(w.player.pos.x).toBeCloseTo(0.6);
  expect(monster.mode).toBe('chasing');
  expect(monster.pos.x).toBeLessThan(3);
  expect(monster.hp).toBe(w.content.monster.maxHp);
});
```

Extend the existing non-positive `dt` test:

```ts
const monsterBefore = cloneJsonData([...w.monsters.values()]);
```

and after `tick(w, 0)` add:

```ts
expect([...w.monsters.values()]).toEqual(monsterBefore);
```

- [ ] **Step 2: Run world tests and verify RED**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim/__tests__/world.test.ts
```

Expected: pursuit tests fail because `world.ts` does not call monster AI and
returns from player branches before a monster phase exists.

- [ ] **Step 3: Extract the player phase without whole-tick returns**

In `client/src/game/sim/world.ts`, import:

```ts
import { tickMonsterAi } from './ai/monster-ai';
```

Extract the current player logic below respawn into:

```ts
function tickPlayer(w: WorldState, dt: number, elapsedMs: number): void {
  const target = selectedMonster(w);
  if (!w.player.autoAttackEnabled) {
    tickGroundMovement(w.player, dt);
  } else if (!target) {
    stopCombat(w.player);
  } else {
    const distance = Math.hypot(
      target.pos.x - w.player.pos.x,
      target.pos.z - w.player.pos.z,
    );
    if (distance > w.content.weapon.range) {
      approachTarget(w.player, target, dt);
    } else {
      tickAttack(w, target, elapsedMs);
    }
  }
}
```

The function must not return from `tick`.

- [ ] **Step 4: Add the monster phase after the player phase**

Replace the old bottom half of `tick` after the respawn loop with:

```ts
tickPlayer(w, dt, elapsedMs);
for (const monster of w.monsters.values()) {
  tickMonsterAi(monster, w.player.pos, w.content.monster, dt);
}
```

Keep the existing `dt <= 0` guard, intent drain, and respawn loop.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim/__tests__/world.test.ts
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npx vitest run
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run check
```

Expected: world tests, all tests, and type checking pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/game/sim/world.ts client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: integrate monster pursuit into world tick"
```

---

### Task 4: Handoff and Browser Verification

**Files:**

- Modify: `client/README.md`
- Modify: `progress.md`

**Interfaces:**

- Consumes: verified monster pursuit behavior and actual runtime values.
- Produces: accurate M2.5 pursuit handoff while monster attacks and player damage remain next.

- [ ] **Step 1: Update `client/README.md`**

Replace the M2.5 row with:

```markdown
| M2.5 추적 | 몬스터 감지·추적·정지·복귀 | **완료** (2026-07-31) |
| M2.5 반격 | 몬스터 공격, 플레이어 HP·피격 | 다음 작업 |
```

After the M2 visual-connection paragraph, add:

```markdown
M2.5 추적은 먹물 슬라임의 순수 FSM(`idle` / `chasing` / `engaged` / `returning`)과 월드 틱 연결을 구현한다. 감지 범위는 `3.0`, 정지 거리는 `1.4`, 추적 포기 거리는 `4.5`, 스폰 이탈 한계는 `6.0`, 이동 속도는 `4.2`다. 초기 배치에서는 모두 대기하며, 복귀 중에는 재감지하지 않는다. 다음 M2.5 반격 범위는 몬스터 공격 타이밍, 플레이어 HP와 피격이다.
```

Add these tuning knobs:

```markdown
- 먹물 슬라임 추적: 이동 `4.2`, 감지 `3.0`, 정지 `1.4`, 추적 포기 `4.5`, 이탈 한계 `6.0` (`game/sim/runtime-content.ts`)
```

- [ ] **Step 2: Update `progress.md`**

After the M2 visual-connection completion bullet, add:

```markdown
   - M2.5 몬스터 추적 완료(2026-07-31): 먹물 슬라임에 `idle`·`chasing`·`engaged`·`returning` 순수 FSM을 추가했다. 초기에는 대기하고 플레이어가 감지 범위 `3.0` 안으로 들어오면 추적하며, `1.4` 거리에서 멈춘다. 플레이어 거리 `4.5` 초과 또는 스폰 이탈 `6.0` 도달 시 재감지 없이 원래 위치로 복귀한다. 몬스터 공격과 플레이어 피해는 다음 작은 단계다.
```

Replace the second bullet under `다음 구현 계획` with:

```markdown
- M2 순수 전투 코어, 시각 연결, M2.5 몬스터 추적이 완료됐다. 다음은 M2.5 반격으로 몬스터 공격 타이밍과 플레이어 HP·피격을 구현한다.
```

- [ ] **Step 3: Run fresh full verification**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH node --version
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run check
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npx vitest run
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run build
cd ..
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  node scripts/validate-runtime-data.mjs
if rg -n "from ['\"](?:svelte|three|@threlte)|import\\(['\"](?:svelte|three|@threlte)" client/src/game; then
  exit 1
fi
git diff --check
```

Expected:

- Node reports `v22.12.0` or newer;
- Svelte check reports 0 errors and 0 warnings;
- every Vitest test passes;
- Vite build exits 0;
- runtime validation prints `runtime data OK`;
- the forbidden-import scan prints nothing;
- `git diff --check` exits 0.

- [ ] **Step 4: Run browser verification**

Start:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npm run dev -- --host 127.0.0.1
```

Use a WebGL-capable browser and verify:

1. All three slimes remain idle and stationary after initial load.
2. Moving just inside `slime-1` detection range changes it to `chasing`.
3. Only the approached slime moves; the other two remain idle.
4. The pursuing slime stops at approximately `1.4` units and becomes
   `engaged`.
5. Moving outside `1.4` but inside `4.5` resumes `chasing`.
6. Moving beyond `4.5` changes the slime to `returning`.
7. A nearby player does not interrupt `returning`.
8. The slime reaches its exact spawn position and becomes `idle`.
9. Selecting and killing the slime still grants rewards once and respawns it
   at spawn in `idle`.
10. Existing HUD, single-click selection, double-click auto-attack, and ground
    movement cancellation still work.

- [ ] **Step 5: Commit documentation**

Only after every command and browser step passes:

```bash
git add client/README.md progress.md
git commit -m "docs: record M2.5 monster pursuit"
```

- [ ] **Step 6: Inspect final state**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: clean worktree on the feature branch with Task 1–4 commits above the
design and plan commits.
