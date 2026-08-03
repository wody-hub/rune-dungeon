# 계획 리뷰 결과: m2-5-monster-counterattack

## README.md 표준 준수 체크

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| 1 | 패키지 구조 | PASS | 순수 전투 로직은 `game/sim/combat`, HUD는 `ui`에 둔다. |
| 2 | 네이밍 규칙 | PASS | 기존 `tick*`, `create*`, `reset*` 패턴을 따른다. |
| 3 | API 설계 | N/A | 클라이언트 단독 POC이며 API 변경이 없다. |
| 4 | 보안·권한 | N/A | 인증·외부 입력·서버 경계 변경이 없다. |
| 5 | 검증 | PASS | 런타임 데이터 검증과 TypeScript/Vitest 게이트를 유지한다. |
| 6 | 트랜잭션 | N/A | 저장소나 서버 트랜잭션이 없다. |
| 7 | 설계 전 논의 | PASS | 공간 AI와 공격 판정 분리 결정이 계획에 반영됐다. |
| 8 | 계획 전 리서치 | PASS | 신규 의존성·API가 없어 기존 패턴 재사용 사유로 생략했다. |
| 9 | TDD 계획 | PASS | 런타임 상태, 공격 시계, 월드 통합, HUD RED/GREEN 명령이 연결된다. |

## gstack 리뷰 결과

### Step 0: Scope Challenge

- 계획은 테스트·HUD·문서를 포함해 15개 파일을 다루지만 신규 제품 모듈은 `monster-attack.ts` 하나다.
- 사용자는 HP HUD와 TDD 증거를 제거하지 않고 승인된 범위를 그대로 진행하기로 확정했다.
- 새 라이브러리, 브라우저 API, 동시성, 배포 산출물을 도입하지 않아 외부 검색은 불필요하다.

### What already exists

- `world.ts`의 플레이어 공격 시계 루프를 몬스터 공격 시계에 대칭적으로 재사용한다.
- `damage.ts`의 `rollPhysicalDamage`를 재사용하며 별도 피해식을 만들지 않는다.
- `monster-ai.ts`의 `engaged` 결과와 기존 Map 순회 순서를 사용한다.
- `hud-model.ts`의 저빈도 스냅샷·동등성 경계를 확장한다.

### Architecture Review

- PASS. 공간 AI, 순수 공격 판정, 월드 오케스트레이션, HUD 표현의 책임 경계가 기존 구조와 일치한다.
- 데이터 흐름: `fixture → runtime content → AI mode → attack clock → PlayerState.hp → HudSnapshot`.
- 순차 구현이 적합하다. Task 1의 상태 계약을 Task 2가 소비하고 Task 3이 월드 상태를 표시하므로 병렬 구현 이점이 없다.

### Code Quality Review

- PASS. 새 추상화는 공격 판정 모듈 하나뿐이며 기존 피해식과 상태 초기화 함수를 재사용한다.
- Task 1 파일 목록에서 실제 수정 대상 `world.ts`가 빠진 문서 불일치를 보완했다.

### Test Review

```text
CODE PATHS                                      USER FLOWS
[+] createWorld → createPlayerState             [+] 슬라임 교전
  ├── [★★★ planned] fixture HP                    ├── [★★★ planned] 420ms 첫 피격
  └── [★★★ planned] 상한/하한/음수 maxHp           ├── [★★★ planned] 1820ms 다음 피격
[+] tickMonsterAi → tickMonsterAttack             ├── [★★★ planned] 이탈 후 시계 초기화
  ├── [★★★ planned] dead/non-engaged reset         └── [★★★ planned] 복수 몬스터 독립 피격
  ├── [★★★ planned] pending hit/motion boundary  [+] HUD
  ├── [★★★ planned] large dt 다중 적중              └── [★★★ planned] 숫자·바 즉시 갱신
  └── [★★★ planned] HP 0 clamp
```

- 초기 HP 정규화 구현에 대응하는 상·하한 테스트가 빠져 있어 상세 계획과 TDD 계획에 추가했다.
- 나머지 주요 분기와 사용자 흐름은 순수 단위 테스트 및 월드 통합 테스트로 커버된다.

### Failure modes

| 흐름 | 현실적 실패 | 테스트 | 처리/사용자 결과 |
|---|---|---|---|
| 초기 HP | fixture 값이 범위를 벗어남 | 계획됨 | 생성 시 `[0, maxHp]` 정규화 |
| 공격 시계 | 큰 dt에서 적중 누락 | 계획됨 | 이벤트 루프로 모든 적중 처리 |
| 교전 이탈 | 부분 시계가 남아 즉시 피격 | 계획됨 | non-engaged에서 즉시 초기화 |
| 복수 공격 | 한 몬스터 시계가 다른 몬스터와 공유됨 | 계획됨 | 엔티티별 상태와 독립 순회 |
| HUD | HP 변경이 동등성 검사에서 누락됨 | 계획됨 | snapshot 비교에 HP 포함 |

침묵 실패이면서 테스트와 처리가 모두 없는 경로는 없다.

### Performance Review

- PASS. 기존 고정 스텝과 몬스터 3마리 Map 순회에 선형 루프 하나가 추가된다.
- 공격 이벤트 루프는 경과한 이벤트 수에 비례하며 고정 스텝 캐치업 제한 아래에서 동작한다.

## 설계 전 논의 반영

- discussion.md 존재: Y
- 구현 계획 반영: PASS

## 계획 전 리서치 반영

- research status: skipped
- external research status: not-needed
- research.md 존재: N
- external citations: N/A
- 리서치 수행/스킵 판단 근거: PASS
- 권장 접근/위험/테스트 관점 반영: PASS

## TDD 계획 검토

- tdd-plan.md 존재: Y
- RED 테스트 구체성: PASS
- 테스트 명령 정의: PASS
- 주요 동작 커버: PASS

## NOT in scope

- 플레이어 사망·부활·전투 종료: 이번 반격 루프 검증 뒤 별도 상태 전이로 설계한다.
- 회피·경직·무적: 최소 피해 루프에 필요하지 않다.
- 애니메이션·VFX·SFX·데미지 텍스트: 첫 비주얼 디자인 체크포인트 이후 다룬다.
- 보스·투사체·광역 공격: 현재 단일 근접 슬라임 계약과 무관하다.

## Implementation Tasks

기존 상세 계획의 Task 1~4로 모두 추적된다. 추가 후속 TODO는 없다.

## 종합 판정

- PASS: 초기 HP 경계 테스트와 Task 1 파일 계약을 보완했으며 구현 진행 가능.
