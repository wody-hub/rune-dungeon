# M2.5 몬스터 반격 TDD 계획

## 공통 실행 환경

- 작업 위치: `client/`
- Node.js: `v22.12.0` 이상
- 테스트 러너: Vitest `v4.1.10`
- 결정적 피해 fixture: `baseDamage=18`, `defenseFromStr=12`, 결과 `16`

## RED-1 런타임 상태와 생명주기

대상:

- `client/src/game/sim/fsm/__tests__/player-fsm.test.ts`
- `client/src/game/sim/entities/__tests__/monster.test.ts`

실패 조건:

- `createPlayerState({ hp: 196, maxHp: 196 })`가 HP 필드를 만들지 못한다.
- 새 몬스터가 `attackElapsedMs=0`, `pendingHitMs=null`을 갖지 않는다.
- 추적 중인 몬스터의 공격 시계가 사망과 리스폰에서 초기화되지 않는다.

실행:

```bash
npx vitest run src/game/sim/fsm/__tests__/player-fsm.test.ts src/game/sim/entities/__tests__/monster.test.ts
```

예상 RED: 타입 오류 또는 새 필드 assertion 실패.

## RED-2 공격 시계와 피해

대상:

- `client/src/game/sim/combat/__tests__/monster-attack.test.ts`
- `client/src/game/sim/__tests__/world.test.ts`

실패 조건:

- `419ms`에는 HP가 유지되고 다음 `1ms`에 정확히 `16` 감소하지 않는다.
- 첫 모션 시작 후 `1819ms`까지 두 번째 피해가 없고 `1820ms`에 두 번째 피해가 발생하지 않는다.
- 큰 `dt`가 지나간 모든 적중을 한 번씩 처리하지 않는다.
- `engaged` 이탈이 부분 공격 시계를 초기화하지 않는다.
- 죽은 몬스터와 비전투 모드가 피해를 준다.
- 두 몬스터가 독립적으로 같은 틱에 피해를 주지 않는다.
- 플레이어 HP가 `0` 아래로 내려간다.
- 월드가 AI 처리 후 공격 단계를 호출하지 않는다.

실행:

```bash
npx vitest run src/game/sim/combat/__tests__/monster-attack.test.ts src/game/sim/__tests__/world.test.ts
```

예상 RED: 새 모듈 import 실패와 플레이어 HP assertion 실패.

## RED-3 HUD 표시 모델

대상:

- `client/src/ui/__tests__/hud-model.test.ts`

실패 조건:

- 스냅샷이 `playerHp`, `playerMaxHp`를 노출하지 않는다.
- HP 변경 후에도 `hudSnapshotsEqual`이 `true`를 반환한다.

실행:

```bash
npx vitest run src/ui/__tests__/hud-model.test.ts
```

예상 RED: 스냅샷 shape 및 equality assertion 실패.

## GREEN 및 회귀 게이트

각 RED 그룹은 해당 최소 구현 직후 같은 명령으로 GREEN을 확인한다. 마지막에는 다음을 실행한다.

```bash
npm run check
npx vitest run
npm run build
cd ..
node scripts/validate-runtime-data.mjs
```

추가 경계 검사:

```bash
if rg -n "from ['\"](?:svelte|three|@threlte)|import\\(['\"](?:svelte|three|@threlte)" client/src/game; then
  exit 1
fi
if rg -n '\b(window|document|navigator|location|localStorage|sessionStorage|requestAnimationFrame|cancelAnimationFrame|HTMLElement|HTMLCanvasElement|fetch|WebSocket)\b' client/src/game; then
  exit 1
fi
```

## 증거 기록

각 RED/GREEN 명령, 실제 실패 이유, 최종 테스트 수, 변경 파일과 커밋 SHA를 `.si-planning/m2-5-monster-counterattack/tdd-report.md`에 기록한다.
