# Scratchpad

임시 검토, 정책 결정, 상세 설계 초안, 보류안, 재정의 메모를 두는 작업 공간.

## 디렉토리 구조

### `policies/`
- 제품 방향, BM 원칙, 네이밍, MVP 범위 같은 상위 결정 문서
- 설계에 들어가기 전에 먼저 합의해야 하는 내용

### `design-drafts/`
- 정책서를 바탕으로 작성하는 상세 설계 초안
- 예: 보상 분배 설계, 자동/수동 루프 설계, 인벤토리 구조 설계

## 권장 사용 규칙
- 확정된 정책은 `policies/`에 둔다.
- 정책을 바탕으로 파생된 상세 설계 초안은 `design-drafts/`에 둔다.
- 최종 확정된 설계는 `plan/`으로 이동하거나 재작성한다.
- 파일명은 `YYYY-MM-DD_주제.md` 형태를 우선 사용한다.
- 문서 상단에 상태를 적는다. 예: `Status: draft`, `Status: review`, `Status: merged`, `Status: discarded`

## 현재 작업 흐름
1. `policies/`에서 제품 원칙과 금지선 확정
2. `design-drafts/`에서 시스템별 상세 설계 작성
3. 검토 후 `plan/`에 확정본 반영
