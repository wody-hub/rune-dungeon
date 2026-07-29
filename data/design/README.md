# Design Data

이 디렉터리는 `plan/` 문서에서 구현 후보 데이터를 뽑아 둔 정규 JSON 보관소다.

## 파일

| 파일 | 기준 문서 | 용도 |
| :--- | :--- | :--- |
| `gyeol-balance.json` | `plan/09_Data_Sheet_Runes.md` | 자형, 결: 글자, 진언결, 언령결, 발동률, 무기군 발동 기준, 보호/촉매 재료 |
| `client/src/game/data/crafting-recipes.json` | `plan/03_Item_and_Equipment.md` | 서버가 판정하는 첫 제작 레시피와 실패 처리 |

## 규칙

- `plan/` 문서가 기획 원본이다.
- `data/design/*.json`은 구현 전환을 위한 정규화 데이터다.
- `data/design/*.json`에는 후보 데이터, 후반 데이터, 수치 미정 항목이 남을 수 있다.
- 실제 게임 코드가 읽는 확정 데이터는 `client/src/game/data/*.json`에 둔다.
- 확률은 `0.03`, `0.2` 같은 소수로 저장한다.
- UI 표기는 클라이언트에서 `%` 문자열로 변환한다.
- 런타임 드랍은 `entries`로 저장하며, 각 항목은 확률 `(0, 1]`, 정수 수량 범위, 보장 여부를 명시한다. 플레이어에게 보이는 수집 재화는 `음`이며, `fragments`는 필요할 때만 내부 호환 wire 필드로 남긴다.
- 런타임 제작 레시피는 성공률과 실패 시 입력 소모 여부 및 선택적 실패 출력까지 명시하며, 결과는 서버가 확정한다.

## 런타임 데이터와의 차이

| 구분 | 위치 | 허용 범위 |
| :--- | :--- | :--- |
| 기획 정규화 데이터 | `data/design/*.json` | 후보/후반 콘텐츠, 설명문, 수치 미정 항목 |
| 런타임 데이터 | `client/src/game/data/*.json` | 첫 수직 슬라이스에서 바로 읽을 확정값만 |

런타임 데이터에는 `null` 수치, 타입에 없는 enum, 참조되지 않는 장착 ID를 넣지 않는다.
현재 런타임 데이터 검증은 `node scripts/validate-runtime-data.mjs`로 수행한다.
