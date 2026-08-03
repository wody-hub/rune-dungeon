# Design System — Rune Dungeon

## Product Context

- **What this is:** 한글의 `음`을 모아 `자형`과 `결`을 만들고 성장하는 아이소메트릭 액션 수집 RPG다.
- **Who it's for:** 접근성 있는 수동 전투와 장기 수집·성장을 함께 원하는 웹·모바일 RPG 플레이어다.
- **Space/industry:** 하이브리드 액션 수집 RPG, 다크 판타지, 한글 조합 기반 성장 게임.
- **Project type:** Svelte 5와 Threlte로 제작하는 고정 아이소메트릭 3D 게임.

## Memorable Thing

> 먹빛 세계는 빛을 죽이는 배경이고, 결의 발광은 살아 있음을 증명하는 주인공이다.

## Aesthetic Direction

- **Direction:** 먹빛 결정(Inkbound Crystal)
- **Decoration level:** intentional
- **Mood:** 차가운 미래 아포칼립스의 금속·결정 세계에 한지와 먹의 흔적이 남아 있다. 세계는 어둡고 절제되어 있지만 `음`, 무기, 결정, 각인, 변신은 선명하게 살아 움직인다.
- **Material roles:** 금속과 결정은 세계와 캐릭터의 물성, 한지와 먹은 HUD 테두리와 각인·변신 효과의 질감이다.
- **Glow principle:** 발광은 포기하지 않는다. 평상시에는 약하게 맥동하고 공격·획득·각인·변신처럼 의미 있는 순간에 강해진다.

## Typography

- **Display/Hero:** Gowun Batang 700 — 결 이름, 지역명, 큰 제목에만 사용해 한지와 각인의 인상을 준다.
- **Body:** SUIT Variable 400–600 — 작은 크기의 한글 HUD와 본문 가독성을 담당한다.
- **UI/Labels:** SUIT Variable 500–700 — 행동명과 상태는 간결하고 단단하게 표현한다.
- **Data/Tables:** IBM Plex Mono 500–600 — HP, 피해량, 수량 등 변하는 숫자의 폭을 고정한다.
- **Code:** IBM Plex Mono.
- **Loading:** 웹 POC에서는 CDN을 사용하되, 배포 안정화 시 라이선스를 확인하고 폰트 파일을 자체 호스팅한다.
- **Scale:** 11px label, 13px body, 15px emphasized UI, 18px panel title, 24px section title, 36px display.

## Color

- **Approach:** restrained base with state-driven expressive glow
- **Ink 950:** `#0D1418` — 게임 배경과 가장 깊은 그림자.
- **Metal Surface:** `#182328` — HUD와 금속 표면.
- **Paper Text:** `#DDD4BD` — 주요 텍스트와 한지 대비.
- **Muted Text:** `#9F9A89` — 보조 정보.
- **Crystal Glow:** `#68D5D0` — 기본 결, 음, 상호작용 가능 상태.
- **Seal Vermilion:** `#E05A42` — 각인과 선택 대상 표시.
- **Fire Gyeol:** `#FFAD42` — `결: 화`와 화속성 발광.
- **Semantic:** success `#74C995`, warning `#FFAD42`, error `#CF505C`, info `#72AEE8`.
- **Dark mode:** 기본 화면 자체가 다크 모드다. 넓은 면에 고채도 색을 사용하지 않고 발광 요소의 채도를 집중한다.

## Spacing

- **Base unit:** 4px.
- **Density:** compact during combat, comfortable in crafting and inventory.
- **Scale:** 2xs(2), xs(4), sm(8), md(16), lg(24), xl(32), 2xl(48), 3xl(64).

## Layout

- **Approach:** grid-disciplined HUD with cinematic effects allowed to break the grid.
- **Combat HUD:** 플레이어 핵심 정보는 좌상단, 대상 정보는 상단 중앙, 획득 정보는 우하단, 현재 핵심 진행은 하단 중앙에 둔다.
- **Information priority:** 생존 정보 → 전투 대상 → 현재 결 → 최근 획득 → 골드와 누적 재료 순서다.
- **Debug separation:** 상태 머신과 자동공격 상태 같은 개발 정보는 기본 HUD에서 제거하고 별도 디버그 표시로 분리한다.
- **Border radius:** sm 2px, md 4px, lg 6px, full 9999px. 한지·금속 패널은 각진 인상을 유지한다.

## Motion and Glow

- **Approach:** intentional.
- **Easing:** enter ease-out, exit ease-in, movement ease-in-out.
- **Duration:** micro 80–120ms, short 160–240ms, medium 280–420ms, transformation 600–900ms.
- **Idle glow:** 무기·결정·음은 2.4초 주기로 약하게 호흡한다.
- **Combat:** 공격 궤적은 짧게 빛나고 즉시 사라져 대상과 HP를 가리지 않는다.
- **Acquisition:** 획득한 음은 글자 형태를 유지한 채 플레이어 또는 HUD 쪽으로 이동한다.
- **Inscription:** 붉은 인장이 찍힌 후 먹선이 퍼지고, 결과 결정이 안쪽에서 점화된다.
- **Transformation:** 먹선이 몸을 감싼 다음 장착한 결의 속성광이 실루엣과 무기를 다시 그린다.
- **Accessibility:** 발광과 색만으로 상태를 구분하지 않는다. 실루엣, 테두리, 아이콘 또는 텍스트를 함께 사용한다.

## Character and Asset Boundaries

- **Player direction:** 날렵한 SD~세미디포르메, 먹빛 금속 몸체, 결정 이음새, 무기와 현재 결이 읽히는 실루엣.
- **Ink Slime direction:** 먹방울 몸체와 내부 결정핵. 피격·공격·사망은 고어 대신 먹의 변형과 결정광으로 표현한다.
- **M3 temporary assets:** 기본 도형과 저폴리 메시를 허용하되 실루엣, 색 역할, 발광 위치는 본 문서를 따른다.
- **Not yet designed:** 얼굴, 정확한 체형, 의상, 갑주 조형, 무기 조형, 최종 몬스터 조형, 변신 전후 최종 캐릭터 외형.
- **Guardrail:** 미리보기의 막대형 캐릭터는 레이아웃과 발광 검증용이며 최종 캐릭터 디자인으로 간주하지 않는다.

## Safe Choices and Creative Risks

### Safe choices

- 전투 HUD는 익숙한 화면 위치와 HP 색상 관습을 따른다.
- 어두운 배경에서도 플레이어와 대상의 실루엣을 우선한다.
- 발광은 상호작용과 성장 상태에 집중해 화면 피로를 줄인다.

### Creative risks

- 일반적인 유리 패널 대신 얇은 한지 결 및 먹 테두리를 사용한다.
- 발광색을 장식이 아니라 시스템 상태 언어로만 사용한다.
- 서정적인 제목 서체와 산업적인 UI·숫자 서체를 함께 사용해 과거와 미래를 대비한다.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-08-03 | `먹빛 결정` 하이브리드 방향 승인 | 기존 미래 아포칼립스의 금속·결정·발광을 유지하면서 한글 조합의 고유 인상을 먹·한지로 강화한다. |
| 2026-08-03 | `맥동하는 결` 발광 원칙 승인 | 발광을 상시 약하게 유지하고 핵심 행동 순간에 강화해 성장 체감과 가독성을 함께 확보한다. |
| 2026-08-03 | 캐릭터 최종 조형을 별도 단계로 분리 | 현재는 M3 기능 검증에 필요한 임시 에셋 기준만 고정하고 조형을 성급히 확정하지 않는다. |
