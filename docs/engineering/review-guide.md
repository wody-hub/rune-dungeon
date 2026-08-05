# Rune Dungeon 코드 리뷰 가이드

이 문서는 Rune Dungeon 코드에 Clean Code 점검과 아키텍처 점검을 수행하는 절차다.
[코드 표준](./code-standards.md)이 규칙을 정의하고, 이 문서는 그 규칙을 어떤 증거로 검사하고
어떻게 판정할지를 정의한다.

## 1. 리뷰의 목표

리뷰의 목표는 완벽한 코드를 요구하는 것이 아니라 변경 후 저장소의 정확성, 이해 가능성,
테스트 가능성, 운영 가능성이 이전보다 나빠지지 않게 하는 것이다. 리뷰어는 취향이 아니라
계약, 실행 결과, 코드 근거를 사용한다.

리뷰는 다음 질문에 답해야 한다.

1. 변경이 승인된 요구와 사용자 동작을 정확히 구현하는가?
2. 실패 경로와 경계값에서도 상태 소유권과 불변식이 유지되는가?
3. 코드를 빠르게 이해하고 안전하게 수정할 수 있는가?
4. 의존 방향과 서버 권위 경계를 지키는가?
5. 테스트가 구현 세부가 아니라 중요한 동작을 보호하는가?

## 2. 리뷰 입력과 범위

리뷰를 시작하기 전에 아래 자료를 확인한다.

- 변경 목적과 승인된 계획·설계 문서
- `git diff`와 변경 파일 전체 문맥
- 관련 프로토콜 fixture와 런타임 데이터
- 변경된 공개 인터페이스의 호출자와 의존 대상
- 기존 테스트와 새 테스트의 RED/GREEN 근거
- [코드 표준](./code-standards.md), `CLAUDE.md`, 필요하면 `DESIGN.md`

리뷰한 범위를 명시한다. 전체 diff가 아니라 특정 파일, 보안, 동시성, UI만 검토했다면 결과에
그 제한을 적는다. 사람이 작성한 함수나 컴포넌트를 문맥 없이 일부 줄만 보고 승인하지 않는다.

## 3. 판정과 심각도

| 등급 | 의미 | 예시 | 병합 기준 |
|---|---|---|---|
| `BLOCKER` | 사용자 상태, 권위, 보안, 프로토콜을 깨는 결함 | 클라이언트가 서버 상태 확정, 잘못된 snapshot 적용, 무제한 큐, 데이터 손상 | 반드시 수정 |
| `MAJOR` | 높은 결함 위험 또는 구조적 퇴행 | 역방향 의존, cleanup 누락, 핵심 실패 테스트 부재, 여러 책임 결합 | 원칙적으로 수정 |
| `MINOR` | 국소 유지보수성·가독성 문제 | 중복 분기, 불명확한 이름, 좁은 타입 개선 | 수정 또는 후속 근거 기록 |
| `NIT` | 동작과 코드 건강에 영향이 없는 선택 | 문장 다듬기, 동등한 표현 선호 | 선택 사항 |

심각도는 수정 줄 수가 아니라 사용자 영향, 발생 가능성, 탐지 난이도, 복구 비용, 경계 침범으로
정한다. 자동 포맷터가 해결할 문제를 MAJOR로 올리지 않고, 작은 한 줄의 권위 우회를 MINOR로
낮추지 않는다.

최종 판정은 다음 중 하나다.

- **PASS**: BLOCKER와 MAJOR가 없고 필수 검증이 통과했다.
- **PASS WITH FOLLOW-UPS**: BLOCKER와 MAJOR는 없으며 명시된 MINOR 후속만 남았다.
- **CHANGES REQUIRED**: BLOCKER 또는 MAJOR가 남아 있거나 필수 검증이 실패했다.
- **INCOMPLETE**: 필요한 실행 환경, 문서, 테스트 증거가 없어 판정할 수 없다.

## 4. 리뷰 절차

### 4.1 변경 위생 확인

먼저 변경 자체가 리뷰 가능한지 확인한다.

- 변경 목적과 관계없는 파일이 포함되지 않았는가?
- 생성물, 사용자 로컬 파일, 비밀값이 포함되지 않았는가?
- 포맷 전용 변경과 기능 변경이 불필요하게 섞이지 않았는가?
- 삭제·이름 변경 시 참조, 문서, 테스트도 함께 갱신됐는가?
- 변경이 하나의 논리 단위로 설명 가능한가?

큰 변경은 줄 수만으로 거부하지 않는다. 그러나 독립적으로 동작하는 프로토콜, 서버 상태,
클라이언트 투영, UI 연결이 한 diff에 뒤섞여 검증하기 어렵다면 논리 단위 분리를 요청한다.

### 4.2 계약과 기능 확인

계획서의 요구를 테스트와 코드에 대응시킨다.

| 계약 질문 | 필요한 증거 |
|---|---|
| 입력이 정확히 한 권위로 전달되는가? | send/enqueue 분기, no-fallback 테스트 |
| 상태를 올바른 소유자가 확정하는가? | 서버 world 전이, snapshot 적용 코드 |
| 잘못된 입력이 상태를 바꾸지 않는가? | parser/session 거부 테스트 |
| 순서가 뒤바뀐 이벤트가 복구되는가? | tick/revision/generation 테스트 |
| 종료 후 자원이 남지 않는가? | disconnect/dispose/cleanup 테스트 |
| 로컬 POC 경로가 유지되는가? | 서버 URL 없음 회귀 테스트와 수동 확인 |

요구를 구현한 함수가 있다는 사실만으로 통과시키지 않는다. 실제 entry point에서 해당 함수가
호출되고 반대 경로가 차단되는지 확인한다.

### 4.3 자동 검사 실행

관련 범위의 빠른 테스트를 먼저 실행하고, 완료 판정 전에 전체 검증을 실행한다.

```bash
# repository root
cargo fmt --all -- --check
cargo test --workspace
cargo clippy --workspace -- -D warnings
node scripts/validate-runtime-data.mjs
git diff --check

# client
cd client
npm run check
npx vitest run
npm run build
```

명령이 실패하면 결과를 숨기거나 unrelated로 단정하지 않는다. 변경 때문에 발생했는지,
기존 실패인지, 생성 환경 문제인지 증거를 분리한다. 실패 상태에서는 PASS를 내리지 않는다.

## 5. Clean Code 점검 기준

### 5.1 이해 가능성

- 파일을 처음 읽는 개발자가 입력, 출력, 상태 변경을 추적할 수 있는가?
- 이름이 도메인 의미와 단위를 전달하는가?
- 핵심 제약이 여러 함수에 암묵적으로 흩어져 있지 않은가?
- 분기와 조기 반환이 정상 경로와 실패 경로를 구분하는가?
- 주석이 코드 번역이 아니라 이유와 제약을 설명하는가?

**MAJOR 신호**

- 한 상태를 여러 독립 위치가 서로 다른 규칙으로 변경한다.
- 함수 이름만 보고 mutation, I/O, retry, close 여부를 알 수 없다.
- 구현을 이해하려면 관련 없는 여러 디렉터리를 왕복해야 한다.

### 5.2 책임과 응집도

다음 질문 중 여러 개에 “예”라면 분리를 검토한다.

- 파일이 서로 다른 이유로 자주 변경되는가?
- 함수가 계산, 상태 변경, 직렬화, I/O, 표시를 동시에 수행하는가?
- 테스트 하나를 준비하기 위해 관계없는 대형 fixture가 필요한가?
- 작은 계약 변경이 많은 분기와 컴포넌트를 함께 수정하게 하는가?
- private 구현을 직접 테스트하고 싶을 만큼 한 단위가 복잡한가?

분리는 작은 함수 수를 늘리는 것이 목적이 아니다. 바뀌는 이유와 테스트 경계를 실제로
분리해야 한다. 반대로 한 번만 쓰는 얇은 wrapper가 의미를 추가하지 않으면 합칠 수 있다.

### 5.3 타입과 불변식

- 판별 유니온이나 Rust enum이 유효 상태를 표현하는가?
- `null`/`Option`이 실제 부재를 뜻하며 sentinel 값과 섞이지 않는가?
- 외부 입력을 검증하기 전에 내부 타입으로 cast하지 않는가?
- `tick`, `revision`, `player_id`, 좌표가 허용 범위를 검사하는가?
- 변환 후에도 ID, 상태, sequence의 단조 증가 불변식이 유지되는가?

`any`, 이중 cast, non-null assertion, Rust `expect()`는 각 사용 위치에서 증명 가능한 근거를
검토한다. 경계 실패를 숨기는 사용은 MAJOR 이상이다.

### 5.4 상태와 mutation

- 상태의 단일 소유자가 명확한가?
- mutation은 이름 있는 전이 함수나 tick 안에 모여 있는가?
- UI 표시 상태와 게임 정본 상태가 구분되는가?
- 복사와 참조 공유가 의도한 소유권을 보존하는가?
- 이전 세션·이전 tick·이전 revision이 현재 상태를 되돌릴 수 없는가?

상태를 불변으로 만드는 것 자체가 목적은 아니다. 게임 루프처럼 통제된 mutation이 적합한
곳에서는 변경 지점, 순서, 테스트가 명확한지를 본다.

### 5.5 오류 처리와 관찰 가능성

- 호출자가 복구할 수 있는 오류를 panic이나 throw로 숨기지 않는가?
- 무시하는 프레임과 종료하는 프레임 정책이 구분되는가?
- 사용자 메시지와 개발 로그가 다음 조치를 알려주는가?
- retry에 상한, jitter, terminal error가 있는가?
- 오류 로그에 비밀값이나 과도한 사용자 데이터가 포함되지 않는가?

오류를 `catch {}`나 `let _ =`로 버리는 코드는 의도와 테스트가 없으면 MAJOR다. best-effort
close처럼 결과를 더 이상 복구할 수 없는 경우에는 cleanup이 보장되는지를 함께 확인한다.

### 5.6 중복과 추상화

- 같은 계약이 Rust와 TypeScript에 반복되면 골든 fixture가 drift를 잡는가?
- 단순 우연이 아니라 함께 바뀌는 규칙만 추상화했는가?
- 새 generic, trait, class가 현재 두 개 이상의 실제 사용을 단순하게 만드는가?
- 추상화가 오류, lifetime, 상태 소유자를 숨기지 않는가?

프로토콜 미러처럼 의도적인 중복은 허용한다. 이 경우 양쪽 구현을 묶는 계약 테스트가 MUST
존재한다. 미래 기능을 예상한 범용화는 거부한다.

### 5.7 테스트 품질

- 테스트가 변경 전 예상한 이유로 실패했는가?
- 구현을 깨뜨리면 테스트도 실제로 실패하는가?
- 테스트 이름이 조건과 결과를 설명하는가?
- 성공, 거부, 경계값, 순서 역전, cleanup을 포함하는가?
- 시간, 난수, 네트워크가 결정적으로 통제되는가?
- 테스트 자체에 프로덕션 로직을 다시 구현하지 않는가?

문자열 포함 여부만 보는 raw-source contract test는 실제 런타임 관찰이 어렵거나 정적 경계를
잠그는 보조 수단으로만 사용한다. 가능한 동작은 실행 테스트로 보호한다.

## 6. 아키텍처 점검 기준

### 6.1 의존 방향

소스 import 의존 방향은 다음과 같다. 화살표 왼쪽이 오른쪽을 알 수 있다는 뜻이다.

```text
server/session ──> server/world ──> shared
server/session ───────────────────> shared

client/scene ──> client/net
client/scene ──> client/game ──> client/data + client/types
client/ui ─────────────────────> client/game
```

런타임 메시지와 표시 흐름은 반대 방향을 포함한다.

```text
입력 → client/net intent → server/session → server/world
     → WorldSnapshot → client/net validation → scene adapter
     → client/game projection → scene/UI 표시
```

두 다이어그램의 핵심은 안쪽 규칙이 바깥 프레임워크를 알지 않는다는 것이다.

| 영역 | 허용 | 금지 또는 리뷰 필요 |
|---|---|---|
| `shared` | 표준 라이브러리, Serde, 프로토콜·결정적 계산 | Tokio, WebSocket 세션, 브라우저, 클라이언트 표시 |
| `server/world` | `shared`, 순수 권위 상태 전이 | 소켓 프레임 처리, Svelte/Three, 클라이언트 UI 상태 |
| `server/session` | WebSocket, phase 검증, registry, `server/world` 호출 | 게임 규칙 중복, 무제한 mailbox, 장시간 lock |
| `client/net` | 브라우저 WebSocket, wire validation, reconnect | Three.js 렌더, 로컬 게임 결과 확정 |
| `client/game` | 순수 TS 상태와 계산, 데이터 타입 | Svelte, Three.js, DOM, 브라우저 WebSocket, `client/net` wire 타입 |
| `client/scene` | 입력 정규화, loop orchestration, Three/Threlte 표시 | HP·드랍·권위 위치를 독자 확정 |
| `client/ui` | 저빈도 snapshot 표시와 사용자 intent callback | 프레임 simulation, 서버 상태 mutation |

외부 wire 타입을 `client/game`에 직접 들이지 않는다. scene 또는 adapter가 검증된 snapshot을
게임 계층의 로컬 입력 DTO로 투영한다. 이 규칙은 순수 게임 로직을 브라우저 없이 테스트하고
향후 서버 이관 경계를 유지하기 위한 MUST다.

### 6.2 서버 권위

서버 URL이 있는 경로에서 다음 규칙은 BLOCKER 기준이다.

- 클라이언트는 매개변수가 승인된 intent만 보낸다.
- 서버가 플레이어 ID, 위치, 장착 상태, 전투 모드, revision을 소유한다.
- 클라이언트는 검증한 새 `WorldSnapshot`을 받은 뒤에만 권위 표시 상태를 바꾼다.
- 다른 플레이어, 이전 tick, 이전 socket generation의 snapshot을 무시한다.
- 연결 실패를 로컬 이동·변신으로 폴백하지 않는다.
- 프로토콜 오류는 `AuthError`가 close 4001보다 먼저 전달된다.
- 서버 모드에서 아직 권위화하지 않은 전투, 드랍, 인벤토리, 제작, 보스 입력은 차단한다.

서버 URL이 없는 로컬 M1–M4 POC는 별도 승인 없이 권위 경로 때문에 퇴행하면 안 된다.

### 6.3 프로토콜과 호환성

- 버전은 Rust와 TypeScript에서 정확히 일치해야 한다.
- wire shape는 골든 fixture가 양쪽에서 round-trip되어야 한다.
- 새 variant는 허용 phase, malformed 정책, close 정책, UI 처리까지 검토한다.
- parser는 알 수 없는 key와 잘못된 숫자를 조용히 내부 타입으로 흘리지 않는다.
- 기존 클라이언트와 호환하지 않는 변경은 protocol version을 올리고 거부 동작을 테스트한다.
- 오류 문구에 현재 프로토콜 버전과 다른 오래된 값이 남지 않았는지 검색한다.

### 6.4 세션과 동시성

- 세션 phase 전이는 순서가 명시된 상태기계여야 한다.
- player 등록과 제거는 소켓 성공, 오류, close에서 대칭이어야 한다.
- snapshot mailbox는 bounded이며 느린 소비자가 서버 메모리를 늘리지 못해야 한다.
- world lock을 보유한 채 소켓 전송을 기다리지 않는다.
- task 생성에는 종료 조건과 cleanup 소유자가 있어야 한다.
- tick 지연 정책, 재연결 상한, timeout은 상수와 테스트로 드러나야 한다.

동시성 코드는 테스트가 통과했다는 이유만으로 승인하지 않는다. lock 순서, await 지점,
sender/receiver drop 순서를 사람이 직접 따라간다.

### 6.5 클라이언트 simulation과 렌더링

- fixed-step simulation이 frame rate와 독립적인가?
- 긴 정지 후 catch-up이 상한을 가지며 backlog를 명시적으로 처리하는가?
- game state와 보간용 render state가 분리되는가?
- 매 프레임 값이 Svelte 반응성을 불필요하게 깨우지 않는가?
- `requestAnimationFrame`, socket, timer가 unmount 시 정리되는가?
- `prefers-reduced-motion`에서도 정보와 상태가 유지되는가?

Three.js 객체 mutation은 렌더 계층에서 허용한다. simulation이 Mesh, Material, DOM을 알게
되면 MAJOR다.

### 6.6 런타임 데이터

- 안정 ID가 모든 참조에서 일치하는가?
- `schemaVersion`과 타입 정의가 JSON shape와 일치하는가?
- 확률, 수량, 시간, 거리 값이 유효 범위 안에 있는가?
- server-owned 정본과 client display fixture가 혼동되지 않는가?
- 런타임 데이터 변경이 문서의 승인된 수치와 drift하지 않는가?
- `node scripts/validate-runtime-data.mjs`가 새 참조와 불변식을 실제로 검사하는가?

검증 스크립트가 source text 정규식에 의존하면 이름 변경과 문서 형식 변경에서 오탐이 생길
수 있다. 가능한 데이터 계약은 parser와 구조적 검증을 우선한다.

### 6.7 품질 속성

아키텍처 리뷰는 기능 외에도 다음 속성을 확인한다.

| 속성 | 질문 |
|---|---|
| 정확성 | 권위 상태와 프로토콜 불변식이 모든 경로에서 유지되는가? |
| 유지보수성 | 변경 이유가 모듈 경계와 일치하고 파급 범위가 제한되는가? |
| 테스트 가능성 | 시간, 난수, I/O를 통제해 브라우저·고정 포트 없이 핵심을 검증할 수 있는가? |
| 신뢰성 | disconnect, malformed input, 지연, 재연결에서 복구 또는 안전 종료하는가? |
| 성능 | 60Hz loop, 5Hz snapshot, 렌더 업데이트에 불필요한 할당·반응성·무제한 큐가 없는가? |
| 보안 | 외부 입력을 검증하고 권한·세션·로그 경계를 지키는가? |
| 접근성 | 키보드, focus, 상태 알림, 모션 감소에서도 핵심 기능을 이해할 수 있는가? |

각 속성을 모든 변경에서 같은 깊이로 심사할 필요는 없다. 네트워크, 권위 상태, 렌더 loop,
런타임 데이터처럼 실패 비용이 큰 영역은 전체 점검을 수행한다.

## 7. 실패 모드 체크리스트

### 서버·프로토콜

- [ ] 잘못된 protocol version
- [ ] `ClientInfo` 전 또는 `JoinAsGuest` 전 메시지
- [ ] malformed text와 binary frame
- [ ] ping/pong과 normal close
- [ ] 느린 snapshot 소비자
- [ ] writer/reader 오류 중 cleanup
- [ ] 유효하지 않은 player ID와 intent
- [ ] tick 지연과 음수·0 `dt`

### 클라이언트 연결

- [ ] 잘못된 WebSocket URL
- [ ] join 전 snapshot
- [ ] 다른 player snapshot
- [ ] 같거나 작은 tick
- [ ] 재연결 후 낮은 새 session tick
- [ ] 이전 socket callback
- [ ] protocol close 4001
- [ ] 10회 재연결 소진과 dispose 중 timer 취소

### 게임·UI

- [ ] 서버 URL 없는 로컬 회귀
- [ ] 서버 연결 실패 중 입력
- [ ] 서버 모드 금지 입력
- [ ] authoritative snapshot 전 표시 변경 여부
- [ ] 큰 frame interval과 catch-up 상한
- [ ] component unmount와 rAF cleanup
- [ ] keyboard/focus와 reduced motion
- [ ] WebGL이 없는 환경의 사용자 안내가 필요한 변경인지 여부

모든 변경에서 목록 전체를 새로 테스트할 필요는 없다. 영향을 받는 실패 모드가 기존 테스트로
보호되는지 추적하고, 계약이 새로 생기거나 달라지면 테스트를 추가한다.

## 8. 전체 리뷰와 경량 리뷰

다음 변경은 전체 Clean Code·아키텍처 리뷰를 수행한다.

- 프로토콜 version 또는 wire shape 변경
- server authority 상태·intent·snapshot 변경
- session, reconnect, tick, task, lock 변경
- `client/game`, `client/net`, scene 경계를 넘는 의존 추가
- 런타임 데이터 schema 또는 정본 소유권 변경
- game loop, 렌더 주기, 반응성 전략 변경
- 인증, 개인정보, 외부 배포, 저장 기능 추가

오탈자, 동작 없는 문서 수정, 테스트 설명 개선처럼 실행 경계를 바꾸지 않는 변경은 관련 파일,
링크, `git diff --check` 중심의 경량 리뷰로 충분하다.

## 9. 리뷰 결과 작성 형식

발견 사항은 심각도순으로 작성한다. 각 항목은 하나의 수정 가능한 문제만 다룬다.

```markdown
## Findings

### [MAJOR] stale snapshot이 현재 변신 상태를 되돌릴 수 있음

- 위치: `client/src/net/connection.ts:123`
- 영향: 재연결 직후 이전 소켓의 snapshot이 새 세션 상태를 덮을 수 있다.
- 위반 기준: `review-guide.md` §6.2 서버 권위, §6.3 프로토콜과 호환성
- 근거: callback이 socket generation을 확인하지 않고 tick watermark도 join에서 초기화하지 않는다.
- 최소 수정: generation guard를 추가하고 새 `JoinAccepted`에서 watermark를 초기화한다.
- 검증: 이전 socket callback과 새 session tick 1을 함께 재현하는 테스트를 추가한다.
```

문제가 없으면 “문제 없음”만 쓰지 말고 검토 범위와 실행한 검증을 남긴다.

```markdown
## Review result: PASS

- 범위: protocol v2 Rust/TypeScript mirror와 WebSocket session
- 자동 검증: `cargo test --workspace`, `npx vitest run` 통과
- 수동 검증: 서버 연결, 이동, 변신, 연결 종료 후 no-fallback 확인
- 잔여 위험: 실제 다중 브라우저 부하와 장시간 soak test는 수행하지 않음
```

## 10. 완료 기준

다음을 모두 만족해야 PASS 또는 PASS WITH FOLLOW-UPS를 줄 수 있다.

- [ ] 승인된 요구가 코드와 테스트에 대응된다.
- [ ] BLOCKER와 MAJOR가 남지 않았다.
- [ ] 관련 실패 모드와 cleanup이 검증됐다.
- [ ] 의존 방향과 서버 권위 규칙을 지킨다.
- [ ] 필수 Rust·클라이언트·데이터 검증이 통과했다.
- [ ] 문서, fixture, 실행 안내가 코드와 일치한다.
- [ ] 생성물과 관계없는 사용자 변경이 포함되지 않았다.
- [ ] 리뷰 범위와 수행하지 못한 검증을 명시했다.

## 11. 피해야 할 리뷰 방식

- 개인 취향을 규칙처럼 강요하지 않는다.
- 함수·파일 줄 수 하나로 Clean Code를 판정하지 않는다.
- 테스트 개수나 coverage 숫자만으로 핵심 동작 보호를 추정하지 않는다.
- 자동 포맷 문제와 권위·동시성 문제를 같은 심각도로 다루지 않는다.
- 현재 변경과 무관한 대규모 리팩터링을 승인 조건으로 묶지 않는다.
- “나중에 고친다”는 말만으로 권위, 보안, 데이터 손상 문제를 통과시키지 않는다.
- diff만 보고 전체 파일과 호출 문맥을 읽지 않은 채 승인하지 않는다.

## 12. 근거 자료

아래 자료를 2026-08-05에 확인했다.

- [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Google Engineering Practices: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
- [Martin Fowler: Refactoring Catalog](https://refactoring.com/catalog/)
- [Martin Fowler: The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Microsoft Azure Architecture Center: Design principles](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting/)
- [Svelte compiler warnings](https://svelte.dev/docs/svelte/compiler-warnings)

외부 자료는 리뷰 원칙의 근거다. 실제 합격 기준은 Rune Dungeon의 승인된 제품 계약,
프로토콜 fixture, 테스트, [코드 표준](./code-standards.md)이 정한다.
