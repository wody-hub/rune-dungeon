# M5.1 — 서버 권위 전환 최소 스캐폴딩

## 목표

M1~M4로 검증된 클라이언트 단독 POC 위에, `Rust + WebSocket` 권위 서버의 골격을 세운다. 한 번의 짧은 흐름으로 아래를 검증한다.

```text
클라 접속 → 프로토콜 버전 합의 → 게스트 접속·플레이어 ID 발급
→ 지면 클릭 인텐트 전송 → 서버가 위치를 확정 → 스냅샷 수신 → 화면 반영
```

이 단계는 전투·M3·M4 규칙을 서버로 옮기지 않는다. 옮길 규칙이 이사 올 **골격과 계약**이 성립하는지만 확인한다.

## 참조 구현

이 설계는 `OpenMMO.incomplete-20260729`를 참조 구현으로 삼는다. 해당 프로젝트는 `plan/04_Technical_Architecture.md` §11.3이 기술하는 `server/` + `shared/` 레이아웃의 원형이며, 동일한 스택(Rust 서버 + Svelte/Three.js 클라이언트 + WebSocket 권위)에서 실제로 동작한다.

아래 항목은 참조 구현에서 그대로 가져온다.

| 항목 | 채택 근거 |
|---|---|
| 루트 Cargo 워크스페이스 + `shared` 크레이트 | 아키텍처 문서 §11.3과 일치 |
| raw `TcpListener` + `tokio-tungstenite` | 참조 구현은 게임 소켓에 axum을 쓰지 않는다. axum은 REST 전용(별도 포트)이며 M5.1에는 REST가 없다 |
| 필수 첫 메시지 `ClientInfo` + 정확 일치 버전 검사 | 재배포할 수 없는 클라이언트를 명확히 거부하는 유일한 통로 |
| close code `4001` 프로토콜 불일치 | 참조 구현의 `CLOSE_CODE_PROTOCOL_MISMATCH` |
| 200ms(5Hz) 이동 틱 + 클라 보간 | 서버 CPU는 틱레이트에 선형이고, 부드러움은 클라가 만든다 |
| 재접속 지수 백오프 + full jitter (1s / 30s / 10회) | 서버 재시작 시 전 클라이언트가 동시 재접속하는 파도를 막는다 |

### 참조 구현과 의도적으로 다르게 가는 부분

참조 구현은 `shared`를 `wasm-pack`으로 빌드해 클라이언트가 직렬화와 결정론적 규칙(A\*, 몬스터 AI)을 WASM으로 재사용하며, 와이어 포맷은 MessagePack이다. 최종 목표 구조는 동일하되, **M5.1에서는 WASM과 MessagePack을 도입하지 않는다.**

- 현재 클라이언트는 Rust 없이 `npm run dev`로 동작하며, 이는 M1~M4 로컬 POC의 핵심 가치다. `wasm-pack`을 넣으면 오프라인 플레이에도 Rust 툴체인이 필요해진다.
- M5.1의 메시지는 6종뿐이다. 이 규모에서 바이너리 프레임은 브라우저 Network 탭에서 읽히지 않아 브링업 디버깅에 순손해다.
- WASM이 처음으로 값을 하는 시점은 클라이언트가 **직렬화가 아니라 규칙**을 공유해야 할 때, 즉 전투가 서버로 이관되는 M5.3 이후다.

따라서 M5.1은 JSON 텍스트 프레임과 수작성 TypeScript 미러 타입을 쓰되, 나중의 전환이 모듈 교체로 끝나도록 다음을 지금 고정한다.

- `shared/Cargo.toml`에 `crate-type = ["cdylib", "rlib"]`를 **처음부터** 선언한다. 지금은 `rlib`만 쓰지만, 나중에 추가하면 매니페스트와 빌드 파이프라인을 동시에 수정해야 한다.
- 프로토콜 타입은 `serde` 파생을 쓴다. 인코딩 교체는 직렬화 호출부 한 곳의 변경으로 끝난다.
- 이동 수식은 TypeScript가 아니라 `shared/src/world.rs`에 둔다.

## 확정 범위

### 워크스페이스 레이아웃

```text
Cargo.toml                    워크스페이스 (members: shared, server)
shared/
  Cargo.toml                  crate-type = ["cdylib", "rlib"]
  src/lib.rs                  PROTOCOL_VERSION, CLOSE_CODE_*, 모듈 재수출
  src/protocol.rs             ClientMessage / ServerMessage / GameIntent
  src/world.rs                Vec2, PLAYER_MOVE_SPEED, step_toward()
  fixtures/*.json             골든 픽스쳐 (cargo test·vitest 양쪽이 읽는다)
server/
  Cargo.toml
  src/main.rs                 TcpListener + accept 루프, 200ms 틱 태스크
  src/session/mod.rs          핸드셰이크, 게스트 접속, 플레이어 ID 발급
  src/world/mod.rs            WorldState, tick_player_movement(dt), 스냅샷 생성
```

아키텍처 문서 §11.3의 `combat/`, `inventory/`, `crafting/`, `content/`, `persistence/`는 **빈 디렉토리로 미리 만들지 않는다.** 규칙이 실제로 이사 올 때 만든다.

`shared/src/world.rs`의 `step_toward()`가 규칙 단일본의 첫 사례다. 이동 수식은 Rust에 한 벌만 존재하고 서버가 그것을 쓴다. 전투를 이관하는 M5.3 이후에 WASM을 켜면 클라이언트도 같은 함수를 호출하게 되며, 그 시점에 `client/src/game/sim/movement.ts`가 삭제된다. 가장 작은 규칙으로 그 경로를 미리 증명하는 것이 목적이다.

`PLAYER_MOVE_SPEED`는 현재 클라이언트의 `PLAYER_SPEED = 6`과 같은 값으로 둔다. 조작감은 M1~M4에서 이미 화면으로 확정한 값이며, 이번 단계에서 재조정하지 않는다.

### 프로토콜 계약

```rust
pub const PROTOCOL_VERSION: u32 = 1;
pub const CLOSE_CODE_PROTOCOL_MISMATCH: u16 = 4001;

pub struct Vec2 { pub x: f32, pub z: f32 }

pub enum ClientMessage {
    ClientInfo { protocol_version: u32, client_kind: String, client_version: String },
    JoinAsGuest { nickname: String },
    Intent(GameIntent),
}

pub enum GameIntent {
    MoveToGround { point: Vec2 },
}

pub enum ServerMessage {
    JoinAccepted  { player_id: u64, nickname: String, position: Vec2 },
    AuthError     { message: String },
    WorldSnapshot { tick: u64, player: PlayerSnapshot },
}

pub struct PlayerSnapshot { pub id: u64, pub position: Vec2, pub target: Option<Vec2> }
```

- `ClientInfo`는 필수 첫 메시지다. 도착 전에는 서버가 다른 어떤 메시지도 처리하지 않는다.
- `protocol_version`은 정확 일치만 통과한다. 불일치 시 `AuthError`를 보낸 뒤 close code `4001`로 끊는다.
- `ClientInfo`와 `AuthError`의 모양은 이후 동결한다. 구버전 클라이언트에게 거부 사유를 전달할 수 있는 유일한 통로이므로, 새 데이터는 항상 새 메시지로 추가하며 이 둘에 끼워 넣지 않는다.
- `client_kind`는 자기 보고값이며 `"web"`만 사용한다. 권한 판단에 쓰지 않는다.
- `GameIntent`는 클라이언트의 기존 10종 중 `MoveToGround` 하나만 정의한다. 나머지 9종은 서버가 판정할 규칙이 아직 없다. 받아놓고 무시하는 인텐트는 서버가 처리한다는 착시를 만든다.
- 좌표는 클라이언트와 동일하게 지면 평면 `{x, z}`를 쓴다.

### 서버 동작

- 기본 바인드는 `127.0.0.1:8080`이며, 주소와 포트는 CLI 인자로 덮어쓸 수 있다.
- 접속마다 단조 증가하는 `u64` 플레이어 ID를 발급한다. 닉네임은 표시용이며 유일성을 강제하지 않는다.
- 게스트는 원점에서 시작한다.
- `Intent(MoveToGround)`는 해당 플레이어의 목표 지점을 갱신할 뿐, 위치를 즉시 바꾸지 않는다.
- 200ms 틱이 `step_toward`로 각 플레이어를 목표 쪽으로 전진시킨다. 목표에 도달하면 목표를 비운다.
- 틱마다 해당 플레이어에게 `WorldSnapshot`을 보낸다. M5.1은 플레이어 간 상호 가시성을 만들지 않으므로 방송이 아니라 개별 전송이다.

### 클라이언트 통합

`client/src/game/`은 브라우저 API 참조가 0건인 순수 TypeScript이며, 이 가드를 유지한다. 따라서 네트워크 코드는 `game/` 밖에 둔다.

```text
client/src/net/protocol.ts     shared 타입의 TypeScript 미러
client/src/net/connection.ts   WebSocket 수명주기, 핸드셰이크, 재접속
```

`game/sim/world.ts`에는 브라우저 API를 쓰지 않는 두 가지만 추가한다.

- `applyAuthoritativePlayerPosition(w, position)` — 순수 함수
- `WorldOptions.playerMovement: 'local' | 'authoritative'` — `'authoritative'`일 때 틱은 플레이어 위치를 스스로 적분하지 않는다

전환은 URL 플래그로 한다. `?server=ws://127.0.0.1:8080`가 없으면 M1~M4 경로는 한 줄도 바뀌지 않는다. 플래그가 있으면 플레이어 위치만 서버 스냅샷이 확정하고, 몬스터·전투·M3·M4는 기존대로 클라이언트가 계산한다.

### 오류 처리

- **프로토콜 불일치** — close `4001`. 재접속을 시도하지 않는다. 캐시된 구버전 번들은 재접속으로 고칠 수 없으므로 리로드 안내만 표시한다.
- **연결 끊김** — 지수 백오프 + full jitter, 기준 1s / 상한 30s / 최대 10회.
- **서버 접속 실패** — 명시적 실패 상태를 표시하고 **로컬 심으로 조용히 폴백하지 않는다.** 폴백하면 고장난 서버가 정상 권위처럼 보인다.
- **해석 불가 메시지** — 기록 후 무시하며 연결을 끊지 않는다.

## 범위 밖

- 전투·드랍·인벤토리·제작·변신·M3·M4 규칙의 서버 이관
- 몬스터 상태의 서버 권위화
- 다중 접속 플레이어 간 상호 가시성, 원격 플레이어 렌더링
- `wasm-pack`, MessagePack, `shared`의 WASM 빌드
- 계정·인증·영속화·데이터베이스
- 허브/인스턴스 분리, 포털, 맵 로딩
- 클라이언트 측 위치 예측과 서버 보정(`PositionCorrection`)
- REST API, 정적 파일 서빙, 배포 구성

## 검증

### 자동 테스트

- **`cargo test -p shared`** — `step_toward` 수식(도달·미도달·영벡터), 프로토콜 serde 왕복
- **`cargo test -p server`** — 버전 불일치 핸드셰이크 거부, `ClientInfo` 이전 메시지 거부, 틱 전진, 플레이어 ID 유일성
- **`npx vitest run`** — `protocol.ts`의 픽스쳐 파싱, `applyAuthoritativePlayerPosition`, `playerMovement: 'authoritative'`일 때 틱이 플레이어 위치를 적분하지 않음
- **골든 픽스쳐** — `shared/fixtures/*.json`을 `cargo test`와 `vitest`가 **양쪽에서** 읽어 같은 파일로 역직렬화를 검증한다. JSON 단계의 드리프트 가드다.
- **순수성 가드** — `client/src/game/`에 브라우저 API 참조가 0건임을 유지

### 수동 확인

- `?server=` 없이 실행하면 M1~M4 플레이 루프가 이전과 동일하게 동작한다.
- `?server=`를 붙이면 지면 클릭 시 플레이어가 서버가 확정한 위치로 이동한다.
- 서버를 끄면 명시적 연결 실패가 표시되고 로컬 심으로 폴백하지 않는다.
- `PROTOCOL_VERSION`을 클라이언트에서 임의로 어긋나게 하면 리로드 안내와 함께 재접속을 멈춘다.

## 선행 조건

이 저장소가 있는 머신에 Rust 툴체인이 설치되어 있지 않다. 구현 착수 전에 `rustup` 설치가 필요하다.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

## 다음 단계

M5.2는 전투보다 먼저 변신을 서버 권위로 이관한다. 서버는 고정 MVP 장착 인 `in_fire_001`과 `NORMAL`/`TRANSFORMED` 상태를 소유하고, 클라이언트는 서버 스냅샷을 받아 임시 화염 오라·무기광을 표시한다. M5.2가 끝나기 전에는 변신을 서버 권위 수직 슬라이스 완료 항목으로 판정하지 않는다.

전투 규칙의 `shared` 이관, `wasm-pack`, MessagePack은 M5.3 이후에 별도 설계한다. 변신 토글은 결정적 전투 수식 공유를 요구하지 않으므로, M5.2에 이 복잡도를 앞당기지 않는다.
