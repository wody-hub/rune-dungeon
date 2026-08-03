# M2.5 몬스터 반격 구현 계획

## 상태

- 기준 설계: `docs/superpowers/specs/2026-08-03-client-poc-m2-5-monster-counterattack-design.md`
- 실행 가능한 상세 계획: `docs/superpowers/plans/2026-08-03-client-poc-m2-5-monster-counterattack.md`
- 외부 리서치: 생략. 기존 저장소 패턴만 사용한다.
- 구현 방식: TDD, 작업별 독립 커밋

## 변경 단위

1. 플레이어 HP와 몬스터 공격 시계를 런타임 엔티티에 추가하고 생명주기 초기화를 검증한다.
2. 순수 몬스터 공격 시계와 월드 틱 통합을 구현한다.
3. HUD 스냅샷과 화면에 플레이어 HP를 연결한다.
4. 진행 문서에 다음 비주얼 디자인 체크포인트를 명시하고 전체 정적 게이트를 실행한다.

## 파일 계약

- `client/src/game/sim/fsm/player-fsm.ts`: 플레이어 HP 런타임 상태 생성
- `client/src/game/sim/entities/monster.ts`: 몬스터 공격 시계와 초기화 함수
- `client/src/game/sim/combat/monster-attack.ts`: 공격 시계 진행과 플레이어 피해 적용
- `client/src/game/sim/world.ts`: AI 후 몬스터 공격 단계 호출
- `client/src/ui/hud-model.ts`: 플레이어 HP 표시 스냅샷
- `client/src/ui/Hud.svelte`, `client/src/app.css`: 플레이어 HP 숫자와 바
- 인접 `__tests__` 파일: RED/GREEN 및 회귀 검증
- `client/README.md`, `progress.md`: 완료 상태와 다음 M3 인계

## 게이트

- 상세 RED 테스트와 명령은 `tdd-plan.md`를 따른다.
- 구현 후 `npm run check`, `npx vitest run`, `npm run build`, `node scripts/validate-runtime-data.mjs`가 모두 통과해야 한다.
- `client/src/game/`에는 Svelte, Three.js, Threlte, 브라우저 전역 의존성을 추가하지 않는다.
