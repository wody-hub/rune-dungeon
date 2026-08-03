# Client POC M2.5 Monster Counterattack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every engaged ink slime deal timed physical damage to runtime player HP and show that HP in the existing HUD.

**Architecture:** Keep `monster-ai.ts` spatial-only. Add a focused pure combat module that advances each monster's attack clock and applies the existing physical mitigation formula, then let `world.ts` call it after AI. Publish player HP through the existing low-frequency HUD snapshot boundary.

**Tech Stack:** TypeScript 6, Vitest 4, Svelte 5, Vite 8, Threlte 8; Node.js `>=22.12.0`.

## Global Constraints

- Player HP initializes from `player.json` at `196 / 196` and clamps at `0`.
- Ink slime fixture timing stays `hitFrameMs=420` and `attackMotionMs=1400`.
- Ink slime fixture damage stays `baseDamage=18`; player defense stays `defenseFromStr=12`; one fixture hit deals `16`.
- Every alive `engaged` monster attacks independently in stable map iteration order.
- Any non-`engaged` mode, death, or respawn resets the monster attack clock.
- Player defeat, recovery, dodge, hit stun, animation, VFX, SFX, and damage text are out of scope.
- Do not add dependencies.
- `client/src/game/` must not import Svelte, Three.js, Threlte, or use browser globals.

---

### Task 1: Runtime vitals and monster attack lifecycle

**Files:**
- Modify: `client/src/game/sim/fsm/player-fsm.ts`
- Modify: `client/src/game/sim/fsm/__tests__/player-fsm.test.ts`
- Modify: `client/src/game/sim/entities/monster.ts`
- Modify: `client/src/game/sim/entities/__tests__/monster.test.ts`
- Modify: `client/src/game/sim/world.ts`

**Interfaces:**
- Produces: `PlayerVitals { hp: number; maxHp: number }`
- Produces: `createPlayerState(vitals: PlayerVitals): PlayerState`
- Produces: `resetMonsterAttack(monster: MonsterState): void`
- Adds to `MonsterState`: `attackElapsedMs: number`, `pendingHitMs: number | null`

- [ ] **Step 1: Write failing player vitals tests and update test fixtures**

In `player-fsm.test.ts`, add the attack clock fields to `livingMonster`, pass explicit vitals in `beforeEach`, and add this test:

```ts
const livingMonster: MonsterState = {
  entityId: 'slime-1',
  definitionId: 'slime',
  spawnPos: { x: 3, z: 0 },
  pos: { x: 3, z: 0 },
  hp: 140,
  alive: true,
  deathProcessed: false,
  mode: 'idle',
  respawnRemainingMs: null,
  attackElapsedMs: 0,
  pendingHitMs: null,
};

beforeEach(() => {
  player = createPlayerState({ hp: 196, maxHp: 196 });
});

it('creates runtime player vitals from content values', () => {
  expect(player).toMatchObject({ hp: 196, maxHp: 196 });
});

it('clamps runtime player vitals into the valid range', () => {
  expect(createPlayerState({ hp: 250, maxHp: 196 })).toMatchObject({
    hp: 196,
    maxHp: 196,
  });
  expect(createPlayerState({ hp: -1, maxHp: 196 })).toMatchObject({
    hp: 0,
    maxHp: 196,
  });
  expect(createPlayerState({ hp: 10, maxHp: -1 })).toMatchObject({
    hp: 0,
    maxHp: 0,
  });
});
```

Also change the top-level initializer to:

```ts
let player = createPlayerState({ hp: 196, maxHp: 196 });
```

- [ ] **Step 2: Write failing monster lifecycle tests**

Extend the creation assertion:

```ts
expect(monster).toMatchObject({
  entityId: 'slime-1',
  definitionId: 'slime',
  hp: 140,
  alive: true,
  deathProcessed: false,
  mode: 'idle',
  pos: { x: 3, z: 4 },
  attackElapsedMs: 0,
  pendingHitMs: null,
});
```

Add:

```ts
it('clears attack timing when killed and respawned', () => {
  const monster = createMonster('slime-1', definition, { x: 3, z: 4 });
  monster.mode = 'engaged';
  monster.attackElapsedMs = 200;
  monster.pendingHitMs = 220;

  killMonster(monster, 2_000);

  expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });

  monster.attackElapsedMs = 300;
  monster.pendingHitMs = 120;
  tickMonsterRespawn(monster, 2_000, definition.maxHp);

  expect(monster).toMatchObject({
    alive: true,
    attackElapsedMs: 0,
    pendingHitMs: null,
  });
});
```

- [ ] **Step 3: Run RED tests**

Run:

```bash
cd client
npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts src/game/sim/entities/__tests__/monster.test.ts
```

Expected: FAIL because `createPlayerState` has no vitals contract and `MonsterState` has no attack clock.

- [ ] **Step 4: Implement runtime vitals**

In `player-fsm.ts`, add:

```ts
export interface PlayerVitals {
  hp: number;
  maxHp: number;
}
```

Add `hp` and `maxHp` to `PlayerState`, then replace the factory with:

```ts
export function createPlayerState(vitals: PlayerVitals): PlayerState {
  const maxHp = Math.max(0, vitals.maxHp);
  return {
    pos: { x: 0, z: 0 },
    mode: 'idle',
    moveTarget: null,
    combatTargetId: null,
    autoAttackEnabled: false,
    attackElapsedMs: 0,
    pendingHitMs: null,
    hp: Math.min(maxHp, Math.max(0, vitals.hp)),
    maxHp,
  };
}
```

- [ ] **Step 5: Implement monster attack lifecycle state**

Add the two fields to `MonsterState`, initialize them in `createMonster`, and add:

```ts
export function resetMonsterAttack(monster: MonsterState): void {
  monster.attackElapsedMs = 0;
  monster.pendingHitMs = null;
}
```

Call `resetMonsterAttack(monster)` from both `killMonster` and the successful respawn branch of `tickMonsterRespawn`.

- [ ] **Step 6: Update the world factory call so TypeScript can compile**

In the `createWorld` return object, replace the existing `player: createPlayerState()` property with:

```ts
player: createPlayerState({
  hp: content.player.hp.current,
  maxHp: content.player.hp.max,
}),
```

Keep the existing parsed `player` content variable because the runtime content and inventory construction also consume it.

- [ ] **Step 7: Run GREEN tests and focused type check**

Run:

```bash
cd client
npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts src/game/sim/entities/__tests__/monster.test.ts
npm run check
```

Expected: both test files PASS; check reports `0 errors and 0 warnings`.

- [ ] **Step 8: Commit Task 1**

```bash
git add client/src/game/sim/fsm/player-fsm.ts client/src/game/sim/fsm/__tests__/player-fsm.test.ts client/src/game/sim/entities/monster.ts client/src/game/sim/entities/__tests__/monster.test.ts client/src/game/sim/world.ts
git commit -m "feat: add runtime player hp and monster attack clocks"
```

---

### Task 2: Timed monster counterattacks

**Files:**
- Create: `client/src/game/sim/combat/monster-attack.ts`
- Create: `client/src/game/sim/combat/__tests__/monster-attack.test.ts`
- Modify: `client/src/game/sim/world.ts`
- Modify: `client/src/game/sim/__tests__/world.test.ts`

**Interfaces:**
- Consumes: `MonsterState`, `PlayerState`, `RandomSource`, `resetMonsterAttack`
- Produces: `MonsterAttackConfig`
- Produces: `tickMonsterAttack(monster, player, config, elapsedMs, random): void`

- [ ] **Step 1: Write the complete pure counterattack RED suite**

Create `monster-attack.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createMonster, type MonsterState } from '../../entities/monster';
import { createPlayerState, type PlayerState } from '../../fsm/player-fsm';
import {
  tickMonsterAttack,
  type MonsterAttackConfig,
} from '../monster-attack';

const config: MonsterAttackConfig = {
  baseDamage: 18,
  attackMotionMs: 1_400,
  hitFrameMs: 420,
  playerDefense: 12,
};
const zeroRandom = { next: () => 0 };

describe('monster counterattack', () => {
  let monster: MonsterState;
  let player: PlayerState;

  beforeEach(() => {
    monster = createMonster('slime-1', { id: 'slime', maxHp: 140 }, { x: 0, z: 0 });
    monster.mode = 'engaged';
    player = createPlayerState({ hp: 196, maxHp: 196 });
  });

  it('hits exactly at the configured first hit frame', () => {
    tickMonsterAttack(monster, player, config, 419, zeroRandom);
    expect(player.hp).toBe(196);
    expect(monster.pendingHitMs).toBe(1);

    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(180);
    expect(monster.pendingHitMs).toBeNull();
  });

  it('starts the next hit from the next motion boundary', () => {
    tickMonsterAttack(monster, player, config, 1_819, zeroRandom);
    expect(player.hp).toBe(180);

    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(164);
  });

  it('processes every hit crossed by a large elapsed interval', () => {
    tickMonsterAttack(monster, player, config, 3_220, zeroRandom);
    expect(player.hp).toBe(148);
  });

  it('resets partial timing outside engaged mode', () => {
    tickMonsterAttack(monster, player, config, 200, zeroRandom);
    monster.mode = 'chasing';
    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });

    monster.mode = 'engaged';
    tickMonsterAttack(monster, player, config, 419, zeroRandom);
    expect(player.hp).toBe(196);
    tickMonsterAttack(monster, player, config, 1, zeroRandom);
    expect(player.hp).toBe(180);
  });

  it('does not attack while dead', () => {
    monster.alive = false;
    tickMonsterAttack(monster, player, config, 420, zeroRandom);
    expect(player.hp).toBe(196);
    expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });
  });

  it('clamps player hp at zero', () => {
    player.hp = 10;
    tickMonsterAttack(monster, player, config, 420, zeroRandom);
    expect(player.hp).toBe(0);
  });
});
```

- [ ] **Step 2: Write world integration RED tests**

Add to `world.test.ts` inside `world combat loop`:

```ts
it('initializes runtime player hp from fixture content', () => {
  const w = createWorld({ random: zeroRandom() });
  expect(w.player).toMatchObject({ hp: 196, maxHp: 196 });
});

it('applies a counterattack after monster AI engages', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;
  monster.pos = { x: 1.4, z: 0 };
  monster.spawnPos = { ...monster.pos };

  tick(w, 0.419);
  expect(w.player.hp).toBe(196);
  tick(w, 0.001);
  expect(w.player.hp).toBe(180);
});

it('lets engaged monsters attack on independent clocks', () => {
  const w = createWorld({ random: zeroRandom() });
  const first = w.monsters.get('slime-1')!;
  const second = w.monsters.get('slime-2')!;
  first.pos = { x: 1.4, z: 0 };
  first.spawnPos = { ...first.pos };
  second.pos = { x: -1.4, z: 0 };
  second.spawnPos = { ...second.pos };

  tick(w, 0.42);

  expect(w.player.hp).toBe(164);
  expect(first.pendingHitMs).toBeNull();
  expect(second.pendingHitMs).toBeNull();
});

it('resets a partial counterattack when pursuit resumes', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;
  monster.pos = { x: 1.4, z: 0 };
  monster.spawnPos = { ...monster.pos };
  tick(w, 0.2);
  expect(monster.pendingHitMs).toBe(220);

  w.player.pos = { x: 3, z: 0 };
  tick(w, 0.01);
  expect(monster.mode).toBe('chasing');
  expect(monster).toMatchObject({ attackElapsedMs: 0, pendingHitMs: null });
  expect(w.player.hp).toBe(196);
});
```

- [ ] **Step 3: Run RED tests**

Run:

```bash
cd client
npx vitest run src/game/sim/combat/__tests__/monster-attack.test.ts src/game/sim/__tests__/world.test.ts
```

Expected: FAIL because `monster-attack.ts` does not exist and the world has no counterattack phase.

- [ ] **Step 4: Implement the focused monster attack module**

Create `monster-attack.ts`:

```ts
import type { MonsterState } from '../entities/monster';
import { resetMonsterAttack } from '../entities/monster';
import type { PlayerState } from '../fsm/player-fsm';
import type { RandomSource } from '../random';
import { rollPhysicalDamage } from './damage';

export interface MonsterAttackConfig {
  baseDamage: number;
  attackMotionMs: number;
  hitFrameMs: number;
  playerDefense: number;
}

function applyMonsterHit(
  player: PlayerState,
  config: MonsterAttackConfig,
  random: RandomSource,
): void {
  const damage = rollPhysicalDamage(
    {
      minDamage: config.baseDamage,
      maxDamage: config.baseDamage,
      attackBonus: 0,
      damageMultiplier: 1,
      defense: config.playerDefense,
    },
    random,
  );
  player.hp = Math.max(0, player.hp - damage);
}

export function tickMonsterAttack(
  monster: MonsterState,
  player: PlayerState,
  config: MonsterAttackConfig,
  elapsedMs: number,
  random: RandomSource,
): void {
  if (!monster.alive || monster.mode !== 'engaged') {
    resetMonsterAttack(monster);
    return;
  }
  if (monster.attackElapsedMs === 0 && monster.pendingHitMs === null) {
    monster.pendingHitMs = config.hitFrameMs;
  }

  let remainingMs = elapsedMs;
  while (remainingMs > 0) {
    const hasPendingHit = monster.pendingHitMs !== null;
    const timeToEvent = hasPendingHit
      ? monster.pendingHitMs!
      : config.attackMotionMs - monster.attackElapsedMs;
    const advanceMs = Math.min(remainingMs, timeToEvent);
    monster.attackElapsedMs += advanceMs;
    if (hasPendingHit) monster.pendingHitMs = timeToEvent - advanceMs;
    remainingMs -= advanceMs;

    if (advanceMs < timeToEvent) return;
    if (hasPendingHit) {
      monster.pendingHitMs = null;
      applyMonsterHit(player, config, random);
    } else {
      monster.attackElapsedMs = 0;
      monster.pendingHitMs = config.hitFrameMs;
    }
  }
}
```

- [ ] **Step 5: Integrate counterattacks after monster AI**

Import `tickMonsterAttack` in `world.ts`. Replace the monster AI loop with this two-phase sequence so all spatial modes settle before any damage resolves:

```ts
for (const monster of w.monsters.values()) {
  tickMonsterAi(monster, w.player.pos, w.content.monster, dt);
}
for (const monster of w.monsters.values()) {
  tickMonsterAttack(
    monster,
    w.player,
    {
      baseDamage: w.content.monster.baseDamage,
      attackMotionMs: w.content.monster.attackMotionMs,
      hitFrameMs: w.content.monster.hitFrameMs,
      playerDefense: w.content.player.combatProfile.defenseFromStr,
    },
    elapsedMs,
    w.random,
  );
}
```

- [ ] **Step 6: Run GREEN tests**

Run:

```bash
cd client
npx vitest run src/game/sim/combat/__tests__/monster-attack.test.ts src/game/sim/__tests__/world.test.ts
npx vitest run
```

Expected: focused tests and the full suite PASS with no existing pursuit or player-attack regression.

- [ ] **Step 7: Commit Task 2**

```bash
git add client/src/game/sim/combat/monster-attack.ts client/src/game/sim/combat/__tests__/monster-attack.test.ts client/src/game/sim/world.ts client/src/game/sim/__tests__/world.test.ts
git commit -m "feat: apply timed monster counterattacks"
```

---

### Task 3: Player HP HUD

**Files:**
- Modify: `client/src/ui/hud-model.ts`
- Modify: `client/src/ui/__tests__/hud-model.test.ts`
- Modify: `client/src/ui/Hud.svelte`
- Modify: `client/src/app.css`

**Interfaces:**
- Consumes: `WorldState.player.hp`, `WorldState.player.maxHp`
- Adds to `HudSnapshot`: `playerHp: number`, `playerMaxHp: number`

- [ ] **Step 1: Write HUD model RED tests**

Update the exact snapshot expectation in `hud-model.test.ts` to include:

```ts
playerHp: 196,
playerMaxHp: 196,
```

Then add:

```ts
it('publishes when visible player hp changes', () => {
  const world = createWorld();
  const before = createHudSnapshot(world);
  world.player.hp -= 16;
  const after = createHudSnapshot(world);

  expect(after).toMatchObject({ playerHp: 180, playerMaxHp: 196 });
  expect(hudSnapshotsEqual(before, after)).toBe(false);
});
```

- [ ] **Step 2: Run HUD RED test**

Run:

```bash
cd client
npx vitest run src/ui/__tests__/hud-model.test.ts
```

Expected: FAIL because `HudSnapshot` does not contain player HP.

- [ ] **Step 3: Extend the HUD snapshot contract**

Add to `HudSnapshot`:

```ts
playerHp: number;
playerMaxHp: number;
```

Add to `createHudSnapshot`'s return object:

```ts
playerHp: world.player.hp,
playerMaxHp: world.player.maxHp,
```

Add these comparisons to the first condition in `hudSnapshotsEqual`:

```ts
left.playerHp !== right.playerHp ||
left.playerMaxHp !== right.playerMaxHp ||
```

- [ ] **Step 4: Render the player HP row and bar**

In `Hud.svelte`, insert after the player state row:

```svelte
<div>
  <span>HP</span>
  <strong>{snapshot.playerHp} / {snapshot.playerMaxHp}</strong>
</div>
<div class="player-hp-track">
  <div
    class="player-hp-fill"
    style:width={`${snapshot.playerMaxHp > 0
      ? Math.max(0, snapshot.playerHp / snapshot.playerMaxHp) * 100
      : 0}%`}
  ></div>
</div>
```

In `app.css`, add:

```css
.player-panel > .player-hp-track {
  display: block;
  height: 8px;
  margin: 8px 0;
  overflow: hidden;
  border-radius: 999px;
  background: #272a30;
}

.player-hp-fill {
  height: 100%;
  border-radius: inherit;
  background: #4aa66f;
  transition: width 100ms linear;
}
```

Use distinct class names so the existing target `.hp-fill` browser probe continues to select target HP rather than player HP.

- [ ] **Step 5: Run HUD GREEN and compiler checks**

Run:

```bash
cd client
npx vitest run src/ui/__tests__/hud-model.test.ts
npm run check
```

Expected: HUD tests PASS and check reports `0 errors and 0 warnings`.

- [ ] **Step 6: Commit Task 3**

```bash
git add client/src/ui/hud-model.ts client/src/ui/__tests__/hud-model.test.ts client/src/ui/Hud.svelte client/src/app.css
git commit -m "feat: show player hp in combat hud"
```

---

### Task 4: Handoff documentation and static verification

**Files:**
- Modify: `client/README.md`
- Modify: `progress.md`
- Create during execution: `.si-planning/m2-5-monster-counterattack/tdd-report.md`

**Interfaces:**
- Consumes: completed Tasks 1-3 and their RED/GREEN command output
- Produces: current milestone handoff and TDD evidence

- [ ] **Step 1: Update the client milestone table**

Replace the counterattack row with:

```markdown
| M2.5 반격 | 몬스터 공격, 플레이어 HP·피격 | **완료** (2026-08-03) |
```

Insert this next-work row before M3:

```markdown
| POC 디자인 체크포인트 | HUD 정보 구조, 색상·타이포, 플레이어·슬라임 표현 방향, 임시 에셋 기준 | 다음 작업 |
```

Add a short paragraph stating the exact `420ms` hit frame, `1400ms` motion, `18` base damage, `12` defense, `16` fixture damage, independent engaged-monster clocks, reset rules, and the excluded player-defeat/feedback scope. State that the first visual design checkpoint comes next, followed by M3.

- [ ] **Step 2: Update the progress handoff**

Add an M2.5 counterattack completion bullet under the POC progress, add the first visual design checkpoint as the next POC step, and replace the next implementation sentence with:

```markdown
- M2 순수 전투 코어, 시각 연결, M2.5 추적·반격이 완료됐다. 다음은 첫 비주얼 디자인 체크포인트로 HUD 정보 구조, 색상·타이포, 플레이어·슬라임 표현 방향과 임시 에셋 기준을 확정한 뒤 M3 수집 → 제작(`결: 화`) → 장착 → 변신 최소 루프로 진행한다.
```

- [ ] **Step 3: Write TDD evidence**

Create `tdd-report.md` with:

```markdown
# M2.5 몬스터 반격 TDD 결과

## RED

- 런타임 상태: 실행 명령, 실패한 assertion 또는 타입 오류, 당시 커밋
- 공격 시계: 실행 명령, 누락 모듈·피해 assertion 실패, 당시 커밋
- HUD: 실행 명령, 누락 스냅샷 필드 assertion 실패, 당시 커밋

## GREEN

- 각 집중 테스트 명령과 통과 테스트 수
- 전체 Vitest 파일·테스트 수
- Svelte/TypeScript 검사 결과
- 빌드와 런타임 데이터 검사 결과

## REFACTOR

- 공간 AI와 공격 판정 분리 유지
- 제품 동작 변경 없는 정리 여부

## 커밋

- Task 1 SHA와 메시지
- Task 2 SHA와 메시지
- Task 3 SHA와 메시지
```

Replace each descriptive line with the actual captured command output and SHA before committing; do not leave template prose in the final report.

- [ ] **Step 4: Run the full static gate**

Run from the repository root:

```bash
export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH
(cd client && npm run check)
(cd client && npx vitest run)
(cd client && npm run build)
node scripts/validate-runtime-data.mjs
if rg -n "from ['\"](?:svelte|three|@threlte)|import\\(['\"](?:svelte|three|@threlte)" client/src/game; then
  exit 1
fi
if rg -n '\b(window|document|navigator|location|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|HTMLElement|HTMLCanvasElement|fetch|WebSocket)\b' client/src/game; then
  exit 1
fi
```

Expected: check has `0 errors and 0 warnings`; all Vitest tests PASS; build succeeds with only the existing chunk-size advisory; runtime validation prints `runtime data OK`; both boundary searches return no matches.

- [ ] **Step 5: Commit Task 4**

```bash
git add client/README.md progress.md .si-planning/m2-5-monster-counterattack/tdd-report.md
git commit -m "docs: record M2.5 monster counterattack"
```

---

## Post-implementation pipeline gates

After Task 4, do not merge yet. Run the remaining `riskzero-si` stages in order:

1. Plan review result is already required before Task 1 begins.
2. Project-standard code review and TDD evidence review.
3. Diff-based PR safety review.
4. Browser QA checklist generation for exact timing, reset, multiple attackers, HP HUD, and existing pursuit/combat regressions.
5. Browser QA, bug-fix loop if needed, and final evidence report.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 2 plan gaps found and folded, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | First visual checkpoint follows this slice |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Not run |

**VERDICT:** ENG CLEARED — ready to implement.

NO UNRESOLVED DECISIONS
