# M5.2 — 서버 권위 변신

## 목표

M5.1의 이동 권위 골격 위에서 화염 인 변신을 서버가 확정한다. 서버 URL 경로에서 클라이언트는 변신 의도만 보내고, 서버의 스냅샷이 `NORMAL` 또는 `TRANSFORMED`를 확정한다.

```text
변신 버튼 → Intent(ToggleTransformation) → 서버의 장착 인·결 상태 검증
→ combat_mode 변경·revision 증가 → WorldSnapshot → 임시 오라·무기광 전환
```

## 확정 범위

- M5.1이 완료되어 Rust 워크스페이스, protocol v1, 서버 권위 위치 스냅샷, `?server=` 경로가 존재하는 것을 선행 조건으로 한다.
- 프로토콜은 `v2`로 올린다. `ClientInfo`와 `AuthError`의 모양은 바꾸지 않으며, `GameIntent::ToggleTransformation`과 `PlayerSnapshot.transformation`만 추가한다.
- 서버 세션은 MVP 고정 장착 상태 `in_fire_001`과 현재 결 `letter_gyeol_hwa_001`을 소유한다. 장착·제작 이관 전의 임시 서버 시작 세팅이며 클라이언트가 이 값을 제출하거나 바꿀 수 없다.
- `ToggleTransformation`은 인 ID와 현재 결이 유효할 때만 `NORMAL <-> TRANSFORMED`를 전환하고, 매 성공마다 `revision`을 1 증가시킨다.
- `WorldSnapshot`은 위치와 변신 상태를 함께 보낸다. 클라이언트는 더 큰 tick의 같은 플레이어 스냅샷만 적용한다. 따라서 지연된 프레임이 변신을 되돌리지 않는다.
- 클라이언트는 `in_id`와 `combat_mode`를 검증된 콘텐츠에 대조해 `inTierName`, 속성, 임시 오라·무기광을 파생한다. 현재는 임시 기하를 사용하며 GLB 로딩은 게이트 C까지 범위 밖이다.
- 서버 URL 경로에서는 변신 버튼만 활성화한다. M3 제작·습득, 전투, 몬스터 상호작용, M4 관문은 계속 차단한다. 서버 URL이 없는 기존 M1~M4 POC는 변경하지 않는다.

## 프로토콜 v2

```rust
pub enum GameIntent {
    MoveToGround { point: Vec2 },
    ToggleTransformation,
}

pub enum CombatMode {
    Normal,
    Transformed,
}

pub struct TransformationSnapshot {
    pub in_id: String,
    pub combat_mode: CombatMode,
    pub revision: u64,
}

pub struct PlayerSnapshot {
    pub id: u64,
    pub position: Vec2,
    pub target: Option<Vec2>,
    pub transformation: TransformationSnapshot,
}
```

Serde는 `CombatMode`를 `"NORMAL"`과 `"TRANSFORMED"`로 직렬화한다. 첫 `WorldSnapshot`은 연결 직후에도 `in_fire_001`, `NORMAL`, `revision: 0`을 포함한다.

## 거부·오류 정책

- 일반 클라이언트가 보내는 토글은 인 ID나 티어·속성을 포함하지 않는다. 서버가 장착 상태와 해금 조건을 소유하므로 임의 인·상위 티어 위조 경로가 없다.
- 서버 내부 상태가 변신 요건을 충족하지 않으면 토글을 무시하고 상태를 바꾸지 않는다. 이 MVP에서는 서버 시작 세팅이 요건을 갖추므로 정상 사용자에게 별도 거부 UI를 만들지 않는다.
- 잘못된 프로토콜 v2 프레임은 M5.1과 동일하게 세션 상태에 따라 거부 또는 무시한다. 연결 실패와 프로토콜 불일치 시 로컬 변신으로 폴백하지 않는다.
- 지원하지 않는 `in_id`, `combat_mode`, 음수 revision을 받은 클라이언트는 해당 스냅샷을 무시하고 개발 경고를 남긴다. 마지막 정상 서버 상태를 유지한다.

## 범위 밖

- 인 교체, 인벤토리·제작, 인 해금 상태의 서버 이관
- 공격·언령·보스 약점·드랍·M3/M4 진행의 서버 이관
- GLB, 리깅, 애니메이션, 최종 캐릭터 아트 통합
- WASM, MessagePack, 원격 플레이어 가시성, 영속화

## 검증

- Rust와 Vitest가 같은 protocol-v2 골든 픽스쳐를 읽어 `ToggleTransformation`, `NORMAL`, `TRANSFORMED`, revision을 왕복 검증한다.
- 서버 world 테스트는 유효 토글이 상태와 revision을 바꾸고, 유효하지 않은 서버 시작 상태에서는 바꾸지 않음을 검증한다.
- 클라이언트 테스트는 join 이전·다른 플레이어·이전 tick 스냅샷이 변신 상태를 바꾸지 못하고, 새 socket의 tick 1은 적용됨을 검증한다.
- 수동으로 서버 URL을 연 뒤 `화 변신`과 `변신 해제`를 각각 눌러, 서버 응답 후 임시 오라·무기광과 HUD가 바뀌는지 확인한다. 서버를 끄면 버튼이 로컬 상태를 바꾸지 않는지 확인한다.
