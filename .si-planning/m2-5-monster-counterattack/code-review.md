# 코드 리뷰 결과: M2.5 몬스터 반격

## 대상 파일

- `client/src/game/sim/fsm/player-fsm.ts` 및 인접 테스트
- `client/src/game/sim/entities/monster.ts` 및 인접 테스트
- `client/src/game/sim/combat/monster-attack.ts` 및 인접 테스트
- `client/src/game/sim/world.ts` 및 월드 통합 테스트
- `client/src/ui/hud-model.ts` 및 인접 테스트
- `client/src/ui/Hud.svelte`
- `client/src/app.css`
- `.si-planning/m2-5-monster-counterattack/tdd-report.md`

## 요약

| # | 이슈 | 심각도 | 영역 | 파일:라인 |
|---|---|---|---|---|
| - | 이슈 없음 | - | 전체 | - |

## 영역별 상세

### 1. 아키텍처 (0건)

- `game/` 순수 로직과 `ui/` 표시 경계가 유지됐다.
- `monster-ai.ts`는 공간 상태만 결정하고, `monster-attack.ts`는 공격 시계와 피해만 처리하며, `world.ts`가 두 단계를 순서대로 조율한다.
- 기존 `rollPhysicalDamage`와 저빈도 `HudSnapshot` 계약을 재사용해 중복 피해식이나 별도 상태 저장소를 만들지 않았다.
- `client/src/game/`에서 Svelte, Three.js, Threlte 및 브라우저 전역 의존성 검색 결과가 없다.

### 2. 코딩 컨벤션 (0건)

- 기존 파일 배치와 `create*`, `tick*`, `reset*` 네이밍을 따른다.
- TypeScript 타입이 명시적이고, 새 의존성·와일드카드 import·미사용 코드가 없다.
- HP 표시 비율은 순수 `playerHpFillRatio`로 `[0, 1]`에 고정되며 Svelte 컴포넌트는 표현만 담당한다.

### 3. API 설계 (0건)

- 클라이언트 단독 POC이며 REST API, 인증, DB, DTO 변경이 없어 N/A다.

### 4. TDD / 자동화 테스트 증거 (0건)

- `tdd-plan.md`와 `tdd-report.md`가 존재한다.
- Task 1~3 모두 구현 전 RED 명령과 예상된 미구현 실패가 기록됐다.
- 동일 집중 테스트의 GREEN 전환과 Task별 커밋 SHA가 기록됐다.
- 사후 리뷰 보강은 HP 바 경계, 최대 HP 단독 변경, 엇갈린 몬스터 공격 시계를 실제 상태 변화로 검증한다.
- 최종 증거: `npm run check` 오류·경고 0건, Vitest 13개 파일 84/84, 빌드 PASS, `runtime data OK`.

## 계획 전 리서치 반영

- 상태: N/A (`skipped`)
- 사유: 신규 라이브러리나 브라우저 API 없이 저장소의 공격 시계·피해식·HUD 스냅샷 패턴을 재사용했다.

## 총평

- **전체 이슈**: 0건 (Critical: 0, High: 0, Medium: 0, Low: 0)
- **아키텍처**: PASS
- **컨벤션**: PASS
- **API 설계**: PASS (N/A 범위)
- **TDD 증거**: PASS
- **종합 판정**: PASS

브라우저에서의 실제 타이밍·HUD 동기화·콘솔 안정성은 다음 QA 체크리스트 단계의 필수 병합 게이트로 남아 있다.
