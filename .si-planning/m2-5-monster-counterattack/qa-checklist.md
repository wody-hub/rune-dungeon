# QA 체크리스트: M2.5 몬스터 반격

## 대상 화면 정보

- 프로젝트: `rune-dungeon`
- 기능: M2.5 먹물 슬라임 반격, 플레이어 HP·피격 HUD
- URL: `http://127.0.0.1:5173/`
- 실행 명령: `cd client && npm run dev -- --host 127.0.0.1`
- 화면: Svelte 5 + Threlte 단일 WebGL 게임 화면
- 인증·백엔드·DB·더미데이터: 없음
- 기준 설계: `docs/superpowers/specs/2026-08-03-client-poc-m2-5-monster-counterattack-design.md`
- 제외 범위: 플레이어 사망·부활·전투 종료, 회피·경직·무적, 애니메이션, VFX, SFX, 데미지 텍스트

## 식별된 관련 파일

| 구분 | 파일 | 설명 |
|---|---|---|
| 게임 루프 | `client/src/scene/GameScene.svelte` | 고정 스텝 tick, HUD 발행, 개발용 `window.__world` |
| HUD 화면 | `client/src/ui/Hud.svelte` | 플레이어·대상 HP 숫자와 바 |
| HUD 모델 | `client/src/ui/hud-model.ts` | 저빈도 스냅샷, 동등성, HP 비율 고정 |
| 공간 AI | `client/src/game/sim/ai/monster-ai.ts` | `idle/chasing/engaged/returning` 전이 |
| 공격 판정 | `client/src/game/sim/combat/monster-attack.ts` | 몬스터 공격 시계와 플레이어 피해 |
| 피해식 | `client/src/game/sim/combat/damage.ts` | 물리 피해 완화 공식 |
| 월드 통합 | `client/src/game/sim/world.ts` | AI 이후 몬스터별 반격 처리 |
| 생명주기 | `client/src/game/sim/entities/monster.ts` | 공격 시계 생성·사망·리스폰 초기화 |
| 단위 검증 | `client/src/game/sim/combat/__tests__/monster-attack.test.ts` | 정확한 적중·큰 dt·초기화·HP 하한 |
| 통합 검증 | `client/src/game/sim/__tests__/world.test.ts` | 월드 순서·엇갈린 독립 시계·기존 전투 회귀 |

## 검증 계약

| 항목 | 기대값/규칙 |
|---|---|
| 플레이어 HP | 초기 `196 / 196`, 피해 후 `0` 미만 금지 |
| 슬라임 피해 | `baseDamage=18`, 방어 `12`, 결정적 1회 피해 `16` |
| 최초 적중 | 교전 공격 시작 후 `420ms` |
| 다음 적중 | 첫 모션 시작 후 `1820ms` (`1400 + 420`) |
| 큰 dt | 경과한 모든 적중을 한 번씩 처리 |
| 독립 시계 | 살아 있는 모든 `engaged` 몬스터가 Map 순서로 독립 공격 |
| 초기화 | `idle/chasing/returning`, 사망, 리스폰에서 `0 / null` |
| HUD | 현재/최대 HP 숫자와 `[0, 100]%` 바가 내부 상태와 일치 |
| 0 HP | 전투 시뮬레이션은 유지하되 HP는 계속 `0` |

## 불일치 사항

승인 설계, 런타임 fixture, 구현, 테스트의 값과 흐름은 일치한다. 서버·DTO·DDL·인증은 클라이언트 POC에 해당하지 않는다.

## 테스트 환경 및 증적 규칙

- Node.js `v22.12.0` 이상, Chrome 1280×720, 실제 WebGL2 컨텍스트를 사용한다.
- `[LIVE]`는 정상 rAF 페이지에서 사용자에게 보이는 Canvas·HUD·콘솔을 검증한다.
- `[STEP]`은 별도 페이지에서 `requestAnimationFrame` 콜백을 멈춘 뒤 `window.__world`와 `tick()`을 사용한다.
- `[STEP]` 페이지는 내부 상태 판정 전용이며 정지된 화면이나 HUD 렌더 결과를 판정하지 않는다.
- 각 시나리오는 새 페이지 또는 새로고침으로 월드 상태를 초기화한다.
- 상태 로그는 `evidence/logs/browser-results.json`, 정적 출력은 `evidence/logs/static-gates.log`에 저장한다.
- 대표 스크린샷은 `evidence/screenshots/`에 저장하고 FAIL은 기대값·실제값·재현 단계를 기록한다.

### 결정적 단일 틱 설정 (`[STEP]`)

1. `page.goto()` 전 init script로 `requestAnimationFrame`을 콜백을 실행하지 않는 함수로 교체한다.
2. `/`를 열고 `window.__world` 생성과 초기 `196 / 196`을 확인한다.
3. `const { tick } = await import('/src/game/sim/world.ts')`로 `window.__qaTick = dt => tick(window.__world, dt)`를 등록한다.
4. 각 항목에서 플레이어와 몬스터의 `pos`, `spawnPos`, `mode`, `alive`, 공격 시계를 명시적으로 초기화한다.
5. 틱 전후 상태를 저장하고 다음 항목은 새 페이지에서 수행한다.

---

## A. 초기 로드·HUD

- [ ] A-1 `[LIVE]`: `/` 응답 성공, 1280×720 Canvas 표시, WebGL2 컨텍스트 생성.
- [ ] A-2 `[LIVE]`: 로드 후 console error, page error, WebGL 초기화 실패 0건.
- [ ] A-3 `[LIVE]`: 플레이어 HUD에 `HP 196 / 196`이 표시되고 플레이어 HP 바가 `100%`다.
- [ ] A-4 `[LIVE]`: `window.__world.player`가 `hp=196`, `maxHp=196`이고 세 슬라임이 살아 있다.
- [ ] A-5 `[LIVE]`: 초기 세 슬라임은 `idle`, 플레이어는 `대기`, 자동공격은 `OFF`다.

## B. 정확한 공격 타이밍·피해

- [ ] B-1 `[STEP]`: `slime-1`을 거리 `1.4`, `engaged` 새 시계로 두면 첫 틱에서 `pendingHitMs=420`부터 경과한다.
- [ ] B-2 `[STEP]`: 누적 `419ms`에서 HP는 `196`, 남은 적중은 `1ms`다.
- [ ] B-3 `[STEP]`: 다음 `1ms`에서 HP가 정확히 `180`으로 한 번 감소한다.
- [ ] B-4 `[STEP]`: 첫 모션 시작 기준 누적 `1819ms`까지 HP는 `180`이다.
- [ ] B-5 `[STEP]`: 누적 `1820ms`에서 두 번째 적중으로 HP가 `164`가 된다.
- [ ] B-6 `[STEP]`: 한 번의 `3220ms`에서 적중 3회가 처리되어 HP가 `148`이 된다.

## C. 시계 초기화·복수 공격·HP 하한

- [ ] C-1 `[STEP]`: `200ms` 진행 후 `chasing`이면 시계가 `0 / null`로 초기화되고 피해가 없다.
- [ ] C-2 `[STEP]`: `idle`과 `returning`에서도 남아 있던 시계가 각각 `0 / null`로 초기화된다.
- [ ] C-3 `[STEP]`: 죽은 몬스터는 피해를 주지 않고 시계가 초기화된다.
- [ ] C-4 `[STEP]`: 사망 처리와 성공한 리스폰 모두 시계를 `0 / null`로 만들고 리스폰 HP·위치가 정상이다.
- [ ] C-5 `[STEP]`: 두 몬스터를 동시에 교전시키면 `420ms`에 각각 16 피해를 적용해 HP가 `164`다.
- [ ] C-6 `[STEP]`: 두 번째 몬스터를 `200ms` 늦게 교전시키면 첫 적중은 `420ms`, 두 번째는 `620ms`에 각각 발생한다.
- [ ] C-7 `[STEP]`: HP `10`에서 한 번 적중하면 `0`이며 추가 적중에도 음수가 되지 않는다.
- [ ] C-8 `[STEP]`: 교전 이탈 뒤 재교전하면 이전 `200ms`를 이어 쓰지 않고 새 `420ms`를 요구한다.

## D. 실제 화면 피격·HUD 동기화

- [ ] D-1 `[LIVE]`: 플레이어가 감지 범위에 들어가면 입력 없이 슬라임이 추적·교전하고 첫 피격으로 HP가 16 감소한다.
- [ ] D-2 `[LIVE]`: 피격 직후 HUD 숫자와 플레이어 HP 바가 `window.__world.player`와 일치한다.
- [ ] D-3 `[LIVE]`: 반복 공격에서 HP 숫자와 바가 매 적중마다 한 번씩 감소하며 중간 프레임에 중복 감소하지 않는다.
- [ ] D-4 `[LIVE]`: 교전 중 지면 이동으로 거리를 벌리면 공격 시계가 초기화되고, 재교전 후 새 `420ms` 이전에는 피해가 없다.
- [ ] D-5 `[LIVE]`: HP가 `0`이 된 뒤에도 페이지는 응답하고 HUD는 `0 / 196`, 바는 `0%`, 내부 HP는 `0`이다.

## E. 기존 추적·플레이어 공격 회귀

- [ ] E-1 `[LIVE]`: 슬라임 감지·추적·거리 `1.4` 교전·추적 포기·스폰 복귀가 기존과 동일하다.
- [ ] E-2 `[LIVE]`: 슬라임 한 번 클릭은 선택만, 더블클릭은 자동공격 ON과 플레이어 접근을 수행한다.
- [ ] E-3 `[LIVE]`: 플레이어 근접 공격은 기존 첫 `320ms`, 다음 `1570ms` 논리 타이밍으로 대상 HP를 감소시킨다.
- [ ] E-4 `[LIVE]`: 슬라임 사망 시 숨김·선택 해제·보상 1회·기본 `5000ms` 리스폰이 정상이다.
- [ ] E-5 `[LIVE]`: 대상 패널의 기존 `.hp-fill`은 대상 HP를 표시하고 플레이어 `.player-hp-fill`과 혼동되지 않는다.
- [ ] E-6 `[LIVE]`: 새로고침하면 플레이어 `196 / 196`, 세 슬라임, HUD, 재화가 초기 상태로 복원된다.

## F. 안정성·최종 회귀

- [ ] F-1 `[LIVE]`: 추적·반격·플레이어 공격·사망·리스폰 동안 Canvas, HUD, 선택 링이 깨지지 않는다.
- [ ] F-2 `[LIVE]`: 플레이어 이동과 슬라임 교전 이탈·재교전을 3회 반복해도 상태값과 좌표가 유한하다.
- [ ] F-3 `[LIVE]`: 제외된 사망 전이·피격 애니메이션·VFX·SFX·데미지 텍스트가 추가되지 않았다.
- [ ] F-4 `[LIVE]`: 전체 시나리오 종료 시 console error와 page error가 0건이고 페이지가 응답한다.

## G. 실행 전 정적 게이트

- [ ] G-1: `(cd client && npm run check)` — 오류·경고 0건.
- [ ] G-2: `(cd client && npx vitest run)` — 13개 파일, 84/84 PASS.
- [ ] G-3: `(cd client && npm run build)` — 성공, 기존 chunk-size advisory만 허용.
- [ ] G-4: `node scripts/validate-runtime-data.mjs` — `runtime data OK`.
- [ ] G-5: `client/src/game/`의 Svelte·Three.js·Threlte import 및 브라우저 전역 검색 결과 없음.

## 완료 기준

- A~G 총 39개 항목이 모두 PASS다.
- 브라우저 항목 A~F는 34개, 정적 게이트 G는 5개다.
- FAIL은 재현 단계와 증적을 포함해 `qa-report.md`에 기록하고 원인 분석 후 재검증한다.
- 브라우저 QA PASS 전에는 `dev` 병합 또는 태그 생성을 진행하지 않는다.
