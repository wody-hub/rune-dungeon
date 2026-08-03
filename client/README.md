# Rune Dungeon Client (POC)

Svelte 5 + TypeScript + Vite + Threlte 8(WebGL) 클라이언트. 현재 클라 단독 POC 단계로, 서버 없이 로컬 로직만으로 플레이 루프를 검증한다.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run check      # svelte-check + tsc
npx vitest run     # 순수 로직 단위 테스트
```

## 디렉토리 설계

```
src/
├── main.ts / App.svelte / app.css     ← 앱 셸 (Canvas 소유, renderMode="manual")
│
├── game/                              ← 【순수 게임 로직】 Three.js·Svelte를 import하지 않음
│   ├── sim/                           ← 시뮬레이션 (매 틱 계산되는 것들)
│   │   ├── world.ts                   ←   월드 상태 + tick(dt) + GameIntent 큐 (심장부)
│   │   ├── movement.ts               ←   이동 수식
│   │   ├── camera.ts                  ←   아이소메트릭 카메라 수식 (pitch atan(1/√2), yaw -45°)
│   │   └── __tests__/                 ←   vitest 커버
│   ├── loop/fixed-step.ts             ← 60Hz 고정스텝 타이머 (캐치업 5스텝 클램프, 백로그 폐기)
│   ├── data/                          ← 게임 데이터 fixture (data/design/과 계약 일치)
│   └── types/                         ← 데이터 타입
│
└── scene/                             ← 【렌더링】 Threlte 컴포넌트, 그리기만 담당
    ├── GameScene.svelte               ← 오케스트레이터: world 생성 + rAF 루프 소유
    ├── IsoCamera.svelte               ← Orthographic 카메라, 오프셋 보존 하드 팔로우
    ├── GroundLayer.svelte             ← 바닥 + 클릭 레이캐스트
    └── PlayerLayer.svelte             ← 플레이어 메시
```

## 설계 원칙 (OpenMMO 구조 분석 기반 — 코드 복사 금지, 패턴만 채용)

1. **`game/` ↔ `scene/` 단방향 의존.** `game/`은 순수 TS라 브라우저 없이 전부 테스트되며, 이후 Rust 서버 권위 구조로 이관할 코드가 정확히 `game/sim/`이다. 절단선이 미리 그어져 있다.
2. **반응성 경계.** 매 프레임 바뀌는 값(위치·회전 등)은 Svelte 반응성 그래프에 올리지 않는다. `world`는 plain object이고, 루프가 `bind:this`로 잡은 레이어의 `update()`를 직접 호출해 메시를 제자리 변형한다. Svelte 반응성(`$state`/store/`SvelteMap`)은 저빈도 상태(HUD·설정)와 엔티티 마운트/언마운트에만 쓴다.
3. **렌더는 루프가 주도.** `<Canvas renderMode="manual">` + 자체 rAF 고정스텝 루프가 시뮬 후 `advance()`를 호출한다. 시뮬(60Hz)과 렌더 캡을 독립 조절할 수 있다.
4. **입력은 Intent 큐.** 입력을 즉시 실행하지 않고 `GameIntent` 판별 유니온으로 큐에 넣어 프레임 틱에서 소비한다. 시뮬레이션에는 지면 이동, 몬스터 타깃 선택, 자동공격 전환 variant가 있으며, 씬은 지면 클릭과 몬스터 클릭을 각각의 intent로 큐잉한다.

데이터 흐름은 항상 한 방향이다:

```
입력 → GameIntent 큐 → tick(world, dt)이 소비 → world 갱신 → 레이어 update() → advance() 렌더
```

## 마일스톤 현황

| 마일스톤 | 내용 | 상태 |
| :--- | :--- | :--- |
| M1 | 스캐폴딩 + 아이소메트릭 카메라 + 클릭 이동 | **완료** (2026-07-31) |
| M2 | 순수 전투 코어: 몬스터 런타임, 타깃/자동공격, 피해·드랍·재스폰 | **완료** (2026-07-31) |
| M2 시각 연결 | MonsterLayer 3D 렌더링, 몬스터 타깃 입력, HUD | **완료** (2026-07-31) |
| M2.5 추적 | 몬스터 감지·추적·정지·복귀 | **완료** (2026-07-31) |
| M2.5 반격 | 몬스터 공격, 플레이어 HP·피격 | **완료** (2026-08-03) |
| POC 디자인 체크포인트 | HUD 정보 구조, 색상·타이포, 플레이어·슬라임 표현 방향, 임시 에셋 기준 | 다음 작업 |
| M3 | 수집 → 제작(`결: 화`) → 장착 → 변신 | 예정 |
| M4 | 흑심 채굴장 씬 + 몽당연필 기사단장 + 첫 20분 연결 | 예정 |

M2 순수 전투 코어는 `game/sim/fsm/`의 플레이어 상태기계(`idle` / `moving` / `attacking`), 먹물 슬라임 런타임 상태, 타깃 선택·자동 접근/공격, 피해, 사망당 1회 보상(골드·음), 재스폰까지 구현했다. 기본 재스폰 지연은 `5000ms`다.

M2 시각 연결은 `MonsterEntity`와 `MonsterLayer`의 명령형 `update()`로 3마리 먹물 슬라임의 위치·생존·선택 상태를 그린다. 몬스터 한 번 클릭은 타깃 선택, 더블클릭은 타깃 선택 후 자동공격 시작으로 정규화된다. HUD는 Canvas 밖 형제 컴포넌트이며, 위치를 제외한 표시 값이 달라질 때만 스냅샷을 받는다.

M2.5 추적은 먹물 슬라임의 순수 FSM(`idle` / `chasing` / `engaged` / `returning`)과 월드 틱 연결을 구현한다. 감지 범위는 `3.0`, 정지 거리는 `1.4`, 추적 포기 거리는 `4.5`, 스폰 이탈 한계는 `6.0`, 이동 속도는 `4.2`다. 초기 배치에서는 모두 대기하며, 복귀 중에는 재감지하지 않는다.

M2.5 반격은 `engaged` 몬스터마다 독립 공격 시계를 유지한다. 먹물 슬라임의 피격 프레임은 정확히 `420ms`, 공격 모션은 `1400ms`, 기본 피해는 `18`, 플레이어 방어력은 `12`이며 fixture 피해는 `16`이다. 몬스터가 죽거나 `engaged`를 벗어나면 시계가 초기화되고, 재스폰에 성공해도 초기 상태로 되돌아간다. 플레이어 전투 불능과 피격 피드백은 이 범위에서 제외했다. 다음은 첫 비주얼 디자인 체크포인트로 HUD 정보 구조, 색상·타이포, 플레이어·슬라임 표현 방향과 임시 에셋 기준을 정하고, 그 뒤 M3를 진행한다.

## 조정 노브 (화면 보고 확정할 값)

- 이동 속도: `PLAYER_SPEED = 6` (`game/sim/world.ts`)
- 줌: `zoom = 40` (`scene/IsoCamera.svelte`)
- 카메라 거리·프러스텀: `ISO_DISTANCE = 50`, `FRUSTUM_HEIGHT = 20` (`game/sim/camera.ts`)
- 전투 논리 거리 → 월드 단위: `LOGICAL_PX_TO_WORLD_UNIT = 0.1` (`game/sim/runtime-content.ts`)
- 몬스터 재스폰: `5000ms` 기본값 (`game/sim/world.ts`)
- 먹물 슬라임 추적: 이동 `4.2`, 감지 `3.0`, 정지 `1.4`, 추적 포기 `4.5`, 이탈 한계 `6.0` (`game/sim/runtime-content.ts`)

## 디버그

개발 모드에서 `window.__world`로 월드 상태를 콘솔에서 관찰할 수 있다.
