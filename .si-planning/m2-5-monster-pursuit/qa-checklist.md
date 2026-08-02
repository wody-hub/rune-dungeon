# QA 체크리스트: M2.5 몬스터 추적

## 대상 화면 정보

- 프로젝트: `rune-dungeon`
- 기능: M2.5 먹물 슬라임 감지·추적·정지·복귀
- URL: `http://127.0.0.1:5173/`
- 실행 명령: `cd client && npm run dev -- --host 127.0.0.1`
- 화면: Svelte 5 + Threlte 단일 WebGL 게임 화면
- 인증·백엔드·DB: 없음
- 기준 설계: `docs/superpowers/specs/2026-07-31-client-poc-m2-5-monster-pursuit-design.md`
- 제외 범위: 몬스터 공격, 플레이어 HP·피격·사망, 경로 탐색, 충돌, 애니메이션, 어그로 VFX

## 식별된 관련 파일

| 구분 | 파일 | 설명 |
|---|---|---|
| 화면 진입 | `client/src/App.svelte` | WebGL Canvas와 HUD 배치 |
| 게임 루프 | `client/src/scene/GameScene.svelte` | 고정 스텝 월드 틱, 렌더 갱신, 개발용 `window.__world` 노출 |
| 몬스터 입력 | `client/src/scene/MonsterEntity.svelte` | 클릭 선택, 더블클릭 자동공격, 위치·생존·선택 렌더링 |
| HUD | `client/src/ui/Hud.svelte` | 플레이어 상태, 자동공격, 재화, 선택 대상 HP 표시 |
| 몬스터 FSM | `client/src/game/sim/ai/monster-ai.ts` | `idle`·`chasing`·`engaged`·`returning` 전이와 이동 |
| 월드 통합 | `client/src/game/sim/world.ts` | 입력, 리스폰, 플레이어, 몬스터 AI 순서 |
| 생명주기 | `client/src/game/sim/entities/monster.ts` | 생성·사망·리스폰 시 모드 초기화 |
| 런타임 튜닝 | `client/src/game/sim/runtime-content.ts` | 이동·감지·공격·추적 포기·이탈 한계 값 변환 |
| 단위 검증 | `client/src/game/sim/ai/__tests__/monster-ai.test.ts` | FSM 경계·이동·복귀 테스트 |
| 통합 검증 | `client/src/game/sim/__tests__/world.test.ts` | 월드 틱, 전투, 보상, 리스폰 회귀 테스트 |

## 검증 계약

| 항목 | 기대값/규칙 |
|---|---|
| 이동 속도 | `4.2` world units/s |
| 감지 거리 | `3.0` 미만에서만 감지; 정확히 `3.0`이면 `idle` |
| 정지 거리 | `1.4` 이하에서 `engaged`; 추적 이동은 이 경계를 넘지 않음 |
| 추적 포기 | 플레이어 거리가 `4.5`를 초과하면 `returning` |
| 스폰 이탈 한계 | 스폰에서 정확히 `6.0` 이상이면 `returning` |
| 복귀 | 플레이어를 재감지하지 않고 정확한 스폰 위치까지 이동 |
| 복귀 완료 | 도착 틱에는 `idle`; 재감지는 다음 틱부터 가능 |
| 생명주기 | 생성·사망·리스폰 시 `idle`; 리스폰은 원래 스폰·최대 HP |

## 불일치 사항

코드, 승인 설계, 테스트의 값과 상태 전이는 일치한다. 이 기능은 클라이언트 단독 POC이므로 백엔드·DTO·DDL·인증 검증은 해당하지 않는다.

## 테스트 환경 및 증적 규칙

- Node.js `v22.12.0` 이상을 사용한다.
- Chrome을 1280×720, `--use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist`로 실행하고 실제 WebGL2 컨텍스트 생성을 확인한다.
- 각 시나리오 시작 전 새로고침하거나 월드 상태를 초기화해 테스트 간 간섭을 제거한다.
- 화면 조작 검증은 실제 마우스 클릭·더블클릭·지면 클릭으로 수행한다.
- `[LIVE]` 항목은 정상 rAF가 동작하는 실제 렌더링 페이지에서 수행한다.
- `[STEP]` 항목은 아래 결정적 단일 틱 페이지에서 수행하고 `window.__world` JSON을 틱 전후로 저장한다.
- 스크린샷은 `.si-planning/m2-5-monster-pursuit/evidence/screenshots/`, 상태·콘솔 로그는 `evidence/logs/`에 저장한다.
- 실패 시 기대값, 실제값, 재현 단계, 스크린샷 경로를 반드시 기록한다.

### 결정적 단일 틱 페이지 설정 (`[STEP]`)

1. 일반 화면 조작용 페이지와 별도의 새 Playwright 페이지를 만든다.
2. `page.goto()` 전에 `page.addInitScript()`로 `requestAnimationFrame`을 콜백을 실행하지 않는 함수로 교체한다. 이 페이지는 상태 검증 전용이며 화면 렌더링 판정에 사용하지 않는다.
3. `/`를 연 뒤 `window.__world`가 생성됐는지 확인한다.
4. Vite 개발 서버에서 `const { tick } = await import('/src/game/sim/world.ts')`를 실행하고 `window.__qaTick = (dt) => tick(window.__world, dt)`를 등록한다.
5. 각 항목마다 플레이어·대상 슬라임의 `pos`, `spawnPos`, `mode`, `alive`를 명시된 전제로 초기화하고 `window.__qaTick(dt)`를 정확히 한 번 호출한다.
6. 틱 직전·직후 상태를 같은 로그 파일에 기록한다. 다음 항목으로 넘어가기 전에 페이지를 새로 만든다.

---

## A. 초기 로드·렌더링

- [ ] A-1 `[LIVE]`: `/` 접속 응답이 성공하고 1280×720 Canvas가 표시된다.
- [ ] A-2 `[LIVE]`: WebGL2 컨텍스트가 생성되며 로드 후 콘솔에 `error`, uncaught exception, WebGL 초기화 실패가 없다.
- [ ] A-3 `[LIVE]`: `slime-1`, `slime-2`, `slime-3`가 모두 살아 있고 `idle`이다.
- [ ] A-4 `[LIVE]`: 세 슬라임의 초기 위치가 각각 `(3, 0)`, `(-3, 3)`, `(0, -4)`이며 최소 700ms 동안 변하지 않는다.
- [ ] A-5 `[LIVE]`: 초기 HUD가 플레이어 `대기`, 자동공격 `OFF`, 대상 패널 없음으로 표시된다.

## B. 감지·추적·정지

- [ ] B-1 `[STEP]`: 플레이어와 `idle`인 `slime-1`의 거리를 정확히 `3.0`으로 두고 `dt=1/60` 한 틱을 호출해도 슬라임이 `idle`이며 움직이지 않는다.
- [ ] B-2 `[LIVE]`: 거리를 `3.0`보다 조금 작게 만들면 `slime-1`이 `chasing`으로 바뀌고 즉시 플레이어 방향으로 이동한다.
- [ ] B-3 `[LIVE]`: `slime-1` 접근 중 `slime-2`, `slime-3`는 `idle`과 원래 스폰 위치를 유지한다.
- [ ] B-4 `[LIVE]`: 충분히 추적시키면 플레이어와 약 `1.4` 거리에서 `engaged`가 되고 더 가까이 이동하지 않는다.
- [ ] B-5 `[STEP]`: `chasing` 상태에서 플레이어를 대각선 방향 `1.4` 밖에 두고 `dt=1` 한 틱을 호출해도 추적 이동이 `1.4` 안쪽으로 오버슈트하지 않으며 `engaged`가 된다.
- [ ] B-6 `[LIVE]`: `engaged` 상태에서 플레이어가 `1.4` 밖, `4.5` 이내로 이동하면 다시 `chasing`하고 추적을 재개한다.

## C. 추적 포기·스폰 복귀

- [ ] C-1 `[STEP]`: `chasing` 상태에서 플레이어 거리를 정확히 `4.5`로 두고 `dt=1/60` 한 틱을 호출하면 `returning`이 되지 않고 추적을 계속한다.
- [ ] C-2 `[LIVE]`: 플레이어 거리가 `4.5`를 초과하면 `returning`으로 바뀌고 스폰 방향으로 이동한다.
- [ ] C-3 `[STEP]`: `chasing` 또는 `engaged` 상태인 슬라임을 스폰에서 정확히 `6.0` 떨어뜨리고 플레이어를 가까이 둔 뒤 `dt=1/60` 한 틱을 호출하면 `returning`으로 전환한다.
- [ ] C-4 `[LIVE]`: `returning` 중 플레이어를 감지 범위 안에 두어도 복귀 방향과 `returning` 모드가 유지된다.
- [ ] C-5 `[LIVE]`: 복귀 이동은 스폰을 지나치지 않고 원래 스폰 좌표에 정확히 도착해 `idle`이 된다.
- [ ] C-6 `[STEP]`: `returning` 슬라임을 한 스텝 이내에 두고 플레이어를 스폰 근처에 배치한다. 첫 `dt=1/60` 틱은 정확한 스폰·`idle`, 두 번째 틱부터만 `engaged` 또는 `chasing`으로 재감지한다.

## D. 선택·자동공격 회귀

- [ ] D-1 `[LIVE]`: 살아 있는 슬라임 한 번 클릭 시 선택 링과 대상 HP 패널이 표시되지만 자동공격은 `OFF`다.
- [ ] D-2 `[LIVE]`: 선택한 슬라임을 더블클릭하면 자동공격이 `ON`이 되고 플레이어가 대상에게 접근한다.
- [ ] D-3 `[LIVE]`: 이미 자동공격 중 같은 슬라임을 다시 더블클릭해도 자동공격이 꺼지지 않는다.
- [ ] D-4 `[LIVE]`: 지면을 클릭하면 대상 선택과 자동공격이 해제되고 플레이어 상태가 `이동`으로 표시된다.
- [ ] D-5 `[LIVE]`: 이동하는 슬라임을 선택·공격할 때 대상 위치 갱신과 플레이어 접근이 같은 화면 루프에서 자연스럽게 이어진다.

## E. 사망·보상·리스폰 회귀

- [ ] E-1 `[LIVE]`: 자동공격 시작 후 첫 `320ms` 전에는 HP가 감소하지 않고 첫 히트 프레임부터 감소한다. 두 번째 타격은 시작 후 `1570ms`(`1250ms` 모션 + 다음 `320ms` 히트 프레임) 전에는 발생하지 않으며 대상 HUD의 HP 값과 바가 함께 갱신된다.
- [ ] E-2 `[LIVE]`: 슬라임 사망 시 화면에서 숨겨지고 선택·자동공격이 해제되며 내부 모드는 `idle`이다.
- [ ] E-3 `[LIVE]`: 한 번의 사망에 골드와 음 보상이 정확히 한 번만 증가하고 대기 중 추가 증가가 없다.
- [ ] E-4 `[LIVE]`: 기본 리스폰 시간 `5000ms` 후 슬라임이 최대 HP, 원래 스폰 위치, `idle`로 다시 나타난다.
- [ ] E-5 `[LIVE]`: 리스폰한 슬라임을 다시 처치하면 새 생명 기준으로 보상을 다시 한 번 받을 수 있다.

## F. 범위·안정성·최종 회귀

- [ ] F-1 `[LIVE]`: 슬라임이 `engaged` 상태여도 플레이어 HP·피격·사망 UI나 몬스터 공격 효과가 발생하지 않는다.
- [ ] F-2 `[LIVE]`: 추적·복귀·전투·리스폰 전 과정에서 Canvas, HUD, 선택 링이 깨지거나 사라지지 않는다.
- [ ] F-3 `[LIVE]`: 플레이어를 `z=0`으로 유지한 채 `x=0.1 → -12 → 0.1` 경로로 이동하고 매회 `slime-1`의 스폰 복귀를 기다리는 과정을 3회 반복한다. `slime-2`, `slime-3`는 감지되지 않고 모든 좌표·모드는 유한하고 정의된 값이다.
- [ ] F-4 `[LIVE]`: 새로고침하면 플레이어, 세 슬라임, HUD, 재화가 초기 상태로 복원된다.
- [ ] F-5 `[LIVE]`: 전체 시나리오 종료 시 브라우저 콘솔에 새 오류가 없고 페이지가 계속 응답한다.

## 실행 전 정적 게이트

- [ ] G-1: 저장소 루트에서 `(cd client && npm run check)` — Svelte/TypeScript 오류·경고 0건.
- [ ] G-2: 저장소 루트에서 `(cd client && npx vitest run)` — 전체 테스트 통과.
- [ ] G-3: 저장소 루트에서 `(cd client && npm run build)` — 프로덕션 빌드 성공.
- [ ] G-4: 저장소 루트에서 `node scripts/validate-runtime-data.mjs` — `runtime data OK`.
- [ ] G-5: 저장소 루트에서 아래 명령을 실행해 `client/src/game/`의 Svelte, Three.js, Threlte, 브라우저 import가 없음을 확인한다.

  ```bash
  if rg -n "from ['\"](?:svelte|three|@threlte)|import\\(['\"](?:svelte|three|@threlte)" client/src/game; then
    exit 1
  fi
  ```

## 완료 기준

- A~G의 모든 항목이 PASS다.
- FAIL은 재현 단계와 증적을 포함해 `qa-report.md`에 기록한다.
- 몬스터 공격·플레이어 피해는 미구현 상태가 정상이며 결함으로 분류하지 않는다.
