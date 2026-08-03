# QA Test Report: M2.5 몬스터 반격

## 실행 요약

- 프로젝트: `rune-dungeon`
- 실행일시: 2026-08-03 13:06:00 KST
- 대상 URL: `http://127.0.0.1:5173/`
- 브라우저: Chrome 151, 1280×720, WebGL2 (`WebKit WebGL`)
- 실행 방식: direct Playwright
- 총 테스트: 39
- PASS: 39 (100%)
- FAIL: 0 (0%)
- SKIP: 0 (0%)
- ERROR: 0 (0%)
- 제품 결함: 없음

## 카테고리별 결과

| 카테고리 | PASS | FAIL | SKIP | 결과 | 핵심 증적 |
|---|---:|---:|---:|---|---|
| A. 초기 로드·HUD | 5 | 0 | 0 | PASS | `evidence/screenshots/initial-hud.png` |
| B. 정확한 공격 타이밍·피해 | 6 | 0 | 0 | PASS | `evidence/logs/browser-results.json` |
| C. 시계 초기화·복수 공격·HP 하한 | 8 | 0 | 0 | PASS | `evidence/logs/browser-results.json` |
| D. 실제 화면 피격·HUD 동기화 | 5 | 0 | 0 | PASS | `first-damage.png`, `repeated-damage.png`, `reset-reengage.png`, `hp-zero.png` |
| E. 기존 추적·플레이어 공격 회귀 | 6 | 0 | 0 | PASS | `target-hp-compatibility.png`, `tracking-return.png`, `monster-death-hidden.png`, `final-stable-state.png` |
| F. 안정성·최종 회귀 | 4 | 0 | 0 | PASS | `final-regression.png`, `evidence/logs/browser-results.json` |
| G. 실행 전 정적 게이트 | 5 | 0 | 0 | PASS | `evidence/logs/static-gates.log` |

## 항목별 결과

### A. 초기 로드·HUD (5/5 PASS)

| ID | 상태 | 실제 결과 | 증적 |
|---|---|---|---|
| A-1 | PASS | HTTP 200, Canvas CSS/버퍼 1280×720, WebGL2 생성 | `initial-hud.png` |
| A-2 | PASS | console error 0, page error 0, WebGL 오류 0 | `browser-results.json` |
| A-3 | PASS | HUD `196 / 196`, `.player-hp-fill=100%` | `initial-hud.png` |
| A-4 | PASS | 내부 HP 196/196, 살아 있는 슬라임 3개 | `browser-results.json` |
| A-5 | PASS | 슬라임 3개 `idle`, 플레이어 `대기`, 자동공격 OFF | `initial-hud.png` |

### B. 정확한 공격 타이밍·피해 (6/6 PASS)

모든 항목은 fresh page에서 navigation 전 `requestAnimationFrame`을 정지하고
`/src/game/sim/world.ts`의 `tick`을 `window.__qaTick`으로 노출해 검증했다.

| ID | 상태 | 실제 결과 |
|---|---|---|
| B-1 | PASS | 200ms 후 `attackElapsedMs=200`, `pendingHitMs=220`, HP 196 |
| B-2 | PASS | 419ms: HP 196, `pendingHitMs=1` |
| B-3 | PASS | 다음 1ms: HP 196→180, 16 피해 1회 |
| B-4 | PASS | 1819ms: HP 180, 다음 적중 1ms |
| B-5 | PASS | 1820ms: HP 164, 두 번째 적중 |
| B-6 | PASS | 단일 3220ms tick: HP 148, 적중 3회 |

### C. 시계 초기화·복수 공격·HP 하한 (8/8 PASS)

| ID | 상태 | 실제 결과 |
|---|---|---|
| C-1 | PASS | `chasing` 전환 후 공격 시계 `0/null`, 피해 없음 |
| C-2 | PASS | `idle`, `returning` 각각 공격 시계 `0/null` |
| C-3 | PASS | 죽은 몬스터 피해 없음, 시계 초기화 |
| C-4 | PASS | 사망 및 리스폰 모두 시계 초기화; HP 140, 위치 (3,0) 복원 |
| C-5 | PASS | 두 몬스터가 420ms에 각각 16 피해, HP 164 |
| C-6 | PASS | 첫 적중 420ms HP 180, 두 번째 620ms HP 164 |
| C-7 | PASS | HP 10→0, 추가 적중 뒤에도 0 |
| C-8 | PASS | 이탈 후 시계 폐기; 재교전 419ms HP 196, 420ms HP 180 |

### D. 실제 화면 피격·HUD 동기화 (5/5 PASS)

| ID | 상태 | 실제 결과 | 증적 |
|---|---|---|---|
| D-1 | PASS | Canvas 지면 클릭 후 선택/자동공격 없이 추적·교전, HP 196→180 | `first-damage.png` |
| D-2 | PASS | 내부 HP 180, HUD `180 / 196`, 바 `91.8367%` 일치 | `first-damage.png` |
| D-3 | PASS | 관측 전이 196→180→164, 각 16씩 한 번만 감소 | `repeated-damage.png` |
| D-4 | PASS | 이탈 시 `0/null`; 재교전 420ms 전 HP 유지, 이후 180 | `reset-reengage.png` |
| D-5 | PASS | HP 0 이후 HUD `0 / 196`, 바 0%, 1.5초 뒤에도 응답 | `hp-zero.png` |

### E. 기존 추적·플레이어 공격 회귀 (6/6 PASS)

| ID | 상태 | 실제 결과 | 증적 |
|---|---|---|---|
| E-1 | PASS | `idle→chasing→engaged→chasing→returning→idle`, 스폰 (3,0) 복귀 | `tracking-return.png` |
| E-2 | PASS | 단일 클릭은 선택만; 더블클릭은 자동공격 ON 및 접근 | `target-hp-compatibility.png` |
| E-3 | PASS | 구성값 320/1250ms, 라이브 고정 스텝에서 논리 320/1570ms 경계 통과 | `browser-results.json` |
| E-4 | PASS | 사망 숨김·선택 해제, 골드 100→108 보상 1회, 5000ms 리스폰 | `monster-death-hidden.png`, `final-stable-state.png` |
| E-5 | PASS | 대상 `.hp-fill`과 플레이어 `.player-hp-fill`이 별도 요소로 정상 표시 | `target-hp-compatibility.png` |
| E-6 | PASS | reload 후 HP 196/196, 슬라임 3개, 골드 100, HUD 복원 | `final-stable-state.png` |

### F. 안정성·최종 회귀 (4/4 PASS)

| ID | 상태 | 실제 결과 | 증적 |
|---|---|---|---|
| F-1 | PASS | 추적·반격·공격·사망·리스폰 전 구간 Canvas/HUD/선택 링 정상 | 대표 스크린샷 전체 |
| F-2 | PASS | 독립 초기화한 normal-rAF 3회에서 실제 Canvas 이동 클릭, 매회 이탈 시계 초기화·재교전·유한 좌표 확인 | `browser-results.json` |
| F-3 | PASS | damage/VFX/hit/audio/video 요소 0, document animation 0, 사망·경직 상태 필드 0 | `final-regression.png` |
| F-4 | PASS | 최종 HTTP/fetch 200, WebGL2 Canvas 유지, console/page error 0 | `final-regression.png` |

### G. 실행 전 정적 게이트 (5/5 PASS)

| ID | 상태 | 실제 결과 |
|---|---|---|
| G-1 | PASS | Node v22.20.0, `svelte-check found 0 errors and 0 warnings` |
| G-2 | PASS | 13/13 파일, 84/84 테스트 PASS |
| G-3 | PASS | 빌드 성공, 438 modules, 허용된 chunk-size advisory만 출력 |
| G-4 | PASS | `runtime data OK` |
| G-5 | PASS | 금지 import/브라우저 전역 검색 0건 |

전체 출력은 `evidence/logs/static-gates.log`에 저장했다.

## 콘솔·브라우저 요약

- LIVE 각 페이지에서 navigation 전 `pageerror`와 console listener를 등록했다.
- 전체 console error: 0
- 전체 page error: 0
- WebGL 초기화 오류: 0
- 최종 Playwright console probe: Errors 0, Warnings 0
- 최종 페이지: HTTP 200, `document.readyState=complete`, WebGL2 Canvas 1개

## 자동화 보정 기록

제품 코드는 변경하지 않았다.

1. 기본 PATH의 Node v20.15.1 사전 실행은 Vite 버전 경고를 냈다. 계획에 명시된 Node v22.20.0 PATH로 G-1~G-4를 실행했고 모두 PASS했다.
2. 첫 LIVE 스크립트의 Node-side `performance` 참조 오류를 `Date.now`로 보정 후 fresh page에서 재실행했다.
3. D-2는 CSS가 `91.8367%`로 직렬화한 값을 반올림 전 문자열과 비교한 러너 오류였다. 숫자 허용오차 비교로 180/196과 일치함을 재확인했다.
4. 첫 F-2 반복은 누적 이동 기하 때문에 timeout됐다. 각 회차 관련 월드 필드를 독립 초기화한 normal-rAF 페이지에서 실제 Canvas 지면 클릭을 3회 수행했고 모두 PASS했다.

## 스크린샷 목록

| 파일 | 설명 |
|---|---|
| `evidence/screenshots/initial-hud.png` | 초기 Canvas·196/196 HUD |
| `evidence/screenshots/first-damage.png` | 첫 피격 HP 180 |
| `evidence/screenshots/repeated-damage.png` | 반복 피격 HP 164 |
| `evidence/screenshots/reset-reengage.png` | 이탈·재교전, 새 420ms 전 HP 유지 |
| `evidence/screenshots/hp-zero.png` | HP 0, 바 0%, 교전 유지 |
| `evidence/screenshots/target-hp-compatibility.png` | 선택 링·대상 HP와 플레이어 HP 동시 표시 |
| `evidence/screenshots/tracking-return.png` | 추적 포기·스폰 복귀 |
| `evidence/screenshots/monster-death-hidden.png` | 사망 몬스터 숨김·보상 반영 |
| `evidence/screenshots/final-stable-state.png` | 리스폰 후 안정 상태 |
| `evidence/screenshots/final-regression.png` | 최종 WebGL2 Canvas·HUD 안정 상태 |

## 결론

M2.5 몬스터 반격 브라우저 QA는 **39/39 PASS**다. 실패·스킵·제품 결함은 없다.

