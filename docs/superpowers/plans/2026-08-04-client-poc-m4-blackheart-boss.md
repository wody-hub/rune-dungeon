# Client POC M4 — 흑심 채굴장과 몽당연필 기사단장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 완료된 `결: 화` 체크포인트에서 오타 요정, 보스 문, 몽당연필 기사단장 파훼와 의뢰 완료까지의 짧은 로컬 M4 흐름을 구현한다.

**Architecture:** 기존 `game/` 순수 시뮬레이션에 M4 지역 진행과 독립 보스 상태기계를 추가하고, 엔티티별 런타임 몬스터 정의를 통해 정예와 보스의 전투 수치를 분리한다. `scene/`은 순수 월드 상태를 그리며 문 클릭을 intent로 보내고, `ui/`는 목표·보스 상태를 HUD 스냅샷으로만 표시한다.

**Tech Stack:** Svelte 5.56, TypeScript 6, Vite 8, Threlte 8, Three.js 0.185, Vitest 4, Playwright MCP.

## Global Constraints

- `DESIGN.md`의 먹빛 결정 색상, 타이포, HUD 우선순위, 2.4초 맥동, reduced-motion 계약을 유지한다.
- `game/`은 Svelte, Threlte, Three.js, 브라우저 API를 import하지 않는다.
- 현재 기본 `createWorld()`의 먹물 슬라임 전투·추적·반격·드랍·5초 재스폰과 M3 진행 규칙을 보존한다.
- M4 화면만 완료된 M3 체크포인트로 시작하며, 채굴장 안에 보급함·재료 수집·재제작 흐름을 만들지 않는다.
- 보스는 `armored(6초) → exposed(4초) → transformed hit → groggy(10초) → armored`만 구현한다. 투사체, 소환, 범위 패턴, 플레이어 전투 불능/부활은 추가하지 않는다.
- 보스 격파는 이번 실행에서 재스폰하지 않는다. 일반/정예의 기존 재스폰은 유지한다.
- 실제 맵 로딩, 서버, 저장, 멀티플레이, 새 인벤토리·ITEM 소비 UI, 최종 캐릭터·몬스터 아트는 범위 밖이다.
- 새 의존성을 추가하지 않는다. push와 태그를 만들지 않는다.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `client/src/game/sim/boss-state.ts` | 보스 단계·타이머·그로기 전환과 전투 정책을 순수하게 계산한다. |
| `client/src/game/sim/m4-scenario.ts` | 두 로컬 지역, 문 개방, 서술형 목표, M4 엔티티 ID와 스폰 위치를 소유한다. |
| `client/src/game/sim/m3-progression.ts` | 기존 M3 규칙을 보존하면서 완료된 체크포인트 시드만 제공한다. |
| `client/src/game/sim/runtime-content.ts` | 엔티티별로 안전하게 복제·거리 변환된 런타임 몬스터 정의를 만든다. |
| `client/src/game/sim/world.ts` | 시나리오 선택, 활성 지역, 엔티티별 전투/드랍, 문 intent, 보스 예외를 조율한다. |
| `client/src/ui/hud-model.ts` | M4 지역·목표·보스 상태를 렌더링 가능한 스냅샷으로 만든다. |
| `client/src/ui/Hud.svelte` | 타깃 아래 목표 스트립과 보스 상태를 표시한다. |
| `client/src/ui/M3ProgressPanel.svelte` | M4 체크포인트에서 완성된 결과 화 변신 버튼만 표시한다. |
| `client/src/scene/M4BossGate.svelte` | 문 잠김/개방 상태를 그려 클릭 intent를 보낸다. |
| `client/src/scene/MonsterLayer.svelte`, `MonsterEntity.svelte` | 활성 지역과 몬스터 등급에 맞는 임시 정예·보스 실루엣을 표시한다. |
| `client/src/scene/GameScene.svelte` | M4 월드와 문 업데이트를 현재 고정 스텝/명령형 렌더 루프에 연결한다. |

## Task 1: M3 완료 체크포인트와 보스 상태기계

**Files:**
- Create: `client/src/game/sim/boss-state.ts`
- Create: `client/src/game/sim/__tests__/boss-state.test.ts`
- Modify: `client/src/game/sim/m3-progression.ts`
- Modify: `client/src/game/sim/__tests__/m3-progression.test.ts`

**Interfaces:**
- Consumes: `MonsterItem['bossStateModifiers']`와 기존 `M3_IDS`, `PlayerInventory`.
- Produces: `createBossState()`, `tickBossState()`, `startBossGroggy()`, `bossCombatPolicy()`, `createM3CompletedCheckpoint()`.

- [ ] **Step 1: 보스 상태기계와 M3 체크포인트의 실패 테스트를 작성한다.**

```ts
// client/src/game/sim/__tests__/boss-state.test.ts
import { describe, expect, it } from 'vitest';
import {
  BOSS_ARMOR_DURATION_MS,
  bossCombatPolicy,
  createBossState,
  startBossGroggy,
  tickBossState,
} from '../boss-state';

const modifiers = {
  incomingDamageMultiplier: 0.5,
  weaknessExposeDurationMs: 4_000,
  groggyDurationMs: 10_000,
  groggyDefenseOverride: 0,
  guaranteedIncantationTagOnWeakness: 'FIRE' as const,
};

describe('M4 boss state', () => {
  it('moves armored → exposed → armored when no fire hit occurs', () => {
    const state = createBossState(modifiers);
    expect(state).toEqual({ phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS });
    tickBossState(state, BOSS_ARMOR_DURATION_MS, modifiers);
    expect(state).toEqual({ phase: 'exposed', remainingMs: 4_000 });
    tickBossState(state, 4_000, modifiers);
    expect(state).toEqual({ phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS });
  });

  it('opens full-damage, non-acting groggy only from exposed', () => {
    const state = createBossState(modifiers);
    expect(startBossGroggy(state, modifiers)).toBe(false);
    tickBossState(state, BOSS_ARMOR_DURATION_MS, modifiers);
    expect(startBossGroggy(state, modifiers)).toBe(true);
    expect(state).toEqual({ phase: 'groggy', remainingMs: 10_000 });
    expect(bossCombatPolicy(state, modifiers, 60)).toEqual({
      defense: 0,
      incomingDamageMultiplier: 1,
      canAct: false,
    });
  });
});
```

```ts
// add to client/src/game/sim/__tests__/m3-progression.test.ts
import { createM3CompletedCheckpoint, getM3Stage } from '../m3-progression';

it('creates a completed but not transformed M3 checkpoint', () => {
  const { inventory, progress } = createM3CompletedCheckpoint({
    gold: 99,
    eum: [{ symbol: 'ㄱ', quantity: 3 }],
    items: [],
  });

  expect(progress).toMatchObject({
    cacheAvailable: true,
    cacheCollected: true,
    currentGyeolId: M3_IDS.letter,
    transformed: false,
  });
  expect(inventory).toMatchObject({ gold: 15, eum: [{ symbol: 'ㄱ', quantity: 3 }] });
  expect(getM3Stage(progress, inventory)).toBe('transform');
});
```

- [ ] **Step 2: 새 테스트가 모듈/내보내기 부재로 실패하는지 확인한다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/boss-state.test.ts src/game/sim/__tests__/m3-progression.test.ts`

Expected: `boss-state`와 `createM3CompletedCheckpoint`를 찾지 못해 FAIL.

- [ ] **Step 3: 순수 보스 상태기계와 체크포인트 시드를 구현한다.**

```ts
// client/src/game/sim/boss-state.ts
import type { MonsterItem } from '../types/data';

export const BOSS_ARMOR_DURATION_MS = 6_000;
export type BossPhase = 'armored' | 'exposed' | 'groggy' | 'cleared';
export interface BossState { phase: BossPhase; remainingMs: number; }
type BossModifiers = NonNullable<MonsterItem['bossStateModifiers']>;

export function createBossState(_modifiers: BossModifiers): BossState {
  return { phase: 'armored', remainingMs: BOSS_ARMOR_DURATION_MS };
}

function enterArmored(state: BossState): void {
  state.phase = 'armored';
  state.remainingMs = BOSS_ARMOR_DURATION_MS;
}

export function tickBossState(state: BossState, elapsedMs: number, modifiers: BossModifiers): void {
  let remaining = Math.max(0, elapsedMs);
  while (remaining > 0 && state.phase !== 'cleared') {
    const advance = Math.min(remaining, state.remainingMs);
    state.remainingMs -= advance;
    remaining -= advance;
    if (state.remainingMs > 0) return;
    if (state.phase === 'armored') {
      state.phase = 'exposed';
      state.remainingMs = modifiers.weaknessExposeDurationMs;
    } else {
      enterArmored(state);
    }
  }
}

export function startBossGroggy(state: BossState, modifiers: BossModifiers): boolean {
  if (state.phase !== 'exposed') return false;
  state.phase = 'groggy';
  state.remainingMs = modifiers.groggyDurationMs;
  return true;
}

export function markBossCleared(state: BossState): void {
  state.phase = 'cleared';
  state.remainingMs = 0;
}

export function bossCombatPolicy(state: BossState, modifiers: BossModifiers, baseDefense: number) {
  if (state.phase === 'groggy') return { defense: modifiers.groggyDefenseOverride, incomingDamageMultiplier: 1, canAct: false };
  if (state.phase === 'cleared') return { defense: baseDefense, incomingDamageMultiplier: 0, canAct: false };
  return { defense: baseDefense, incomingDamageMultiplier: modifiers.incomingDamageMultiplier, canAct: true };
}
```

```ts
// append to client/src/game/sim/m3-progression.ts
export function createM3CompletedCheckpoint(source: PlayerInventory): {
  inventory: PlayerInventory;
  progress: M3Progress;
} {
  return {
    inventory: createM3InventorySeed(source),
    progress: {
      ...createM3Progress(),
      cacheAvailable: true,
      cacheCollected: true,
      currentGyeolId: M3_IDS.letter,
      statusMessage: '결: 화를 현재 결에 장착했습니다.',
      acquisitionSequence: 1,
      inscriptionSequence: 1,
      equipSequence: 1,
    },
  };
}
```

Pass `modifiers` as the third argument to both `tickBossState` calls in the test above. Keep `startBossGroggy` and `markBossCleared` as the only phase-transition functions called by `world.ts`.

- [ ] **Step 4: 상태 전이와 M3 체크포인트 테스트를 통과시킨다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/boss-state.test.ts src/game/sim/__tests__/m3-progression.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 5: 순수 진행 모듈을 커밋한다.**

```bash
git add client/src/game/sim/boss-state.ts client/src/game/sim/__tests__/boss-state.test.ts \
  client/src/game/sim/m3-progression.ts client/src/game/sim/__tests__/m3-progression.test.ts
git commit -m "feat: add M4 boss progression state"
```

## Task 2: M4 지역 진행과 엔티티별 런타임 콘텐츠

**Files:**
- Create: `client/src/game/sim/m4-scenario.ts`
- Create: `client/src/game/sim/__tests__/m4-scenario.test.ts`
- Modify: `client/src/game/sim/runtime-content.ts`
- Modify: `client/src/game/sim/__tests__/world.test.ts`

**Interfaces:**
- Consumes: Task 1의 `BossState`, 현재 `MonsterItem` fixture와 `RuntimeMonster` 변환 규칙.
- Produces: `M4_ENTITY_IDS`, `M4Area`, `M4Progress`, `createM4Progress()`, `unlockM4BossGate()`, `enterM4BossRoom()`, `completeM4Quest()`, `m4ObjectiveText()`, `createRuntimeMonster()`.

- [ ] **Step 1: 지역 진행과 독립 몬스터 변환의 실패 테스트를 작성한다.**

```ts
// client/src/game/sim/__tests__/m4-scenario.test.ts
import { describe, expect, it } from 'vitest';
import type { MonsterItem } from '../../types/data';
import {
  createM4Progress,
  enterM4BossRoom,
  m4ObjectiveText,
  unlockM4BossGate,
} from '../m4-scenario';

describe('M4 scenario', () => {
  it('requires the elite clear before entering the local boss room', () => {
    const progress = createM4Progress();
    expect(m4ObjectiveText(progress)).toContain('오타 요정');
    expect(enterM4BossRoom(progress)).toBe(false);
    unlockM4BossGate(progress);
    expect(progress.gateUnlocked).toBe(true);
    expect(m4ObjectiveText(progress)).toContain('최심부');
    expect(enterM4BossRoom(progress)).toBe(true);
    expect(progress.area).toBe('pencil_knight_boss_room');
    expect(m4ObjectiveText(progress)).toContain('화 변신');
  });
});
```

```ts
// add to client/src/game/sim/__tests__/world.test.ts
import { createRuntimeMonster } from '../runtime-content';

it('converts each monster fixture without sharing nested drop data', () => {
  const elite = { id: 'elite', moveSpeed: 68, aggroRange: 240, attackRange: 220 } as MonsterItem;
  const runtime = createRuntimeMonster(elite);
  expect(runtime).toMatchObject({ id: 'elite', moveSpeed: 6.8, aggroRange: 24, attackRange: 22 });
});
```

- [ ] **Step 2: 새 지역 모듈과 변환 helper의 부재를 확인한다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/m4-scenario.test.ts src/game/sim/__tests__/world.test.ts`

Expected: `m4-scenario`와 `createRuntimeMonster`를 찾지 못해 FAIL.

- [ ] **Step 3: M4 진행 상태와 런타임 몬스터 helper를 구현한다.**

```ts
// client/src/game/sim/m4-scenario.ts
import { createBossState, type BossState } from './boss-state';
import type { MonsterItem } from '../types/data';

export const M4_ENTITY_IDS = {
  elite: 'm4-typo-sprite',
  boss: 'm4-pencil-knight-commander',
} as const;
export type M4Area = 'blackheart_mine' | 'pencil_knight_boss_room';
export type M4Objective = 'defeat_elite' | 'enter_boss_room' | 'defeat_boss' | 'complete';
export interface M4Progress {
  area: M4Area;
  gateUnlocked: boolean;
  objective: M4Objective;
  boss: BossState;
}

export function createM4Progress(boss: MonsterItem): M4Progress {
  if (!boss.bossStateModifiers) throw new Error('M4 boss fixture needs bossStateModifiers');
  return { area: 'blackheart_mine', gateUnlocked: false, objective: 'defeat_elite', boss: createBossState(boss.bossStateModifiers) };
}

export function unlockM4BossGate(progress: M4Progress): void {
  progress.gateUnlocked = true;
  if (progress.objective === 'defeat_elite') progress.objective = 'enter_boss_room';
}

export function enterM4BossRoom(progress: M4Progress): boolean {
  if (!progress.gateUnlocked || progress.area !== 'blackheart_mine') return false;
  progress.area = 'pencil_knight_boss_room';
  progress.objective = 'defeat_boss';
  return true;
}

export function completeM4Quest(progress: M4Progress): void { progress.objective = 'complete'; }

export function m4ObjectiveText(progress: M4Progress): string {
  if (progress.objective === 'defeat_elite') return '길을 막는 오타 요정을 처치하세요.';
  if (progress.objective === 'enter_boss_room') return '봉인문이 열렸습니다. 최심부로 향하세요.';
  if (progress.objective === 'defeat_boss') return '기사단장의 단단한 심은 화 변신에 반응합니다.';
  return '길드 의뢰 제1호를 완수했습니다.';
}
```

```ts
// add to client/src/game/sim/runtime-content.ts
export function createRuntimeMonster(monster: MonsterItem): RuntimeMonster {
  const clonedMonster = cloneJsonData(monster);
  const aggroRange = toWorldDistance(monster.aggroRange);
  return {
    ...clonedMonster,
    moveSpeed: toWorldDistance(monster.moveSpeed),
    aggroRange,
    attackRange: toWorldDistance(monster.attackRange),
    disengageRange: aggroRange * 1.5,
    leashRange: aggroRange * 2,
  };
}

// make createRuntimeCombatContent use the helper
monster: createRuntimeMonster(monster),
```

Use this explicit boss fixture in the test rather than an incomplete cast:

```ts
const bossFixture = {
  id: 'boss',
  bossStateModifiers: {
    incomingDamageMultiplier: 0.5,
    weaknessExposeDurationMs: 4_000,
    groggyDurationMs: 10_000,
    groggyDefenseOverride: 0,
    guaranteedIncantationTagOnWeakness: 'FIRE',
  },
} as MonsterItem;
```

Then create the progress with `const progress = createM4Progress(bossFixture);`.

- [ ] **Step 4: 지역 진행과 런타임 콘텐츠 테스트를 통과시킨다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/m4-scenario.test.ts src/game/sim/__tests__/world.test.ts`

Expected: all focused tests PASS; existing slime fixture isolation test still passes.

- [ ] **Step 5: 지역 진행 모듈을 커밋한다.**

```bash
git add client/src/game/sim/m4-scenario.ts client/src/game/sim/__tests__/m4-scenario.test.ts \
  client/src/game/sim/runtime-content.ts client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: add M4 mine scenario data"
```

## Task 3: 월드의 지역 전환, 정예 드랍, 보스 전투 적용

**Files:**
- Modify: `client/src/game/sim/world.ts`
- Create: `client/src/game/sim/__tests__/m4-world.test.ts`

**Interfaces:**
- Consumes: Task 1의 보스 정책/체크포인트와 Task 2의 M4 진행 상태·엔티티 ID·런타임 정의.
- Produces: `WorldOptions.scenario`, `WorldState.m4`, `getMonsterDefinition()`, `isMonsterActive()`, `enter_m4_boss_room` intent.

- [ ] **Step 1: M4의 핵심 흐름을 검증하는 실패 테스트를 작성한다.**

```ts
// client/src/game/sim/__tests__/m4-world.test.ts
import { describe, expect, it } from 'vitest';
import { M4_ENTITY_IDS } from '../m4-scenario';
import { createWorld, enqueueIntent, tick } from '../world';

const zeroRandom = { next: () => 0 };
function start(w: ReturnType<typeof createWorld>, monsterId: string) {
  enqueueIntent(w, { type: 'select_target', monsterId });
  enqueueIntent(w, { type: 'enable_auto_attack' });
}

describe('M4 world', () => {
  it('starts at the completed M3 mine checkpoint and unlocks the gate after elite death', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom, respawnMs: 1_000 });
    const elite = w.monsters.get(M4_ENTITY_IDS.elite)!;
    expect(w.m3).toMatchObject({ currentGyeolId: 'letter_gyeol_hwa_001', transformed: false });
    expect(w.m4).toMatchObject({ area: 'blackheart_mine', gateUnlocked: false });
    elite.pos = { x: 1, z: 0 }; elite.hp = 1;
    start(w, elite.entityId); tick(w, 0.32);
    expect(w.m4?.gateUnlocked).toBe(true);
    tick(w, 1);
    expect(elite.alive).toBe(true);
    expect(w.m4?.gateUnlocked).toBe(true);
  });

  it('keeps the gate closed until the elite falls and clears combat on entry', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom });
    enqueueIntent(w, { type: 'enter_m4_boss_room' }); tick(w, 1 / 60);
    expect(w.m4?.area).toBe('blackheart_mine');
    w.m4!.gateUnlocked = true;
    enqueueIntent(w, { type: 'enter_m4_boss_room' }); tick(w, 1 / 60);
    expect(w.m4?.area).toBe('pencil_knight_boss_room');
    expect(w.player).toMatchObject({ combatTargetId: null, autoAttackEnabled: false });
  });

  it('requires a transformed hit during exposure and makes the groggy boss inert', () => {
    const w = createWorld({ scenario: 'm4', random: zeroRandom });
    w.m4!.gateUnlocked = true;
    enqueueIntent(w, { type: 'enter_m4_boss_room' }); tick(w, 1 / 60);
    const boss = w.monsters.get(M4_ENTITY_IDS.boss)!;
    boss.pos = { x: 1, z: 0 };
    tick(w, 6);
    start(w, boss.entityId); tick(w, 0.32);
    expect(w.m4?.boss.phase).toBe('exposed');
    enqueueIntent(w, { type: 'toggle_m3_transformation' }); tick(w, 1 / 60);
    tick(w, 1.25);
    expect(w.m4?.boss.phase).toBe('groggy');
    expect(boss.mode).not.toBe('engaged');
  });
});
```

- [ ] **Step 2: M4 월드 옵션과 intent가 없어서 실패하는지 확인한다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/m4-world.test.ts`

Expected: `scenario`, `m4`, `enter_m4_boss_room`이 없어 FAIL.

- [ ] **Step 3: 월드의 지역별 엔티티와 보스 정책을 구현한다.**

In `world.ts`, make these structural changes:

```ts
export type WorldScenario = 'skirmish' | 'm4';
export interface WorldOptions { random?: RandomSource; respawnMs?: number; scenario?: WorldScenario; }
export type GameIntent =
  | { type: 'move_to_ground'; point: Vec2 }
  | { type: 'select_target'; monsterId: string }
  | { type: 'toggle_auto_attack' }
  | { type: 'enable_auto_attack' }
  | { type: 'enter_m4_boss_room' }
  | { type: M3Action };

export interface WorldState {
  // retain existing fields
  scenario: WorldScenario;
  monsterDefinitions: Map<string, RuntimeMonster>;
  m4: M4Progress | null;
}
```

Implement these helpers in `world.ts` and use them from HUD/scene code rather than reading `content.monster` for an arbitrary entity:

```ts
export function getMonsterDefinition(w: WorldState, monster: MonsterState): RuntimeMonster {
  const definition = w.monsterDefinitions.get(monster.definitionId);
  if (!definition) throw new Error(`Missing runtime monster definition: ${monster.definitionId}`);
  return definition;
}

export function isMonsterActive(w: WorldState, monster: MonsterState): boolean {
  if (w.scenario !== 'm4') return true;
  if (w.m4?.area === 'blackheart_mine') return monster.entityId === M4_ENTITY_IDS.elite;
  return monster.entityId === M4_ENTITY_IDS.boss && w.m4.objective !== 'complete';
}
```

Use `scenario ?? 'skirmish'` in `createWorld`. The `skirmish` branch must retain its three slime spawns and M3 seed exactly as today. The `m4` branch must:

1. Resolve the existing slime, typo sprite, boss, and equipped weapon fixture IDs; throw a named error for a missing fixture.
2. Build a `monsterDefinitions` map with `createRuntimeMonster()` for all three fixture definitions.
3. Seed inventory/progress with `createM3CompletedCheckpoint(player.inventory)`.
4. Spawn only `M4_ENTITY_IDS.elite` in `blackheart_mine` and `M4_ENTITY_IDS.boss` in `pencil_knight_boss_room`; keep both in the map, but tick/select/render only `isMonsterActive()` entities.
5. Create `m4` with `createM4Progress(bossDefinition)`.

Replace all global `w.content.monster` reads inside player hit, respawn, AI, monster attack, target lookup, and reward handling with `getMonsterDefinition(w, monster)`. Keep `w.content.monster` for legacy skirmish tests only. In `processHit`:

```ts
const definition = getMonsterDefinition(w, target);
const bossModifiers = definition.bossStateModifiers;
if (w.m4 && target.entityId === M4_ENTITY_IDS.boss && bossModifiers &&
    w.m4.boss.phase === 'exposed' && w.m3.transformed) {
  startBossGroggy(w.m4.boss, bossModifiers);
}
const policy = bossModifiers && w.m4 && target.entityId === M4_ENTITY_IDS.boss
  ? bossCombatPolicy(w.m4.boss, bossModifiers, definition.baseDefense)
  : { defense: definition.baseDefense, incomingDamageMultiplier: 1, canAct: true };
const rawDamage = rollPhysicalDamage(
  {
    minDamage: w.content.weapon.minDamage,
    maxDamage: w.content.weapon.maxDamage,
    attackBonus: w.content.player.combatProfile.attackBonusFromStr,
    damageMultiplier: w.content.weapon.damageMultiplier,
    defense: policy.defense,
  },
  w.random,
);
target.hp = Math.max(0, target.hp - rawDamage * policy.incomingDamageMultiplier);
```

When the elite dies, call `unlockM4BossGate(w.m4)`. When the boss dies, do not call `killMonster`; set it dead, mark death processed, call `markBossCleared`, `completeM4Quest`, apply gold/`음` rewards once, and stop combat. When boss state is `groggy` or `cleared`, skip AI and `tickMonsterAttack`; reset any partial monster attack clock. Tick the boss state only while it is the active, living M4 boss. Process `enter_m4_boss_room` via `enterM4BossRoom`, reset player combat, and place the player at the boss-room spawn constant in `m4-scenario.ts`.

- [ ] **Step 4: M4 world tests와 기존 전투 회귀 테스트를 통과시킨다.**

Run: `cd client && npx vitest run src/game/sim/__tests__/m4-world.test.ts src/game/sim/__tests__/world.test.ts`

Expected: all focused tests PASS, including original three-slime spawn, counterattack, reward, and respawn cases.

- [ ] **Step 5: M4 순수 시뮬레이션을 커밋한다.**

```bash
git add client/src/game/sim/world.ts client/src/game/sim/__tests__/m4-world.test.ts
git commit -m "feat: add M4 mine and boss simulation"
```

## Task 4: 목표·보스 HUD와 M3 완료 패널

**Files:**
- Modify: `client/src/ui/hud-model.ts`
- Modify: `client/src/ui/__tests__/hud-model.test.ts`
- Modify: `client/src/ui/Hud.svelte`
- Modify: `client/src/ui/M3ProgressPanel.svelte`
- Create: `client/src/ui/__tests__/m4-hud-contract.test.ts`

**Interfaces:**
- Consumes: Task 3의 `WorldState.m4`, `getMonsterDefinition()`, `M4Progress`.
- Produces: nullable `HudSnapshot.m4`와 타깃 아래 `quest-objective` 스트립.

- [ ] **Step 1: M4 HUD 스냅샷과 마크업의 실패 테스트를 작성한다.**

```ts
// add to client/src/ui/__tests__/hud-model.test.ts
it('publishes M4 objective and boss phase only for the M4 scenario', () => {
  const m4 = createWorld({ scenario: 'm4' });
  expect(createHudSnapshot(m4).m4).toMatchObject({
    area: '흑심 채굴장',
    objective: expect.stringContaining('오타 요정'),
    gateUnlocked: false,
    boss: null,
  });
  m4.m4!.gateUnlocked = true;
  enqueueIntent(m4, { type: 'enter_m4_boss_room' }); tick(m4, 1 / 60);
  expect(createHudSnapshot(m4).m4?.boss).toMatchObject({ phase: 'armored', remainingMs: 6_000 });
  expect(createHudSnapshot(createWorld()).m4).toBeNull();
});
```

```ts
// client/src/ui/__tests__/m4-hud-contract.test.ts
import { describe, expect, it } from 'vitest';
import hudSource from '../Hud.svelte?raw';
import m3Source from '../M3ProgressPanel.svelte?raw';

describe('M4 HUD contract', () => {
  it('keeps the objective below the target and preserves the M3 transform control', () => {
    expect(hudSource).toContain('class="quest-objective"');
    expect(hudSource).toContain('snapshot.m4?.objective');
    expect(hudSource).toContain('snapshot.m4?.boss');
    expect(m3Source).toContain('snapshot.currentGyeolId === M3_IDS.letter');
    expect(m3Source).toContain('{#if !isCompletedCheckpoint}');
  });
});
```

- [ ] **Step 2: 새 M4 HUD 필드와 마크업이 없어서 실패하는지 확인한다.**

Run: `cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/ui/__tests__/m4-hud-contract.test.ts`

Expected: `HudSnapshot.m4`와 목표/체크포인트 마크업 부재로 FAIL.

- [ ] **Step 3: HUD snapshot과 컴포넌트를 구현한다.**

Add these snapshot types and helper to `hud-model.ts`:

```ts
export interface M4BossHudSnapshot { phase: 'armored' | 'exposed' | 'groggy'; remainingMs: number; }
export interface M4HudSnapshot {
  area: string;
  objective: string;
  gateUnlocked: boolean;
  boss: M4BossHudSnapshot | null;
}

function createM4HudSnapshot(world: WorldState): M4HudSnapshot | null {
  if (!world.m4) return null;
  const boss = world.m4.area === 'pencil_knight_boss_room' && world.m4.boss.phase !== 'cleared'
    ? { phase: world.m4.boss.phase, remainingMs: world.m4.boss.remainingMs }
    : null;
  return {
    area: world.m4.area === 'blackheart_mine' ? '흑심 채굴장' : '기사단장 보스방',
    objective: m4ObjectiveText(world.m4),
    gateUnlocked: world.m4.gateUnlocked,
    boss,
  };
}
```

Add `m4: createM4HudSnapshot(world)` to `createHudSnapshot()` and compare `area`, `objective`, `gateUnlocked`, `boss?.phase`, and `boss?.remainingMs` in `hudSnapshotsEqual()`. Resolve selected target name/max HP through `getMonsterDefinition(world, selected)`.

In `Hud.svelte`, place this immediately after the conditional target section so the approved A layout stays directly below the top-center target panel:

```svelte
{#if snapshot.m4}
  <section class="quest-objective" aria-label="현재 의뢰">
    <span>의뢰 · 흑심 채굴장의 기사단장</span>
    <strong>{snapshot.m4.objective}</strong>
  </section>
{/if}
```

Inside the target panel, display boss phase only when both a target and `snapshot.m4?.boss` exist:

```svelte
{#if snapshot.m4?.boss}
  <p class:boss-exposed={snapshot.m4.boss.phase === 'exposed'} class:boss-groggy={snapshot.m4.boss.phase === 'groggy'}>
    {snapshot.m4.boss.phase === 'armored' ? '단단한 심' : snapshot.m4.boss.phase === 'exposed' ? '약점 노출' : '그로기'}
    · {Math.ceil(snapshot.m4.boss.remainingMs / 1000)}초
  </p>
{/if}
```

Use `.quest-objective { position:absolute; top:92px; left:50%; width:min(330px, calc(100vw - 300px)); transform:translateX(-50%); }`; give it the compact angular panel treatment, `border-left-color: var(--rd-fire-gyeol)`, and no pointer events. In the existing mobile media query, move it to `top: 188px` and use `width: calc(100vw - var(--rd-panel-mobile-gutter))`.

In `M3ProgressPanel.svelte`, import `M3_IDS`, then add:

```ts
const isCompletedCheckpoint = $derived(snapshot.currentGyeolId === M3_IDS.letter);
```

Use `isCompletedCheckpoint ? '현재 결' : 'M3 · 첫 각인'` as the kicker, hide the `.requirements`, acquisition chips, and inscription flash behind `{#if !isCompletedCheckpoint}`, retain the current-gyeol label and the existing transform button, and use `aria-label={isCompletedCheckpoint ? '현재 결과 화 변신' : 'M3 첫 각인 진행'}`. The mobile `bottom: 176px` rule remains unchanged so it clears the resource panel.

- [ ] **Step 4: HUD 모델·계약 테스트와 Svelte 검사를 통과시킨다.**

Run: `cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/ui/__tests__/m4-hud-contract.test.ts && npm run check`

Expected: focused tests PASS and Svelte/TypeScript reports 0 errors and 0 warnings.

- [ ] **Step 5: M4 HUD를 커밋한다.**

```bash
git add client/src/ui/hud-model.ts client/src/ui/__tests__/hud-model.test.ts \
  client/src/ui/Hud.svelte client/src/ui/M3ProgressPanel.svelte client/src/ui/__tests__/m4-hud-contract.test.ts
git commit -m "feat: add M4 objective and boss HUD"
```

## Task 5: 채굴장 문과 임시 정예·보스 씬 표현

**Files:**
- Create: `client/src/scene/M4BossGate.svelte`
- Create: `client/src/scene/__tests__/m4-scene-contract.test.ts`
- Modify: `client/src/scene/GameScene.svelte`
- Modify: `client/src/scene/MonsterLayer.svelte`
- Modify: `client/src/scene/MonsterEntity.svelte`
- Modify: `client/src/scene/visual-state.ts`
- Modify: `client/src/scene/__tests__/visual-state.test.ts`

**Interfaces:**
- Consumes: Task 3의 `isMonsterActive()`, `getMonsterDefinition()`, `M4_ENTITY_IDS`; Task 4의 HUD state.
- Produces: imperative `M4BossGate.update(area, unlocked, nowMs)` and rank/phase-aware, explicitly temporary monster visuals.

- [ ] **Step 1: 씬 경계와 보스 시각 상태의 실패 테스트를 작성한다.**

```ts
// add to client/src/scene/__tests__/visual-state.test.ts
import { monsterVisualState } from '../visual-state';

it('uses text-supported fire exposure and still groggy visual roles for the placeholder boss', () => {
  expect(monsterVisualState(false, 'BOSS', 'exposed')).toMatchObject({ core: visualTheme.colors.fireGyeol, ringVisible: true });
  expect(monsterVisualState(false, 'BOSS', 'groggy')).toMatchObject({ core: visualTheme.colors.crystalGlow, coreBoost: 0.42 });
});
```

```ts
// client/src/scene/__tests__/m4-scene-contract.test.ts
import { describe, expect, it } from 'vitest';
import sceneSource from '../GameScene.svelte?raw';
import gateSource from '../M4BossGate.svelte?raw';

describe('M4 scene contract', () => {
  it('renders a local gate through an intent and updates it inside the imperative loop', () => {
    expect(sceneSource).toContain("type: 'enter_m4_boss_room'");
    expect(sceneSource).toContain('bossGate?.update(');
    expect(gateSource).toContain('export function update(area: M4Area, unlocked: boolean, nowMs: number)');
    expect(gateSource).toContain('onEnter()');
  });
});
```

- [ ] **Step 2: 새 gate 컴포넌트와 rank/phase 시각 인자가 없어서 실패하는지 확인한다.**

Run: `cd client && npx vitest run src/scene/__tests__/visual-state.test.ts src/scene/__tests__/m4-scene-contract.test.ts`

Expected: `M4BossGate.svelte`와 확장한 `monsterVisualState` 계약 부재로 FAIL.

- [ ] **Step 3: 문과 임시 몬스터 표현을 구현한다.**

```svelte
<!-- client/src/scene/M4BossGate.svelte -->
<script lang="ts">
  import { T } from '@threlte/core';
  import type { Group, MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { M4Area } from '../game/sim/m4-scenario';

  let { onEnter }: { onEnter: () => void } = $props();
  let group = $state<Group>();
  let seal = $state<MeshStandardMaterial>();
  let open = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(area: M4Area, unlocked: boolean, nowMs: number): void {
    if (!group) return;
    group.visible = area === 'blackheart_mine';
    open = unlocked;
    if (seal) seal.emissiveIntensity = unlocked ? (reducedMotion ? 0.42 : 0.32 + 0.1 * (1 - Math.cos(nowMs / 1200 * Math.PI))) : 0.04;
  }
</script>

<T.Group bind:ref={group} position={[0, 0, 7]}>
  <T.Mesh position.y={1.1} scale={[2.2, 2.2, 0.25]} onclick={() => open && onEnter()}>
    <T.BoxGeometry />
    <T.MeshStandardMaterial color="#182328" metalness={0.74} roughness={0.35} />
  </T.Mesh>
  <T.Mesh position={[0, 1.1, 0.28]} scale={[0.28, 0.48, 0.08]}>
    <T.OctahedronGeometry />
    <T.MeshStandardMaterial bind:ref={seal} color={visualTheme.colors.crystalGlow} emissive={visualTheme.colors.crystalGlow} emissiveIntensity={0.04} />
  </T.Mesh>
</T.Group>
```

Change `monsterVisualState` to accept `(selected: boolean, rank: MonsterRank = 'NORMAL', bossPhase?: BossPhase)` and return its existing values for normal rank. For `ELITE`, use a slightly higher `coreBoost` and the same readable base silhouette. For `BOSS`, return fire core/ring during `exposed`, crystal core with `coreBoost: 0.42` during `groggy`, and a large dark body otherwise. Do not use color as the only signal; HUD supplies phase text and time.

In `MonsterLayer.svelte`, import `getMonsterDefinition` and `isMonsterActive`; pass `definition` to each entity and call `entity.update(selected, isMonsterActive(world, monster), nowMs, world.m4?.boss.phase)`. In `MonsterEntity.svelte`, accept `definition`, `active`, and optional `bossPhase`; set group visibility from `active && monster.alive`; select a larger angular Box/Capsule branch only for `definition.rank === 'BOSS'`. Leave a comment that all rank geometry is temporary functional art.

In `GameScene.svelte`, create the visible client world with `createWorld({ scenario: 'm4' })`, add:

```ts
let bossGate = $state<{ update: (area: M4Area, unlocked: boolean, nowMs: number) => void }>();
```

then, after the other imperative layer updates in the rAF loop:

```ts
if (world.m4) bossGate?.update(world.m4.area, world.m4.gateUnlocked, now);
```

Render the gate between ground and monsters:

```svelte
<M4BossGate bind:this={bossGate} onEnter={() => enqueueIntent(world, { type: 'enter_m4_boss_room' })} />
```

Keep `M3SupplyCache` mounted but invisible: completed M3 checkpoint state leaves `cacheAvailable && !cacheCollected` false. Do not add a second interaction path.

- [ ] **Step 4: 씬 계약·시각 상태 검사와 타입 검사를 통과시킨다.**

Run: `cd client && npx vitest run src/scene/__tests__/visual-state.test.ts src/scene/__tests__/m4-scene-contract.test.ts && npm run check`

Expected: focused tests PASS and Svelte/TypeScript reports 0 errors and 0 warnings.

- [ ] **Step 5: M4 씬 표현을 커밋한다.**

```bash
git add client/src/scene/M4BossGate.svelte client/src/scene/GameScene.svelte \
  client/src/scene/MonsterLayer.svelte client/src/scene/MonsterEntity.svelte \
  client/src/scene/visual-state.ts client/src/scene/__tests__/visual-state.test.ts \
  client/src/scene/__tests__/m4-scene-contract.test.ts
git commit -m "feat: render M4 mine gate and boss states"
```

## Task 6: 전체 검증, 브라우저 QA, 마일스톤 문서화

**Files:**
- Modify: `client/README.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: Tasks 1–5의 실행 가능한 M4 POC.
- Produces: 검증 결과와 M4 완료 상태를 기록한 프로젝트 문서.

- [ ] **Step 1: 전체 자동 검증을 실행한다.**

Run:

```bash
cd client && npx vitest run && npm run check && npm run build
cd .. && node scripts/validate-runtime-data.mjs
```

Expected: 모든 Vitest 테스트 PASS, Svelte/TypeScript 0 errors and 0 warnings, production build PASS, runtime data validation PASS. 기존 Vite 500kB 안내는 비차단 경고로 기록한다.

- [ ] **Step 2: 개발 서버를 실행하고 브라우저 QA를 수행한다.**

Run: `cd client && npm run dev -- --host 127.0.0.1`

Playwright MCP에서 1280×720과 390×844로 아래를 확인한다.

1. 첫 화면이 흑심 채굴장이고 `현재 결 · 화`, 화 변신 버튼, 오타 요정 목표 스트립이 보인다.
2. 오타 요정을 선택·자동공격해 골드/`음` 갱신과 열린 문을 확인한다.
3. 열린 문을 클릭해 보스방으로 전환되고, 타깃 HUD 아래의 의뢰 스트립이 남는지 확인한다.
4. 보스의 단단한 심 6초, 약점 노출 4초, 변신 해제 상태의 실패, 화 변신 적중 후 그로기 10초와 정지 상태를 확인한다.
5. 보스 처치 뒤 의뢰 완료가 고정되고 보스가 다시 나타나지 않는지 확인한다.
6. 390px에서 패널 폭이 뷰포트를 넘지 않고, 타깃·목표·M3 패널·자원 패널이 겹치지 않는지 확인한다.
7. `prefers-reduced-motion: reduce`에서 상태 텍스트를 유지하고 반복 HUD/발광 애니메이션을 중지하는지 확인한다.

Keep screenshots and transient browser artifacts outside the repository. A favicon 404 is non-blocking when all game resources and console behavior are otherwise clean.

- [ ] **Step 3: M4 완료 내용을 문서에 기록한다.**

In `client/README.md`, change the M4 row to:

```markdown
| M4 | 흑심 채굴장 정예·문, 몽당연필 기사단장 단단한 심/약점 노출/그로기, 목표 HUD | **완료** (2026-08-04) |
```

Append a concise M4 paragraph after the M3 description stating that M4 begins at the completed `결: 화` checkpoint, uses a local mine-to-boss transition, keeps the elite respawn, and holds a cleared boss until reload. State explicitly that monster geometry remains placeholder art.

In `progress.md`, replace the final “다음은 M4” sentence with a dated M4 completion summary containing the same scope, verification commands, and the statement that server/WebSocket work remains after this client POC.

- [ ] **Step 4: 문서 변경을 확인하고 커밋한다.**

Run: `git diff --check && git status --short`

Expected: only `client/README.md` and `progress.md` are staged for this task; do not stage user `.gitignore`, root `.DS_Store`, or `.superpowers/` artifacts.

```bash
git add client/README.md progress.md
git commit -m "docs: record M4 mine and boss milestone"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 cover M3 checkpoint seeding, the locked/one-time-open gate, entity-specific drops, the exact boss state loop, elite respawn, terminal boss clear, and pure simulation boundaries. Task 4 covers the approved A objective strip, boss text/timer, compact completed-M3 panel, mobile placement, and non-color state labels. Task 5 covers the local gate and explicitly temporary rank silhouettes. Task 6 covers automated verification, browser QA, documentation, no-push policy, and user-file preservation.
- **Placeholder scan:** The plan contains no unresolved implementation markers. Each new module, exported name, test case, expected failure, command, and commit is specified.
- **Type consistency:** `BossState` is created in Task 1, stored in `M4Progress` in Task 2, used by `WorldState.m4` in Task 3, published through `HudSnapshot.m4` in Task 4, and rendered as the optional `bossPhase` argument in Task 5. `M4_ENTITY_IDS` is defined before world and scene use. `createRuntimeMonster()` is defined before entity-specific world creation.
