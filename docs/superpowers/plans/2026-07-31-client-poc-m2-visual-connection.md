# Client POC M2 Visual Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the three simulated ink slimes, connect click and double-click combat input, and expose combat and reward state through a minimal HUD.

**Architecture:** Preserve the plain-object simulation and imperative Three.js update boundary. Add pure presentation adapters for HUD snapshots and gesture-to-intent conversion, update monster meshes directly from the existing game loop, and publish HUD state to the Canvas sibling only when visible values change.

**Tech Stack:** Svelte 5, TypeScript 6, Threlte 8, Three.js 0.185, Vitest 4, Vite 8, Node.js 22.12+

## Global Constraints

- `client/src/game/` must not import Svelte, Three.js, or browser APIs.
- `GameScene` remains the sole owner of `WorldState` and the animation loop.
- Per-frame player and monster positions must not enter Svelte reactivity.
- HUD state must exclude positions and publish only when visible values change.
- Single-click selects; double-click selects and then enables auto-attack.
- Ground click behavior remains unchanged and cancels combat through the existing simulation rule.
- Placeholder visuals and minimal high-contrast HUD styling are the full visual scope.
- Tab targeting, production art, animation, VFX, audio, and monster attacks remain deferred.

---

## File Map

**Create**

- `client/src/ui/hud-model.ts`: pure `WorldState` to `HudSnapshot` adapter and equality comparison.
- `client/src/ui/__tests__/hud-model.test.ts`: deterministic snapshot and comparison tests.
- `client/src/scene/monster-input.ts`: pure monster gesture to ordered `GameIntent` adapter.
- `client/src/scene/__tests__/monster-input.test.ts`: single- and double-click intent tests.
- `client/src/scene/MonsterEntity.svelte`: one imperative placeholder slime and selection ring.
- `client/src/scene/MonsterLayer.svelte`: owns fixed POC monster views and exposes `update()`.
- `client/src/ui/Hud.svelte`: formats the minimal player, reward, and target panels.

**Modify**

- `client/src/scene/GameScene.svelte`: connect monster layer, gestures, and change-only HUD publication.
- `client/src/App.svelte`: own low-frequency HUD snapshot beside the Canvas.
- `client/src/app.css`: add minimal full-screen overlay styles.
- `client/README.md`: record the visual M2 connection and input rules.
- `progress.md`: record the new handoff and next M2.5 step.

---

### Task 1: Pure HUD Snapshot Adapter

**Files:**

- Create: `client/src/ui/hud-model.ts`
- Create: `client/src/ui/__tests__/hud-model.test.ts`

**Interfaces:**

- Consumes: `WorldState`, `PlayerMode`, and `EumStack`.
- Produces: `HudSnapshot`, `createHudSnapshot(world): HudSnapshot`, and `hudSnapshotsEqual(left, right): boolean`.

- [ ] **Step 1: Write failing HUD snapshot tests**

Create `client/src/ui/__tests__/hud-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createWorld, enqueueIntent, tick } from '../../game/sim/world';
import {
  createHudSnapshot,
  hudSnapshotsEqual,
  type HudSnapshot,
} from '../hud-model';

describe('HUD model', () => {
  it('copies and sorts visible inventory state without exposing positions', () => {
    const world = createWorld();
    world.inventory.eum = [
      { symbol: 'ㅇ', quantity: 2 },
      { symbol: 'ㄱ', quantity: 4 },
    ];

    const snapshot = createHudSnapshot(world);

    expect(snapshot).toEqual({
      playerMode: 'idle',
      autoAttackEnabled: false,
      gold: world.inventory.gold,
      eum: [
        { symbol: 'ㄱ', quantity: 4 },
        { symbol: 'ㅇ', quantity: 2 },
      ],
      target: null,
    });
    expect(snapshot).not.toHaveProperty('playerPos');
    world.inventory.eum[0].quantity = 99;
    expect(snapshot.eum[1].quantity).toBe(2);
  });

  it('describes only a selected living monster', () => {
    const world = createWorld();
    enqueueIntent(world, { type: 'select_target', monsterId: 'slime-1' });
    tick(world, 1 / 60);

    expect(createHudSnapshot(world).target).toEqual({
      id: 'slime-1',
      name: '먹물 슬라임',
      hp: 140,
      maxHp: 140,
    });

    world.monsters.get('slime-1')!.alive = false;
    expect(createHudSnapshot(world).target).toBeNull();
  });

  it('compares snapshots by visible values rather than object identity', () => {
    const world = createWorld();
    const first = createHudSnapshot(world);
    const sameValues = createHudSnapshot(world);

    expect(hudSnapshotsEqual(first, sameValues)).toBe(true);

    const changed: HudSnapshot = {
      ...sameValues,
      gold: sameValues.gold + 1,
    };
    expect(hudSnapshotsEqual(first, changed)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client
npx vitest run src/ui/__tests__/hud-model.test.ts
```

Expected: FAIL because `../hud-model` does not exist.

- [ ] **Step 3: Implement the minimal snapshot adapter**

Create `client/src/ui/hud-model.ts`:

```ts
import type { WorldState } from '../game/sim/world';
import type { PlayerMode } from '../game/sim/fsm/player-fsm';
import type { EumStack } from '../game/types/data';

export interface TargetHudSnapshot {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
}

export interface HudSnapshot {
  playerMode: PlayerMode;
  autoAttackEnabled: boolean;
  gold: number;
  eum: EumStack[];
  target: TargetHudSnapshot | null;
}

export function createHudSnapshot(world: WorldState): HudSnapshot {
  const selectedId = world.player.combatTargetId;
  const selected = selectedId ? world.monsters.get(selectedId) : undefined;
  const target = selected?.alive
    ? {
        id: selected.entityId,
        name: world.content.monster.name,
        hp: selected.hp,
        maxHp: world.content.monster.maxHp,
      }
    : null;

  return {
    playerMode: world.player.mode,
    autoAttackEnabled: world.player.autoAttackEnabled,
    gold: world.inventory.gold,
    eum: world.inventory.eum
      .map((stack) => ({ ...stack }))
      .sort((left, right) => left.symbol.localeCompare(right.symbol, 'ko')),
    target,
  };
}

export function hudSnapshotsEqual(
  left: HudSnapshot,
  right: HudSnapshot,
): boolean {
  if (
    left.playerMode !== right.playerMode ||
    left.autoAttackEnabled !== right.autoAttackEnabled ||
    left.gold !== right.gold
  ) {
    return false;
  }
  if (
    left.target?.id !== right.target?.id ||
    left.target?.name !== right.target?.name ||
    left.target?.hp !== right.target?.hp ||
    left.target?.maxHp !== right.target?.maxHp
  ) {
    return false;
  }
  if (left.eum.length !== right.eum.length) return false;
  return left.eum.every(
    (stack, index) =>
      stack.symbol === right.eum[index].symbol &&
      stack.quantity === right.eum[index].quantity,
  );
}
```

- [ ] **Step 4: Run focused and regression tests**

Run:

```bash
cd client
npx vitest run src/ui/__tests__/hud-model.test.ts src/game/sim/__tests__/world.test.ts
```

Expected: both files pass with no failures.

- [ ] **Step 5: Commit**

```bash
git add client/src/ui/hud-model.ts client/src/ui/__tests__/hud-model.test.ts
git commit -m "feat: add combat HUD snapshot model"
```

---

### Task 2: Monster Gesture Intent Adapter

**Files:**

- Create: `client/src/scene/monster-input.ts`
- Create: `client/src/scene/__tests__/monster-input.test.ts`

**Interfaces:**

- Consumes: monster entity ID and `MonsterGesture`.
- Produces: `MonsterGesture = 'select' | 'start_auto_attack'` and `intentsForMonsterGesture(monsterId, gesture): GameIntent[]`.

- [ ] **Step 1: Write failing gesture tests**

Create `client/src/scene/__tests__/monster-input.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { intentsForMonsterGesture } from '../monster-input';

describe('monster input', () => {
  it('turns a single click into target selection only', () => {
    expect(intentsForMonsterGesture('slime-1', 'select')).toEqual([
      { type: 'select_target', monsterId: 'slime-1' },
    ]);
  });

  it('orders target selection before the double-click auto-attack toggle', () => {
    expect(intentsForMonsterGesture('slime-2', 'start_auto_attack')).toEqual([
      { type: 'select_target', monsterId: 'slime-2' },
      { type: 'toggle_auto_attack' },
    ]);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client
npx vitest run src/scene/__tests__/monster-input.test.ts
```

Expected: FAIL because `../monster-input` does not exist.

- [ ] **Step 3: Implement ordered gesture conversion**

Create `client/src/scene/monster-input.ts`:

```ts
import type { GameIntent } from '../game/sim/world';

export type MonsterGesture = 'select' | 'start_auto_attack';

export function intentsForMonsterGesture(
  monsterId: string,
  gesture: MonsterGesture,
): GameIntent[] {
  const select: GameIntent = {
    type: 'select_target',
    monsterId,
  };
  return gesture === 'select'
    ? [select]
    : [select, { type: 'toggle_auto_attack' }];
}
```

- [ ] **Step 4: Run focused and full pure tests**

Run:

```bash
cd client
npx vitest run src/scene/__tests__/monster-input.test.ts
npx vitest run
```

Expected: every test passes.

- [ ] **Step 5: Commit**

```bash
git add client/src/scene/monster-input.ts client/src/scene/__tests__/monster-input.test.ts
git commit -m "feat: map monster gestures to combat intents"
```

---

### Task 3: Imperative Monster Rendering and Interaction

**Files:**

- Create: `client/src/scene/MonsterEntity.svelte`
- Create: `client/src/scene/MonsterLayer.svelte`
- Modify: `client/src/scene/GameScene.svelte`

**Interfaces:**

- Consumes: `WorldState`, `MonsterState`, `MonsterGesture`, `enqueueIntent`, and `intentsForMonsterGesture`.
- Produces: `MonsterEntity.update(selected): void` and `MonsterLayer.update(): void`.

- [ ] **Step 1: Add the missing layer import and invocation to establish RED**

In `client/src/scene/GameScene.svelte`, add:

```ts
import MonsterLayer from './MonsterLayer.svelte';
```

Add beside `playerLayer`:

```ts
let monsterLayer = $state<{ update: () => void }>();
```

After `playerLayer?.update()` in the frame loop, add:

```ts
monsterLayer?.update();
```

After `GroundLayer` and before `PlayerLayer`, add:

```svelte
<MonsterLayer bind:this={monsterLayer} {world} onMonsterGesture={() => {}} />
```

- [ ] **Step 2: Run type checking and verify RED**

Run:

```bash
cd client
npm run check
```

Expected: FAIL because `MonsterLayer.svelte` does not exist.

- [ ] **Step 3: Create one imperative monster entity**

Create `client/src/scene/MonsterEntity.svelte`:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import type { Group, Mesh, MeshStandardMaterial } from 'three';
  import type { MonsterState } from '../game/sim/entities/monster';
  import type { MonsterGesture } from './monster-input';

  let {
    monster,
    onGesture,
  }: {
    monster: MonsterState;
    onGesture: (gesture: MonsterGesture) => void;
  } = $props();

  let group = $state<Group>();
  let bodyMaterial = $state<MeshStandardMaterial>();
  let selectionRing = $state<Mesh>();

  export function update(selected: boolean): void {
    if (!group) return;
    group.position.set(monster.pos.x, 0, monster.pos.z);
    group.visible = monster.alive;
    bodyMaterial?.color.set(selected ? '#ffca5c' : '#34243f');
    if (selectionRing) selectionRing.visible = monster.alive && selected;
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh
    position.y={0.55}
    scale={[0.9, 0.65, 0.9]}
    onclick={(event) => {
      event.stopPropagation();
      onGesture('select');
    }}
    ondblclick={(event) => {
      event.stopPropagation();
      onGesture('start_auto_attack');
    }}
  >
    <T.SphereGeometry args={[0.65, 20, 14]} />
    <T.MeshStandardMaterial bind:ref={bodyMaterial} color="#34243f" />
  </T.Mesh>
  <T.Mesh
    bind:ref={selectionRing}
    position.y={0.04}
    rotation.x={Math.PI / 2}
    visible={false}
  >
    <T.TorusGeometry args={[0.78, 0.06, 8, 32]} />
    <T.MeshBasicMaterial color="#ffd369" />
  </T.Mesh>
</T.Group>
```

- [ ] **Step 4: Create the fixed POC monster layer**

Create `client/src/scene/MonsterLayer.svelte`:

```svelte
<script lang="ts">
  import type { WorldState } from '../game/sim/world';
  import MonsterEntity from './MonsterEntity.svelte';
  import type { MonsterGesture } from './monster-input';

  let {
    world,
    onMonsterGesture,
  }: {
    world: WorldState;
    onMonsterGesture: (monsterId: string, gesture: MonsterGesture) => void;
  } = $props();

  const monsters = [...world.monsters.values()];
  let entities = $state<Array<{ update: (selected: boolean) => void } | undefined>>([]);

  export function update(): void {
    for (let index = 0; index < monsters.length; index += 1) {
      const monster = monsters[index];
      entities[index]?.update(world.player.combatTargetId === monster.entityId);
    }
  }
</script>

{#each monsters as monster, index (monster.entityId)}
  <MonsterEntity
    bind:this={entities[index]}
    {monster}
    onGesture={(gesture) => onMonsterGesture(monster.entityId, gesture)}
  />
{/each}
```

- [ ] **Step 5: Wire ordered intents in `GameScene.svelte`**

Add imports:

```ts
import {
  intentsForMonsterGesture,
  type MonsterGesture,
} from './monster-input';
```

Add:

```ts
function handleMonsterGesture(monsterId: string, gesture: MonsterGesture): void {
  for (const intent of intentsForMonsterGesture(monsterId, gesture)) {
    enqueueIntent(world, intent);
  }
}
```

Replace the temporary `MonsterLayer` handler with:

```svelte
<MonsterLayer
  bind:this={monsterLayer}
  {world}
  onMonsterGesture={handleMonsterGesture}
/>
```

- [ ] **Step 6: Run checks and tests to verify GREEN**

Run:

```bash
cd client
npm run check
npx vitest run
npm run build
```

Expected:

- `svelte-check found 0 errors and 0 warnings`
- every Vitest test passes;
- Vite build exits 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/scene/MonsterEntity.svelte client/src/scene/MonsterLayer.svelte
git add client/src/scene/GameScene.svelte
git commit -m "feat: render and target combat monsters"
```

---

### Task 4: Change-Only HUD Publication and Minimal Overlay

**Files:**

- Create: `client/src/ui/Hud.svelte`
- Modify: `client/src/scene/GameScene.svelte`
- Modify: `client/src/App.svelte`
- Modify: `client/src/app.css`

**Interfaces:**

- Consumes: `HudSnapshot`, `createHudSnapshot`, and `hudSnapshotsEqual`.
- Produces: `GameScene` prop `onHudChange(snapshot): void` and a pointer-transparent Canvas sibling HUD.

- [ ] **Step 1: Reference the missing HUD component to establish RED**

Replace `client/src/App.svelte` with:

```svelte
<script lang="ts">
  import { Canvas } from '@threlte/core';
  import GameScene from './scene/GameScene.svelte';
  import Hud from './ui/Hud.svelte';
  import type { HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
</script>

<div class="game-root">
  <Canvas renderMode="manual">
    <GameScene onHudChange={(snapshot) => (hud = snapshot)} />
  </Canvas>
  <Hud snapshot={hud} />
</div>

<style>
  .game-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
```

- [ ] **Step 2: Run type checking and verify RED**

Run:

```bash
cd client
npm run check
```

Expected: FAIL because `Hud.svelte` does not exist and `GameScene` does not yet accept `onHudChange`.

- [ ] **Step 3: Publish initial and changed HUD snapshots from `GameScene`**

Add imports to `client/src/scene/GameScene.svelte`:

```ts
import {
  createHudSnapshot,
  hudSnapshotsEqual,
  type HudSnapshot,
} from '../ui/hud-model';
```

Add props and state before world creation:

```ts
let {
  onHudChange,
}: {
  onHudChange: (snapshot: HudSnapshot) => void;
} = $props();

let lastHud: HudSnapshot | undefined;
```

Add:

```ts
function publishHud(): void {
  const next = createHudSnapshot(world);
  if (lastHud && hudSnapshotsEqual(lastHud, next)) return;
  lastHud = next;
  onHudChange(next);
}
```

At the start of the existing `onMount` callback, call:

```ts
publishHud();
```

In the frame loop, after the simulation steps and layer updates and before
`advance()`, call:

```ts
publishHud();
```

- [ ] **Step 4: Create the minimal HUD view**

Create `client/src/ui/Hud.svelte`:

```svelte
<script lang="ts">
  import type { HudSnapshot } from './hud-model';

  let { snapshot }: { snapshot: HudSnapshot | null } = $props();

  const modeLabel = {
    idle: '대기',
    moving: '이동',
    attacking: '공격',
  } as const;
</script>

<div class="hud" aria-live="polite">
  {#if snapshot}
    <section class="hud-panel player-panel">
      <div><span>상태</span><strong>{modeLabel[snapshot.playerMode]}</strong></div>
      <div>
        <span>자동공격</span>
        <strong>{snapshot.autoAttackEnabled ? 'ON' : 'OFF'}</strong>
      </div>
      <div><span>골드</span><strong>{snapshot.gold}</strong></div>
      <div class="eum-row">
        <span>음</span>
        <strong>
          {snapshot.eum.length
            ? snapshot.eum.map(({ symbol, quantity }) => `${symbol}×${quantity}`).join(' · ')
            : '없음'}
        </strong>
      </div>
    </section>

    {#if snapshot.target}
      <section class="hud-panel target-panel">
        <strong>{snapshot.target.name}</strong>
        <span>{snapshot.target.hp} / {snapshot.target.maxHp}</span>
        <div class="hp-track">
          <div
            class="hp-fill"
            style:width={`${Math.max(0, snapshot.target.hp / snapshot.target.maxHp) * 100}%`}
          ></div>
        </div>
      </section>
    {/if}
  {/if}
</div>
```

- [ ] **Step 5: Add minimal pointer-transparent HUD styles**

Append to `client/src/app.css`:

```css
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: #f7f3e8;
}

.hud-panel {
  position: absolute;
  padding: 12px 14px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 8px;
  background: rgb(12 15 20 / 82%);
  box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
  font-size: 13px;
}

.player-panel {
  top: 16px;
  left: 16px;
  min-width: 210px;
}

.player-panel > div {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin: 4px 0;
}

.player-panel span {
  color: #aeb7c5;
}

.eum-row strong {
  max-width: 150px;
  text-align: right;
}

.target-panel {
  top: 16px;
  left: 50%;
  width: min(320px, calc(100vw - 32px));
  transform: translateX(-50%);
  text-align: center;
}

.target-panel > span {
  display: block;
  margin-top: 3px;
  color: #d8dbe0;
  font-variant-numeric: tabular-nums;
}

.hp-track {
  height: 8px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #272a30;
}

.hp-fill {
  height: 100%;
  border-radius: inherit;
  background: #c94e58;
  transition: width 100ms linear;
}
```

- [ ] **Step 6: Run checks, tests, and build to verify GREEN**

Run:

```bash
cd client
npm run check
npx vitest run
npm run build
```

Expected:

- `svelte-check found 0 errors and 0 warnings`;
- every Vitest test passes;
- Vite build exits 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.svelte client/src/app.css client/src/scene/GameScene.svelte
git add client/src/ui/Hud.svelte
git commit -m "feat: connect minimal combat HUD"
```

---

### Task 5: Documentation and End-to-End Verification

**Files:**

- Modify: `client/README.md`
- Modify: `progress.md`

**Interfaces:**

- Consumes: the verified visible M2 behavior.
- Produces: an accurate next-session handoff with M2 visual connection complete and M2.5 still pending.

- [ ] **Step 1: Update `client/README.md`**

Replace the M2 visual-connection milestone row with:

```markdown
| M2 시각 연결 | MonsterLayer 3D 렌더링, 몬스터 타깃 입력, HUD | **완료** (2026-07-31) |
| M2.5 | 몬스터 추적·공격, 플레이어 피격 | 다음 작업 |
```

After the M2 core status paragraph, add:

```markdown
M2 시각 연결은 `MonsterEntity`와 `MonsterLayer`의 명령형 `update()`로 3마리 먹물 슬라임의 위치·생존·선택 상태를 그린다. 몬스터 한 번 클릭은 타깃 선택, 더블클릭은 타깃 선택 후 자동공격 시작으로 정규화된다. HUD는 Canvas 밖 형제 컴포넌트이며, 위치를 제외한 표시 값이 달라질 때만 스냅샷을 받는다. 다음 M2.5 범위는 몬스터 추적·공격과 플레이어 피격이다.
```

- [ ] **Step 2: Update `progress.md`**

After the existing M2 pure-combat-core bullet, add:

```markdown
   - M2 시각 연결 완료(2026-07-31): `MonsterEntity`·`MonsterLayer`로 먹물 슬라임 3마리를 표시하고, 한 번 클릭 타깃 선택·더블클릭 자동공격 시작 입력과 최소 HUD(플레이어 상태, 자동공격, 골드, 음, 타깃 HP)를 연결했다. 사망·보상·5초 재스폰까지 브라우저에서 확인 가능한 상태다. 현재 표현은 기능 검증용 placeholder이며 제작용 에셋·애니메이션·VFX·HUD 폴리시는 포함하지 않는다.
```

Replace the `다음 구현 계획` section with:

```markdown
## 다음 구현 계획
- 현재 최우선은 클라이언트 단독 POC다. Rust 서버와 WebSocket 전환은 M4 이후, 로컬 플레이 루프의 재미와 경계가 검증된 뒤 진행한다.
- M2 순수 전투 코어와 시각 연결이 완료됐다. 다음은 M2.5로 몬스터 추적·공격과 플레이어 피격을 구현한다.
- `client/src/game/data` fixture는 POC 동안 콘텐츠 입력으로 유지하고, 거리·속도는 런타임 어댑터에서 월드 단위로 변환한다.
- Node.js는 Vite 8 기준에 맞춰 저장소에서 `22.12.0`으로 고정한다.
```

- [ ] **Step 3: Run fresh full verification**

Run:

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

- Node reports `v22.12.0` or newer;
- `svelte-check` reports 0 errors and 0 warnings;
- every Vitest test passes with 0 failures;
- Vite build exits 0;
- runtime validation prints `runtime data OK`;
- `git diff --check` exits 0.

- [ ] **Step 4: Run browser verification**

Start the client:

```bash
cd client
npm run dev -- --host 127.0.0.1
```

In the browser, verify this exact sequence:

1. Three dark placeholder slimes appear around the player.
2. The upper-left HUD shows mode, auto-attack, gold, and eum.
3. A single slime click highlights it and opens the upper-center target panel.
4. The first click does not enable auto-attack.
5. Double-clicking the selected slime enables auto-attack.
6. The player approaches, the target HP decreases, and the target disappears on
   death.
7. The target panel disappears when combat stops.
8. Gold and at least one eum quantity increase exactly once.
9. The dead slime reappears after approximately five seconds.
10. Clicking the ground while a target is selected clears the selection and
    moves the player.

- [ ] **Step 5: Commit documentation**

```bash
git add client/README.md progress.md
git commit -m "docs: record M2 visual combat connection"
```

- [ ] **Step 6: Inspect repository state**

Run:

```bash
git status --short --branch
git log --oneline -8
```

Expected: clean worktree on `dev`, synchronized or ahead of `origin/dev`, with
the Task 1–5 commits above `f9df095`.
