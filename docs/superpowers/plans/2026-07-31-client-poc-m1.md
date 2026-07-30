# 클라 단독 POC — 마일스톤 1 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 없이 브라우저에서 고정 아이소메트릭 3D 씬 위를 클릭 이동하는 캐릭터를 띄운다 — POC의 뼈대이자 이후 모든 마일스톤의 토대.

**Architecture:** 게임 로직(`client/src/game/`)은 렌더링과 분리된 순수 TypeScript 모듈로 두고, Threlte 컴포넌트(`client/src/scene/`)는 로직 상태를 구독해 그리기만 한다. 이후 Rust 서버 권위 구조로 이전할 때 로직 모듈만 교체 대상이 되게 한다.

**Tech Stack:** Svelte 5 + TypeScript + Vite + Threlte(@threlte/core, @threlte/extras) + Three.js. 테스트는 Vitest(순수 로직만 대상, 렌더링은 눈으로 검증).

**POC 모드 각서:** 이 계획은 M1만 상세화한다. M2 이후는 M1 결과를 보고 각각 별도 계획으로 잡는다. 렌더링·조작감은 TDD 대상이 아니며(화면 보고 조정), 순수 로직(이동 계산 등)만 테스트를 붙인다.

---

## 마일스톤 로드맵 (M1만 이 문서에서 상세화)

| 마일스톤 | 내용 | 검증 |
| :--- | :--- | :--- |
| **M1 (이 문서)** | 스캐폴딩 + 아이소메트릭 카메라 + 클릭 이동 | 브라우저에서 클릭한 곳으로 캐릭터가 걸어감 |
| M2 | 몬스터 스폰, 타깃 선택, 자동공격 토글, 전투·드랍(음/골드) | 새벽 들판 자동사냥 루프 |
| M3 | 수집 → 제작(`결: 화`) → 장착 → 변신 | 첫 제작 루프 완주 |
| M4 | 흑심 채굴장 씬 + 몽당연필 기사단장 + 첫 20분 연결 | 첫 20분 루프 완주 |

## 파일 구조 (M1)

```
client/
  package.json, vite.config.ts, tsconfig.json, svelte.config.js, index.html
  src/
    main.ts                     # 앱 진입점
    App.svelte                  # 루트: Canvas + HUD 셸
    game/
      sim/
        world.ts                # 월드 상태(플레이어 위치·이동 목표)와 tick(dt) — 순수 로직
        movement.ts             # 이동 계산(목표를 향해 속도만큼 전진) — 순수 로직
      sim/__tests__/movement.test.ts
      data/ (기존 fixture 유지)
      types/ (기존 유지)
    scene/
      Scene.svelte              # Threlte 씬 루트: 조명, 바닥, 카메라, 플레이어
      IsoCamera.svelte          # 고정 아이소메트릭 OrthographicCamera (플레이어 추적)
      Ground.svelte             # 바닥 평면 + 클릭 레이캐스트 → 이동 목표 설정
      Player.svelte             # 캡슐 메시, world 상태의 위치를 반영
```

---

### Task 1: Vite + Svelte + Threlte 스캐폴딩

**Files:**
- Create: `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/svelte.config.js`, `client/index.html`, `client/src/main.ts`, `client/src/App.svelte`

- [ ] **Step 1: 스캐폴딩 생성**

`client/`에 기존 `src/game/` 데이터를 보존한 채 Vite Svelte-TS 템플릿을 얹는다:

```bash
cd client && npm create vite@latest . -- --template svelte-ts
# 기존 파일 충돌 시 template 파일만 수동 병합 (src/game/ 은 건드리지 않음)
npm install
npm install three @threlte/core @threlte/extras
npm install -D @types/three vitest
```

- [ ] **Step 2: dev 서버 기동 확인**

Run: `npm run dev`
Expected: Vite 템플릿 기본 페이지가 브라우저에 뜬다.

- [ ] **Step 3: Commit**

```bash
git add client && git commit -m "feat: scaffold Svelte+Threlte client app"
```

### Task 2: 이동 로직 (순수 모듈, TDD)

**Files:**
- Create: `client/src/game/sim/movement.ts`, `client/src/game/sim/world.ts`
- Test: `client/src/game/sim/__tests__/movement.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, it, expect } from 'vitest';
import { stepToward } from '../movement';

describe('stepToward', () => {
  it('목표를 향해 speed*dt 만큼 전진한다', () => {
    const next = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
    expect(next.x).toBeCloseTo(0.5);
    expect(next.z).toBeCloseTo(0);
  });
  it('남은 거리가 한 걸음보다 짧으면 목표에 스냅한다', () => {
    const next = stepToward({ x: 9.9, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
    expect(next).toEqual({ x: 10, z: 0 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run: `npx vitest run` / Expected: FAIL (movement 미존재)

- [ ] **Step 3: 최소 구현**

```ts
// movement.ts
export interface Vec2 { x: number; z: number; }

export function stepToward(pos: Vec2, target: Vec2, speed: number, dt: number): Vec2 {
  const dx = target.x - pos.x, dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  const step = speed * dt;
  if (dist <= step) return { ...target };
  return { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step };
}
```

```ts
// world.ts — 렌더러가 구독하는 단일 월드 상태
import { stepToward, type Vec2 } from './movement';

export const PLAYER_SPEED = 6; // m/s, 화면 보고 조정

export interface WorldState {
  player: { pos: Vec2; target: Vec2 | null };
}

export function createWorld(): WorldState {
  return { player: { pos: { x: 0, z: 0 }, target: null } };
}

export function setMoveTarget(w: WorldState, target: Vec2): void {
  w.player.target = target;
}

export function tick(w: WorldState, dt: number): void {
  const p = w.player;
  if (!p.target) return;
  p.pos = stepToward(p.pos, p.target, PLAYER_SPEED, dt);
  if (p.pos.x === p.target.x && p.pos.z === p.target.z) p.target = null;
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run: `npx vitest run` / Expected: PASS

- [ ] **Step 5: Commit** — `git add client/src/game/sim && git commit -m "feat: add pure movement sim with tests"`

### Task 3: 아이소메트릭 씬 + 클릭 이동 연결

**Files:**
- Create: `client/src/scene/Scene.svelte`, `client/src/scene/IsoCamera.svelte`, `client/src/scene/Ground.svelte`, `client/src/scene/Player.svelte`
- Modify: `client/src/App.svelte`

- [ ] **Step 1: 씬 구성**

App.svelte에서 `<Canvas><Scene /></Canvas>`를 띄우고, Scene은 Svelte 5 `$state`로 감싼 world를 `useTask`(Threlte 프레임 훅)에서 `tick(world, delta)`로 갱신한다.

핵심 코드 — 고정 아이소메트릭 카메라(플레이어 추적):

```svelte
<!-- IsoCamera.svelte -->
<script lang="ts">
  import { T } from '@threlte/core';
  let { targetX = 0, targetZ = 0 } = $props();
  const OFFSET = { x: 20, y: 20, z: 20 }; // 45° 대각 부감, 화면 보고 조정
</script>
<T.OrthographicCamera
  makeDefault
  zoom={40}
  position={[targetX + OFFSET.x, OFFSET.y, targetZ + OFFSET.z]}
  oncreate={(cam) => cam.lookAt(targetX, 0, targetZ)}
/>
```

바닥 클릭 → 레이캐스트 지점으로 이동 목표 설정:

```svelte
<!-- Ground.svelte -->
<script lang="ts">
  import { T } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  let { onGroundClick } = $props();
  interactivity();
</script>
<T.Mesh rotation.x={-Math.PI / 2} onclick={(e) => onGroundClick(e.point.x, e.point.z)}>
  <T.PlaneGeometry args={[100, 100]} />
  <T.MeshStandardMaterial color="#4a5d3a" />
</T.Mesh>
```

Player.svelte는 캡슐 메시(`T.CapsuleGeometry`)로 world의 `player.pos`를 렌더링. Scene.svelte가 조명(ambient + directional) 포함 전체를 조립한다.

- [ ] **Step 2: 브라우저 검증**

Run: `npm run dev`
Expected: 아이소메트릭 뷰의 초록 바닥 위 캡슐이 보이고, 바닥 클릭 시 그 지점으로 일정 속도로 걸어가며 카메라가 따라온다.

- [ ] **Step 3: 조작감 1차 조정** — 속도(`PLAYER_SPEED`), zoom, 카메라 오프셋을 화면 보고 조정하고 값 확정.

- [ ] **Step 4: Commit** — `git add client/src && git commit -m "feat: isometric scene with click-to-move player"`

---

## Self-Review 결과
- 커버리지: M1 목표(스캐폴딩·카메라·클릭 이동) 3개 태스크로 전부 커버.
- 타입 일관성: `Vec2`/`WorldState`를 Task 2에서 정의, Task 3이 동일 모듈 사용.
- 의도된 비상세: Scene/Player의 전체 코드는 구현 시 Threlte 최신 API 문서를 확인해 작성한다(Threlte 8/Svelte 5 API 변동이 잦아 계획서의 정확한 코드가 오히려 낡을 수 있음). 검증 기준은 Step 2의 브라우저 확인으로 대신한다.
