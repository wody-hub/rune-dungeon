# M2.5 몬스터 반격 TDD 결과

## RED

- 런타임 상태 — `cd client && npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts src/game/sim/entities/__tests__/monster.test.ts`: Task 1 구현 전 2개 파일 실패, 4개 테스트 실패·7개 통과. 플레이어 반환 상태에 `hp`/`maxHp`가 없었고, 새 몬스터에 `attackElapsedMs`/`pendingHitMs`가 없으며 `killMonster`가 시계를 초기화하지 않았다. 당시 커밋은 `3d93a977ba585e8aedd13fded0f509f702f1165e` (`docs: review M2.5 monster counterattack plan`)이다.
- 공격 시계 — `cd client && npx vitest run src/game/sim/combat/__tests__/monster-attack.test.ts src/game/sim/__tests__/world.test.ts`: Task 2 구현 전 `monster-attack.test.ts`가 누락된 `../monster-attack` 모듈을 import하지 못했고, 월드 테스트에서 플레이어 HP가 기대값 `180`/`164` 대신 `196`으로 남았으며 부분 공격 시계가 기대값 `220` 대신 `null`이었다. 당시 커밋은 `7c3640bde09e77872147ab1d50b326002689e57f` (`feat: add runtime player hp and monster attack clocks`)이다.
- HUD — `cd client && npx vitest run src/ui/__tests__/hud-model.test.ts`: Task 3 구현 전 1개 파일에서 2개 테스트 실패·2개 통과. 스냅샷에 `playerHp`/`playerMaxHp`가 없고 표시 assertion이 두 필드를 찾지 못했다. 당시 커밋은 `fa80e618757e08e2725cef2aadf9b6d98698a71f` (`feat: apply timed monster counterattacks`)이다.

## GREEN

- 런타임 상태 집중 테스트 — `cd client && npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts src/game/sim/entities/__tests__/monster.test.ts`: 2개 파일, 11개 테스트 통과.
- 공격 시계 집중 테스트 — `cd client && npx vitest run src/game/sim/combat/__tests__/monster-attack.test.ts src/game/sim/__tests__/world.test.ts`: 2개 파일, 32개 테스트 통과.
- HUD 집중 테스트 — `cd client && npx vitest run src/ui/__tests__/hud-model.test.ts`: 1개 파일, 4개 테스트 통과.
- 전체 Vitest — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npx vitest run)`: `Test Files 13 passed (13)`, `Tests 79 passed (79)`.
- Svelte/TypeScript 검사 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npm run check)`: `svelte-check found 0 errors and 0 warnings`.
- 빌드 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npm run build)`: Vite 8.2.0에서 438개 모듈을 변환해 성공했다. minification 뒤 500 kB 초과 청크에 대한 기존 advisory만 출력됐다.
- 런타임 데이터 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; node scripts/validate-runtime-data.mjs`: `runtime data OK`.
- 순수 게임 경계 — `rg -n "from ['\"](?:svelte|three|@threlte)|import\\(['\"](?:svelte|three|@threlte)" client/src/game` 및 `rg -n '\\b(window|document|navigator|location|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|HTMLElement|HTMLCanvasElement|fetch|WebSocket)\\b' client/src/game`는 모두 일치 결과 없이 종료했다. 이는 기대한 no-match 결과이며 실패가 아니다.

## REFACTOR

- 공간 AI는 각 몬스터의 `tickMonsterAi`를 먼저 모두 완료하고, 공격 판정은 별도 `tickMonsterAttack` 단계에서 수행하도록 분리된 상태를 유지한다.
- Task 3은 HUD 스냅샷 경계와 표시만 정리했고, 제품 동작을 바꾸는 추가 리팩터는 수행하지 않았다.

## 커밋

- Task 1: `7c3640bde09e77872147ab1d50b326002689e57f feat: add runtime player hp and monster attack clocks`
- Task 2: `fa80e618757e08e2725cef2aadf9b6d98698a71f feat: apply timed monster counterattacks`
- Task 3: `7eb694b896daa6546c9841fc2e5f1288cc785516 feat: show player hp in combat hud`

## Post-review hardening

### RED

- HUD 비율 경계 테스트를 먼저 추가한 뒤 `cd client && npx vitest run src/ui/__tests__/hud-model.test.ts`를 실행했다. 신규 `playerHpFillRatio` API가 아직 없어 `TypeError: playerHpFillRatio is not a function`으로 4개 경계 사례(HP 0, 음수 HP, 최대 HP 초과, 최대 HP 0)가 실패했고, 나머지 5개는 통과했다. 이는 누락된 표시 비율 보호 로직에 의한 의도된 실패다.
- `playerMaxHp`만 달라져도 `hudSnapshotsEqual`이 false가 되는 회귀 assertion과, 몬스터별 진입 시점을 어긋나게 한 독립 시계 assertion도 제품 코드 변경 전에 추가했다. 전자는 비교기가 이미 `playerMaxHp`를 비교하고 있었고, 후자는 독립 시계가 이미 구현되어 있어 각각 기존 동작을 의미 있게 확인하는 통과 회귀 테스트였다. 특히 후자는 첫 몬스터의 420 ms 경계에서만 첫 피해가 발생하고, 200 ms 뒤 두 번째 몬스터의 별도 420 ms 경계에서 두 번째 피해가 발생함을 확인한다.

### GREEN

- HUD 계산을 순수 `playerHpFillRatio` helper로 추출해 유효하지 않은 최대 HP는 0으로, 일반 비율은 `[0, 1]`로 제한했다. `Hud.svelte`는 이 값을 폭으로 표시만 한다.
- 집중 회귀 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/game/sim/__tests__/world.test.ts)`: `Test Files 2 passed (2)`, `Tests 35 passed (35)`.

### Final checks

- 전체 Vitest — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npx vitest run)`: `Test Files 13 passed (13)`, `Tests 84 passed (84)`.
- Svelte/TypeScript 검사 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npm run check)`: `svelte-check found 0 errors and 0 warnings`.
- 빌드 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; (cd client && npm run build)`: 438개 모듈 변환 후 성공. 기존 500 kB 초과 청크 advisory만 출력됐다.
- 런타임 데이터 — `export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH; node scripts/validate-runtime-data.mjs`: `runtime data OK`.
- 패치 위생 — `git diff --check`: 출력 없이 성공.
- Important browser-QA는 코드 수정이나 이 작업의 완료 조건으로 처리하지 않았다. 커밋 뒤 controller가 필수 QA pipeline을 실행해야 한다.
