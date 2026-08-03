# 최종 검증 리포트: visual-foundation

## 실행 요약

- 실행일시: 2026-08-03 15:04–15:45 KST
- 대상 URL: `http://127.0.0.1:5173/` 및 `/?debugHud`
- 실행 환경: Node 22.20.0, Chrome 151, WebGL2, 1280×720 및 390×844
- 총 테스트: 14개
- PASS: 14개 (100%)
- FAIL: 0개 (0%)

## 결과 표

| ID | 테스트 케이스 | 기대 결과 | 실제 결과 | 상태 | 증적 |
| --- | --- | --- | --- | --- | --- |
| QA-01 | Idle | 플레이어 HP와 자원 패널이 읽히며 디버그 정보가 보이지 않는다. | `196 / 196`, 골드와 6개 음 칩이 읽혔고 기본 URL에서 디버그 텍스트와 패널이 없었다. | PASS | `evidence/screenshots/01-idle-1280x720.png` |
| QA-02 | Target selected | 이름, 수치 HP, 붉은 HP 바, 주홍색 지면 링이 보인다. | `먹물 슬라임 140 / 140`, 위험색 HP 바와 비색상 선택 링이 함께 표시됐다. | PASS | `evidence/screenshots/02-selected-target-1280x720.png` |
| QA-03 | Player damaged | 플레이어 수치와 결정색 HP 바가 레이아웃 이동 없이 갱신된다. | HP가 `196`에서 `150`으로 갱신됐고 패널 경계가 `[16,16,262,80.1875]`로 동일했다. | PASS | `evidence/screenshots/03-player-damaged-1280x720.png` |
| QA-04 | Target damaged | 타깃 수치와 위험색 바가 레이아웃 이동 없이 갱신된다. | 타깃 HP가 `140`에서 `98`로 갱신됐고 패널 경계가 `[459,16,362,80.1875]`로 동일했다. | PASS | `evidence/screenshots/04-target-damaged-1280x720.png` |
| QA-05 | Rewards | 슬라임 처치가 골드와 음 수량을 갱신하며 칩이 넘치지 않는다. | 실제 `tick` 처치에서 골드 `105→110`, `ㄱ 3→4`가 적용됐다. 자원 패널과 모든 칩에서 `scrollWidth <= clientWidth`였다. | PASS | `evidence/screenshots/05-rewards-1280x720.png` |
| QA-06 | Respawn | 사라진 슬라임이 먹빛 몸체와 결정 코어로 돌아온다. | 사망 상태 후 5초 시뮬레이션에서 `alive=true`, `hp=140`, 스폰 위치 복귀를 확인했고 먹빛 실루엣과 청록 결정 코어가 다시 보였다. | PASS | `evidence/screenshots/06-respawn-1280x720.png` |
| QA-07 | Debug opt-in | `/?debugHud`만 상태와 자동공격을 표시한다. | 기본 URL에는 디버그 텍스트/패널이 없고, 쿼리 URL에는 `상태 대기`, `자동공격 OFF`가 표시됐다. | PASS | `evidence/screenshots/07-debug-hud-1280x720.png` |
| QA-08 | Reduced motion | HUD 전환이 멈추고 WebGL 결정 및 전투 피드백이 안정적으로 유지된다. | 실제 `reducedMotion: reduce` 컨텍스트에서 `matchMedia=true`, HP transition `0s`, WebGL2 활성화를 확인했다. 공격+피격 상태를 주입한 전후 결정 영역 PNG의 SHA-256이 모두 `b29ded4643c002382836d0c5ea9a696ada864a768f861c1f7ce52aae257ec7bd`로 동일했다. | PASS | `evidence/screenshots/08-reduced-motion-a.png`, `evidence/screenshots/08-reduced-motion-b.png` |
| QA-09 | Narrow viewport | 플레이어/타깃 패널이 쌓이고 자원 패널이 읽히며 중앙 타깃을 가리지 않는다. | 390×844에서 `innerWidth`, 문서/본문 `scrollWidth`가 모두 390이었다. 모든 패널은 x=16–374에 있고 모든 패널/칩이 내용 폭을 수용했으며 라벨은 11px였다. | PASS | `evidence/screenshots/09-narrow-390x844.png` |
| QA-10 | Placeholder boundary | 현재 기본 도형을 최종 캐릭터 디자인으로 부르는 문구가 없다. | 코드 주석, `client/README.md`, `DESIGN.md`, 비주얼 명세를 검색해 임시/기본 도형 경계와 최종 디자인 비승인을 확인했다. | PASS | `client/README.md`, `client/src/scene/PlayerLayer.svelte` |
| RF-01 | Mobile border box | 390px 화면에서 패널 박스가 가로로 넘치지 않는다. | `box-sizing: border-box` 적용 후 플레이어/타깃/자원 패널의 실제 폭은 358px, 좌우 좌표는 16/374였다. | PASS | `evidence/screenshots/09-narrow-390x844.png` |
| RF-02 | Emissive-off silhouettes | 발광을 모두 끈 1280×720 화면에서도 플레이어와 슬라임 몸체가 배경에서 읽힌다. | QA 전용 임시 emissive 0 빌드에서 밝아진 먹빛 재질과 비발광 back-face 외곽선이 네 실루엣을 분리했다. | PASS | `evidence/screenshots/10-silhouettes-no-emissive-1280x720.png` |
| RF-03 | Combat transient | 공격/피격 순간에 160–240ms 범위의 장면 피드백이 보인다. | 실제 321ms 공격 hit 처리 직후 슬라임 표면/결정이 밝아지고 플레이어 무기광이 강화됐다. 별도 플레이어 피격 프레임도 몸체 명도 변화를 표시했다. | PASS | `evidence/screenshots/11-combat-feedback-1280x720.png`, `evidence/screenshots/12-player-damage-feedback-1280x720.png` |
| RF-04 | Token/runtime contract | 타이포·간격·반경·패널·motion 토큰이 CSS 변수와 HUD에 연결된다. | 브라우저에서 11px 최소 라벨과 tokenized panel geometry를 확인했고 자동 계약 테스트가 모든 변수/소비 경로를 통과했다. | PASS | `client/src/design/__tests__/visual-theme.test.ts`, `client/src/ui/__tests__/hud-style-contract.test.ts` |

## 스크린샷 목록

| 파일명 | 테스트 ID | 설명 |
| --- | --- | --- |
| `01-idle-1280x720.png` | QA-01 | 기본 HUD와 먹빛 그리드/임시 실루엣 |
| `02-selected-target-1280x720.png` | QA-02 | 선택 타깃 HUD와 주홍색 링 |
| `03-player-damaged-1280x720.png` | QA-03 | 플레이어 HP 감소 |
| `04-target-damaged-1280x720.png` | QA-04 | 타깃 HP 감소 |
| `05-rewards-1280x720.png` | QA-05 | 골드와 음 보상 갱신 |
| `06-respawn-1280x720.png` | QA-06 | 슬라임 재생성 |
| `07-debug-hud-1280x720.png` | QA-07 | 디버그 패널 opt-in |
| `08-reduced-motion-a.png` | QA-08 | reduced-motion 결정 영역 첫 프레임 |
| `08-reduced-motion-b.png` | QA-08 | 공격·피격 주입 후 동일 결정 영역 |
| `09-narrow-preselect.png` | QA-09 | 390×844 선택 전 기준 화면 |
| `09-narrow-390x844.png` | QA-09 | 390×844 선택 후 적층 HUD |
| `10-silhouettes-no-emissive-1280x720.png` | RF-02 | emissive 0 상태의 비발광 실루엣 |
| `11-combat-feedback-1280x720.png` | RF-03 | 플레이어 공격과 슬라임 피격 transient |
| `12-player-damage-feedback-1280x720.png` | RF-03 | 플레이어 피격 transient |

## 실행 메모

- gstack browse의 CDP allowlist는 `Emulation.setEmulatedMedia`를 허용하지 않는다. QA-08만 동일 gstack 설치의 Playwright와 프로젝트 설정의 Chrome/WebGL 실행 인자를 사용해 `reducedMotion: 'reduce'` 컨텍스트로 검증했다.
- 첫 기본 headless daemon은 WebGL 컨텍스트 생성에 실패해 증적으로 채택하지 않았다. 이후 모든 일반 케이스는 gstack browse headed mode에서 실제 Chrome/WebGL2로 재실행했다.
- 일부 새 브라우저 세션에서 favicon 404가 기록됐으나 앱 JavaScript 예외나 기능 실패는 없었다.
- RF-02는 최종 소스의 emissive intensity만 일시적으로 0으로 바꾼 QA 빌드로 캡처한 뒤 즉시 복원했다. 몸체 색·재질·외곽선·조명은 최종 코드와 동일하다.
