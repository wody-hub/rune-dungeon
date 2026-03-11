Original prompt: 자 여기는 게임 개발 공간이고 plan 디렉토리에는 우리가 개발할 게임에 대한 기획서를 작성중이야. 전체 읽고 학습해줘

# Progress

Status: active
Last updated: 2026-03-11

## 현재까지 한 일
- `plan/` 내 기획 문서를 전반적으로 읽고 핵심 구조와 모순점을 분석함.
- 임시 검토 공간으로 `scratchpad/`를 생성함.
- `scratchpad/`를 `policies/`와 `design-drafts/`로 분리함.
- 현재는 `정책서 -> 상세 설계 초안 -> plan 반영` 순서로 작업 구조를 정리함.

## 현재 확정된 정책

### 제품 방향
- 방향: `하이브리드 액션 수집 RPG`
- 메인 플레이 축: `자동/방치`
- 보조 축: `수동 조작 던전`
- 단, 수동 조작 던전은 보조 모드라도 메인급 완성도와 중요도를 유지

### 한글 시스템
- 1차 산출물은 `규칙 기반 조합`으로 만든 `글자 룬`
- 상위 산출물은 `각인`으로 완성하는 `진언 룬`, `언령 룬`
- `조합`은 글자 생성
- `각인`은 상위 룬 승격
- `의미 부여`는 시스템 명칭으로 사용하지 않음

### BM 및 성장 철학
- `노골적 P2W 지양`
- `전투력 직판 없음`
- `30일 월간 상품` 형태의 매우 약한 진행 보정만 허용
- 현재 허용 수치 초안:
  - `드랍률 +5%`
  - `조합 성공률 +3%`

### 자동/수동 보상 철학
- 자동/방치: 기본 재화와 일반 파편의 장기 누적
- 수동 던전: 상위 파편, 각인 촉매, 완성 룬 직드랍을 통한 제작 가속
- 진언/언령/승급 재료도 결국 파편 기반 제작으로 통일

## 생성된 주요 문서

### 정책 문서
- `scratchpad/policies/2026-03-11_direction-options.md`
- `scratchpad/policies/2026-03-11_product-direction-conflicts.md`
- `scratchpad/policies/2026-03-11_mvp-scope-options.md`
- `scratchpad/policies/2026-03-11_plan-doc-priority.md`
- `scratchpad/policies/2026-03-11_naming-system.md`
- `scratchpad/policies/2026-03-11_bm-and-growth-principles.md`

### 상세 설계 초안
- `scratchpad/design-drafts/2026-03-11_design-sequence.md`
- `scratchpad/design-drafts/2026-03-11_auto-vs-manual-reward-design.md`

## 다음으로 할 일
- `진언/언령 등급별 제작 성공률 표` 초안 작성
- `각인 촉매 종류와 획득처` 설계
- `룬 파편 희귀도 표` 설계
- 이후 `plan/02`, `plan/12`, `plan/15` 재작성 초안 검토

## 메모
- 현재 `scratchpad/policies/`는 상위 정책 문서 저장소로 사용 중
- 현재 `scratchpad/design-drafts/`는 정책 기반 상세 설계 초안 저장소로 사용 중
- 확정된 설계는 나중에 `plan/`에 반영 예정
