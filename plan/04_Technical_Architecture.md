# [기획서] 04. 기술적 설계 및 데이터 구조 (Technical Schema)

## 1. 데이터 모델 정의

### 1.1. 장비

```typescript
interface EquipmentItem {
  id: string;
  name: string;
  slot: "WEAPON" | "HELM" | "ARMOR" | "BOOTS" | "GLOVE" | "ACCESSORY";
  tier: number;
  baseStats: {
    damage?: number;
    defense?: number;
    moveSpeed?: number;
  };
  mantraSlots: number;
  incantationSlots?: number;
  equippedMantras: string[];
  equippedIncantations: string[];
  combatModifiers?: {
    incantationProcChance?: number;
    incantationDamage?: number;
  };
}
```

### 1.2. 자형

```typescript
interface JahyeongItem {
  id: string;
  name: string;
  initial: string;
  medial: string;
  final?: string;
  stats: { type: string; value: number }[];
  canInscribe: boolean;
}
```

### 1.3. 결

```typescript
interface GyeolItem {
  id: string;
  name: string;
  kind: "LETTER" | "MANTRA" | "INCANTATION";
  tierName: "씨앗" | "움결" | "무늬" | "물결" | "울림" | "숨결" | "빛살" | "여울" | "온결";
  components: string[];
  stats?: { type: string; value: number }[];
  effectId?: string;
  procMeta?: {
    baseProcChance?: number;
    targetRule?: "SINGLE_TARGET";
    maxProcChance?: number;
    cheonjiinBonus?: number;
    allowMultiProcPerHit?: boolean;
    damageApplication?: "APPLY_ALL_PROCS";
    visualStacking?: "STACK_ALL_PROCS";
    guaranteedProcOnWeakness?: boolean;
    guaranteedProcWeaknessTag?: string;
  };
}
```

### 1.4. 무기와 전투 프로필

```typescript
interface WeaponItem {
  id: string;
  weaponClass: "GREATSWORD" | "BOW" | "STAFF";
  attackSpeed: number;
  minDamage: number;
  maxDamage: number;
  damageMultiplier: number;
  procRateBonus?: number;
  defaultIncantationSlots?: number;
  damageReductionBonus?: number;
  staggerResistanceBonus?: number;
  critChanceBonus?: number;
  critDamageBonus?: number;
}

interface CombatProfile {
  baseCritChance: number;
  baseCritMultiplier: number;
  attackBonusFromStr: number;
  defenseFromStr: number;
  combatFeedbackPriority?: [
    "ATTACK_MOTION",
    "HIT_REACTION",
    "DAMAGE_TEXT",
    "CRITICAL_EMPHASIS",
    "INCANTATION_PROC"
  ];
  bossStateModifiers?: {
    incomingDamageMultiplier?: number;
    weaknessExposeDurationMs?: number;
    groggyDurationMs?: number;
    groggyDefenseOverride?: number;
    guaranteedIncantationTagOnWeakness?: string;
  };
}
```

### 1.5. 돌과 먹

```typescript
interface CatalystItem {
  id: string;
  label: string;
  catalystType: "MANTRA" | "INCANTATION" | "ADVANCED";
  tierName?: string;
  element?: "FIRE" | "WATER" | "EARTH" | "WIND" | "LIGHT" | "DARK";
}

interface SupportItem {
  id: string;
  label: string;
  supportType: "PROTECT" | "BUFFER" | "BOOST";
  value?: number;
}
```

### 1.6. 캐릭터 비주얼 상태

```typescript
type CombatMode = "NORMAL" | "TRANSFORMED";

interface CharacterVisualState {
  baseFormTierName: "씨앗";
  inTierName: "씨앗" | "움결" | "무늬" | "물결" | "울림" | "숨결" | "빛살" | "여울" | "온결";
  inElement?: "FIRE" | "WATER" | "EARTH" | "WIND" | "LIGHT" | "DARK";
  combatMode: CombatMode;
  orientationRadians: number;
  modelKey: string;
  rigKey: string;
  animationClipKey: "idle" | "walk" | "attack" | "hit" | "death";
  weaponModelKey?: string;
  materialVariantKey?: string;
  auraEffectKey?: string;
}
```

- `baseFormTierName`은 진행도와 무관하게 항상 `씨앗`으로 고정한다.
- `inTierName`은 현재 장착한 `인`의 정본 `tierName`에서 시각 상태를 만들 때 파생한다. `인.visual` 안에 같은 값을 중복 저장하지 않는다.
- 렌더러는 `combatMode`로 표시 폼을 파생한다: `NORMAL -> baseFormTierName(씨앗)`, `TRANSFORMED -> inTierName`.
- `modelKey`, `materialVariantKey`, `auraEffectKey`는 위 표시 폼을 기준으로 선택하며, `NORMAL` 상태에 상위 티어 모델이나 오라 키를 남기지 않는다.

```text
장착한 인의 tierName ──> inTierName ──┐
                                      ├─ combatMode ─> 표시 폼
고정값 "씨앗" ────────> baseFormTierName ─┘              ├─ NORMAL: 씨앗 기본폼
                                                         └─ TRANSFORMED: 현재 인 티어 전투폼
```

## 2. 상태 트리 예시

```json
{
  "player": {
    "level": 12,
    "stats": {
      "str": 12,
      "dex": 10,
      "int": 10,
      "vit": 12
    },
    "inventory": ["jahyeong_1", "gyeol_1", "stone_1", "ink_1"],
    "equipped": {
      "weapon": "weapon_1",
      "armor": "armor_1"
    },
    "visual": {
      "baseFormTierName": "씨앗",
      "inTierName": "움결",
      "inElement": "FIRE",
      "combatMode": "NORMAL",
      "orientationRadians": 0.7853981633974483,
      "modelKey": "player_base_seed",
      "rigKey": "humanoid_mvp",
      "animationClipKey": "idle",
      "weaponModelKey": "weapon_greatsword_bronze",
      "materialVariantKey": "fire_normal"
    }
  },
  "field": {
    "idleRewards": {
      "gold": 100,
      "fragments": {
        "ㄱ": 3,
        "ㅏ": 2
      }
    }
  },
  "dungeon": {
    "currentFloor": 1,
    "enemies": [],
    "droppedItems": []
  }
}
```

## 3. 한글 조합 라이브러리
- **Library:** `hangul-js`
- `Hangul.assemble(['ㄱ', 'ㅏ', 'ㅇ']) -> '강'`
- `Hangul.disassemble('강') -> ['ㄱ', 'ㅏ', 'ㅇ']`

## 4. 제작 파이프라인

### 4.1. 자형 조합
- 플레이어에게는 재화형 `음`으로 표시하고 `자형`을 생성한다. 프로토콜의 `fragments` 필드는 안정적인 내부 wire 필드로 유지한다.
- `자형` 조합은 `100% 확정`이다.

### 4.2. 결: 글자 각인
- `자형`에 의미를 새겨 `결: 글자`를 생성한다.
- `결: 글자`부터는 `돌` 촉매와 골드 비용이 붙는다.
- 확률, `먹`, 희귀도는 첫 수직 슬라이스 이후의 상위 결부터 붙는다. 첫 수직 슬라이스의 제작은 실패하지 않는다.

### 4.3. 진언결/언령결 각인
- `자형` 또는 `결: 글자`와 `돌`, 선택적 `먹`을 사용해 진언결/언령결을 생성한다.
- 진언결은 패시브 빌드 축이고, 언령결은 기본 공격 적중 시 확률 발동하는 전투 연출/피해 축이다.

### 4.4. 천지인 각성
- 후반 `천지인` 재료는 낮은 티어 언령결을 강화한다.
- 새 언령결 제작 재료가 아니라, 기존 언령결의 보존 가치를 살리는 강화 축이다.

### 4.5. 서버 확정 드랍·제작 계약
- `DropEntry`는 `GOLD | ITEM`의 대상 ID, `probability`, 정수 `quantity.min/max`, `guaranteed`를 가진다. 서버는 사망 1회당 각 항목을 독립 판정하고, `guaranteed: true` 항목은 `probability: 1`이어야 한다.
- `음`은 독립 항목이 아니라 `eumRollGroup`의 `draws.min/max` 횟수만큼 가중치 풀에서 뽑는다. 현재 모든 그룹은 `allowDuplicateSymbols: false`이며, 각 선택 뒤에는 뽑힌 기호를 남은 가중치 풀에서 제거하므로 한 보상에서 같은 음 기호가 중복되지 않는다. 먹물 슬라임은 `1~2회`, 오타 요정은 `2~4회`, 몽당연필 기사단장은 `3~5회` 뽑는다.
- `CraftingRecipe`는 입력, `goldCost`, 촉매 ID, 허용 보조 재료 ID, `successRate`, 성공 결과 ID, 실패 시 `consumeInputs` 및 선택적 `outputId`를 명시한다. 첫 수직 슬라이스의 모든 레시피는 `successRate: 1`이며, 클라이언트는 제작 의도만 전송하고 서버가 소모·지급을 모두 확정한다.
- 첫 레시피는 `음 · ㅎ ×1 + 음 · ㅘ ×1 -> 자형: 화`(성공률 `1`, 골드 `0`, 촉매 없음), `자형: 화 ×1 + 돌: 새김 ×1 + 골드 20 -> 결: 화`(성공률 `1`)이다. 첫 제작 루프는 `음`, `돌`, `골드` 세 재료를 모두 사용한다.
- `WorldContent`는 맵의 `id`, `kind`, `maxPlayers`, `spawnPointId`와 입·출구 포털 링크를 서버 시작 전에 검증한다. `아르카디아`만 `공유 마을 허브`이며, `음` 파밍을 포함한 모든 게임플레이 구역은 `포털`로 연결되는 최대 4인 `협동 인스턴스`다.

## 5. 구현 기술 스택
- **Client:** `Svelte + TypeScript + Vite + Three.js/Threlte`
- **Server:** `Rust + WebSocket`
- **Shared Rules:** 프로토콜 메시지와 결정적 게임 규칙 타입은 공유 Rust crate로 정의하며, 클라이언트 표시/예측에 필요한 범위만 브라우저에서 사용한다.
- **Data Format:** 런타임 콘텐츠는 서버 시작 전에 검증하는 JSON이다.
- **Hangul Library:** `hangul-js`
- **Persistence:** 서버가 영속 상태를 소유하며, 개발용 저장소는 단순 파일 또는 SQLite로 시작할 수 있다.
- **Primary Target:** `웹 브라우저`
- **확장 방향:** 이후 `PWA`, 모바일 래핑, 데스크탑 패키징 확장 가능

첫 구현은 온라인 고정 아이소메트릭 3D 수직 슬라이스다. 게스트 닉네임으로 접속하면 서버가 플레이어 ID와 세션 정체성을 발급한다. 서버는 플레이어 위치, 전투, 몬스터 상태, 드랍, 인벤토리, 제작 결과, 변신과 진행을 권위적으로 확정한다. 클라이언트는 이동 방향, 기본 공격, 습득, 제작, 변신 토글 같은 의도만 보낸다.

현재 `client/src/game/data`는 수직 슬라이스 계약을 검증하는 전환용 fixture다. 서버 구현 단계에서는 `shared/content`를 서버 정본으로 두고, 검증된 콘텐츠에서 클라이언트 표시용 사본을 생성한다.

### 5.2. 서버 권위 이행 순서

| 단계 | 서버가 확정하는 상태 | 클라이언트 역할 | MVP 완료와의 관계 |
| :--- | :--- | :--- | :--- |
| `M5.1` | 게스트 ID, 위치, 이동 목표 | 서버 스냅샷 위치 보간 | 연결·이동 골격 검증 단계이며 변신 권위를 충족하지 않는다 |
| `M5.2` | 장착 `인` ID와 `combatMode` 변신 on/off | 검증된 콘텐츠에서 `inTierName`·속성·임시 오라를 파생해 표시 | 변신을 클라이언트 전용 상태로 남기지 않는 필수 단계 |
| `M5.3+` | 전투, 드랍, 인벤토리, 제작, 진행 | 서버 확정 상태를 표시하고 일시적 입력 예측만 수행 | 수직 슬라이스의 나머지 서버 권위 루프 |

- `M5.1`의 `?server=` 경로는 이동만 검증하는 기술 체크포인트다. 이 단계만 통과한 결과를 서버 권위 변신 MVP로 판정하지 않는다.
- `M5.2`는 서버가 `inId`와 `combatMode`를 검증·스냅샷으로 확정하고, 클라이언트는 이 두 값과 검증된 콘텐츠만으로 표시 폼을 파생한다. 클라이언트가 독자적으로 변신 상태를 확정하거나 되돌리는 폴백을 만들지 않는다.
- 실제 GLB 통합 전 M5.2는 현재 임시 메시의 오라·무기광만 전환한다. 게이트 C에서는 동일한 서버 상태를 `CharacterVisualState`와 GLB 선택 메시·VFX로 연결한다.

클라이언트는 즉시 되돌릴 수 있는 바라보기·공격 선딜·로컬 이펙트만 예측할 수 있다. 어떤 요청도 HP, 인벤토리 수량, 드랍 결과, 제작 결과, 최종 위치를 직접 설정할 수 없다. `localStorage`는 그래픽·입력·UI 환경설정만 저장하며 게임 진행의 진실로 사용하지 않는다.

## 5.1. 거리·속도 단위 기준
- 기획 문서의 `px` 수치(사거리, 판정 폭, 이동 속도 등)는 화면 픽셀이 아니라 아이소메트릭 기준의 `논리 거리 단위`다.
- 3D 구현에서는 `1 논리 px = 고정 스케일 계수 × 1 월드 유닛`으로 환산하며, 계수는 구현 단계에서 한 번 정해 전 수치에 동일하게 적용한다.
- 따라서 문서의 상대 비율(예: 대검 사거리 `56` vs 활 사거리 `280`)이 밸런스 기준이고, 절대 단위는 환산 계수로 흡수한다.

## 6. 렌더링 방향
- **Core Framework:** `Three.js/Threlte`
- **View Style:** 제한된 줌을 가진 고정 아이소메트릭 3D 카메라; 자유 카메라는 제공하지 않는다.
- **Character Rendering:** 저폴리 3D 모델, 리그 애니메이션, 무기 메시와 속성 오라/VFX 조합
- **Layer Composition:** `기본 메시와 고정 의상·경갑 + 무기 메시 + 제한적 변신 갑주 메시 + 속성 오라`
- **Effects:** emissive 머티리얼, 절제된 블룸, 파티클과 색상 오버레이로 결 발광과 변신 위상을 표현한다.

## 7. 캐릭터 구현 원칙
- 플레이어와 주요 몬스터는 고정 카메라에서 식별되는 3D 실루엣 기준으로 제작한다.
- 기본 애니메이션 분류는 `idle`, `walk`, `attack`, `hit`, `death`를 사용한다.
- 첫 수직 슬라이스는 `idle`, `walk`, `attack`까지만 우선 구현한다.
- 전투 모드는 현재 장착한 `인: [티어] [속성]`에 맞는 전투 메시 또는 오라로 구분한다.
- 첫 MVP는 `기본 메시 + 무기 메시 + 오라`만으로도 충분하다.

### 7.1. MVP GLB 에셋 구성
- 런타임 형식은 glTF 2.0 바이너리인 `.glb`로 고정한다.
- 시그니처 주인공 GLB `1개`에 기본 몸체, 공통 휴머노이드 리그, 기본형·화염형 선택 메시, `idle`, `walk`, `attack` 애니메이션을 포함한다.
- 대검은 손 소켓에 탈착할 수 있는 별도 GLB `1개`로 둔다. 기본형과 화염형은 동일 대검 메시를 공유하고 머티리얼 변형·발광·VFX로 상태를 구분한다.
- MVP에서 애니메이션 팩을 별도 GLB로 분리하거나 런타임 리타게팅 시스템을 만들지 않는다. 캐릭터·스킨 종류가 실제로 늘어 공통화 이점이 생길 때 분리한다.
- Blender 원본, 입력 이미지, 고해상도 텍스처와 생성 도구 출력은 제작 원본으로 보관하고 웹 클라이언트 번들에 넣지 않는다. 클라이언트에는 최적화된 런타임 GLB와 필요한 텍스처만 둔다.

### 7.2. 좌표·스케일·노드 계약
- `1 Blender unit = 1 meter = 1 Three.js world unit`을 사용한다.
- GLB는 오른손 좌표계, `+Y` 위쪽, 캐릭터 정면 `+Z`를 사용한다. 루트 노드의 회전은 `0`, 스케일은 `1`로 적용한 상태에서 내보낸다.
- 캐릭터 원점은 두 발 사이 지면 중앙 `(0, 0, 0)`으로 둔다. 대검 원점은 주 손이 잡는 손잡이 중심이며, 로컬 `+Y`가 손잡이에서 칼끝 방향을 가리킨다.
- 게이트 A에서 승인한 실제 캐릭터 높이를 `PLAYER_VISUAL_HEIGHT_M` 단일 상수로 기록하고, Blender·Three.js에서 별도 임의 스케일 보정을 중복 적용하지 않는다.
- 최상위 노드는 `PlayerRoot`, 스켈레톤 루트는 `Armature`, 스킨 기준 루트 본은 `Hips`로 표준화한다.
- 변형 가능한 메시와 상태 파츠에는 역할이 드러나는 안정적인 이름을 사용한다. 캐릭터 GLB의 MVP 필수 노드는 `Body`, `Crystal`, `ArmorFire`이며, 별도 대검 GLB의 최상위 노드는 `Greatsword`다.

### 7.3. 리그·무기 소켓 계약
- Mixamo 접두어와 구분자는 Blender 보정 단계에서 제거해 본 이름을 `Hips`, `Spine`, `Chest`, `Neck`, `Head`, `LeftHand`, `RightHand`, `LeftFoot`, `RightFoot` 형식으로 표준화한다.
- 기본형과 화염형은 동일한 본 계층, inverse bind matrix, 스킨 가중치를 공유한다. 변신 때문에 별도 스켈레톤을 만들지 않는다.
- 변형 본은 MVP 기준 `75개 이하`로 유지하고 한 정점에 영향을 주는 본은 최대 `4개`로 제한한다.
- 대검 부착 기준은 `RightHand` 아래의 비변형 소켓 `Weapon_R`이다. 대검은 `Weapon_R`에 한 번만 부착하고, 왼손은 애니메이션 포즈 또는 후속 IK로 손잡이를 맞춘다.
- A 포즈, 기본형, 화염형, 모든 애니메이션에서 본 이름과 계층이 바뀌지 않아야 한다.

### 7.4. 애니메이션 계약
- GLB의 MVP 클립 이름은 소문자 `idle`, `walk`, `attack`으로 고정한다.
- `idle`과 `walk`는 반복 재생, `attack`은 1회 재생 후 `idle` 또는 이동 상태로 복귀한다.
- 모든 클립에서 수평 루트 모션과 누적 회전을 제거한다. 실제 이동과 방향은 서버 권위 위치·방향 상태가 담당한다.
- `attack`은 총 `1.25초`를 기준으로 하고 첫 타격 포즈가 서버 판정 시점 `320ms`와 시각적으로 일치해야 한다. 판정 시점은 GLB 이벤트가 아니라 검증된 게임 데이터가 정본이다.
- 루프 경계에서 발 위치가 튀지 않고 `walk` 재생 중 눈에 띄는 발 미끄러짐이 없어야 한다.
- 클립이 없거나 이름이 다르면 임의의 첫 클립으로 대체하지 않는다. 해당 상태는 `idle` 정지 포즈로 폴백하고 개발 로그에 정확한 파일명과 누락 클립명을 남긴다.

### 7.5. 머티리얼·성능 예산
- Three.js의 표준 PBR 경로에서 읽히는 `baseColor`, `normal`(선택), 결합 `occlusion/roughness/metallic`, `emissive` 텍스처를 사용한다. Blender 전용 셰이더 노드는 런타임 계약에 포함하지 않는다.
- MVP 텍스처는 맵당 최대 `1024 x 1024`로 제한한다. 투명 재질은 머리카락·천 가장자리처럼 필요한 곳에만 사용하고 alpha blend보다 alpha mask를 우선한다.
- 캐릭터 GLB는 기본형·화염형 파츠를 합쳐 `20,000 triangles 이하`, 변형 본 `75개 이하`, 머티리얼 `6개 이하`, 런타임 파일 `8MB 이하`를 1차 예산으로 둔다.
- 대검 GLB는 `5,000 triangles 이하`, 머티리얼 `2개 이하`, 런타임 파일 `2MB 이하`를 1차 예산으로 둔다.
- 위 수치는 절대 품질 기준이 아니라 웹 수직 슬라이스의 초기 예산이다. 고정 아이소메트릭 카메라에서 차이가 보이지 않는 세부 형상과 2K~4K 텍스처는 제거한다.

### 7.6. 로딩·캐시·실패 처리
- `modelKey`, `rigKey`, `weaponModelKey`는 서버가 파일 경로를 직접 보내는 값이 아니라 클라이언트의 검증된 에셋 매니페스트 키다.
- 클라이언트는 각 GLB를 URL당 한 번만 로드·파싱해 캐시하고 플레이어별로 스킨드 메시 인스턴스를 복제한다. 상태별 머티리얼 변경이 필요한 경우에만 해당 머티리얼을 복제한다.
- 캐릭터 또는 대검 로드가 실패해도 월드 상태와 네트워크 세션을 중단하지 않는다. 캐릭터는 기존 플레이스홀더, 대검은 단순 저폴리 대검으로 대체하고 개발 로그에 매니페스트 키와 원인을 남긴다.
- 기본형·화염형 전환은 새 GLB 네트워크 요청 없이 이미 로드한 선택 메시·머티리얼·VFX 상태를 전환한다.

### 7.7. 에셋 인수 검증
- Khronos glTF Validator에서 오류가 없어야 하며, 경고는 원인과 수용 이유를 `docs/assets/characters.md`에 기록한다.
- 자동 검사로 파일 존재, GLB 파싱, 필수 노드, 본 계층, 클립 이름, 클립 수, 삼각형·본·머티리얼 수, 파일 크기 예산을 확인한다.
- 실제 고정 아이소메트릭 카메라의 최소·기본·최대 줌에서 얼굴보다 실루엣·대검·기본형/화염형 구분을 우선 승인한다.
- `idle -> walk -> attack -> idle`, 이동 중 공격, 변신 on/off, 네 플레이어 동시 표시를 검증한다.
- 팔꿈치·손목·무릎의 가중치 붕괴, 대검 손잡이 이탈, 발 미끄러짐, 의상 관통, 화염 파츠의 깊이 충돌이 없어야 한다.
- 무료 AI 3D 결과물은 위 검증을 모두 통과시킨 뒤 품질을 평가한다. 기준 미달 시 Blender 재작업 또는 재생성을 먼저 시도하고, 유료 AI 3D 전환은 별도 승인한다.

## 8. MVP 기술 범위
- 첫 수직 슬라이스는 `플레이어 1종`, `무기 1종`, `속성 1종`, `기본 변신 1종`, `필드 1`, `던전 1`, `보스 1`까지만 다룬다.
- 첫 구현의 공유 공간은 아르카디아 `공유 마을 허브`뿐이다. 새벽 들판, 흑심 채굴장, 보스방은 입장 시 생성되는 `협동 인스턴스`이며, 마을·구역 `포털`과 입장 트리거로 들어간다. 인스턴스는 파티를 강제하지 않는 공개 지속형 방으로, 목록에 공개되고 비밀번호 미설정 방은 빈자리가 있으면 누구나 합류하며 최대 4인이 자유롭게 드나든다.
- 첫 구현 목표는 그래픽 완성도만이 아니라, 이 허브-인스턴스 구조에서 서버 권위 `이동`, `공격`, `언령 확률 발동`, `피격`, `변신 on/off`, `결 파밍`, `자형 -> 결: 글자` 루프 검증이다.

## 9. 전투 리소스 정책
- 전투에 별도의 `마나` 자원은 사용하지 않는다.
- 언령결은 공격 적중 시 확률적으로 발동하는 장착형 효과다.
- `언령 발동 확률`은 기본적으로 언령결의 `baseProcChance`, 무기군의 제한적 `procRateBonus`, 진언결의 소수 특수 옵션, 후반 `천지인` 보정으로만 관리한다.
- MVP 기준 `INT`는 언령 발동 확률을 직접 올리지 않는다. `INT`는 이후 언령 피해, 속성 효과, 상태이상 계수 같은 효과 스케일링 후보로 남긴다.
- 장비 옵션 전반이 무분별하게 언령 발동 확률을 제공하는 구조는 사용하지 않는다.
- 같은 타격에서 여러 언령결이 동시에 발동할 수 있으며, 성공한 언령결은 모두 단일 대상에게 개별 피해를 적용한다.
- 전투 밸런스는 `개별 언령 기대값`보다 `초당 총 발동 기대값` 기준으로 본다.
- 기본 기대값 계산식은 `attackSpeed x effectiveProcChance x equippedIncantationCount`로 둔다.
- 기본 공격 공식은 `random(minDamage, maxDamage) + attackBonus`를 출발값으로 둔다.
- MVP 기본 치명타는 `critChance 5%`, `critMultiplier 1.5`를 사용한다.
- 1차 기준 수치는 `GREATSWORD 0.8 / +1%`, `BOW 1.6 / +0%`, `STAFF 1.1 / +3%`를 사용한다.
- MVP `GREATSWORD`는 `minDamage 12`, `maxDamage 20`, `damageMultiplier 1.45`, `defaultIncantationSlots 2`, `attackSpeed 0.8`, `procRateBonus +1%`를 기본값으로 사용한다.
- 첫 수직 슬라이스 플레이어 기준값은 `STR 12`, `DEX 10`, `INT 10`, `VIT 12`, `attackBonus +12`, `defense 12`, `maxHp 196`으로 맞춘다.

## 10. 전투 피드백 우선순위
- 전투 피드백 우선순위는 `공격 모션 -> 몬스터 피격 반응 -> 데미지 숫자 -> 치명타 강조 -> 언령 발동 표시` 순서로 둔다.
- 부드러움 목표는 대형 파티클보다 `입력 지연 없음`, `타격 시점 명확함`, `피격 반응 즉시성`에 둔다.
- 치명타는 별도 시스템이 아니라 동일 파이프라인에서 `더 큰 숫자`, `더 큰 히트 스파크`, `강한 색상 대비`로 표현한다.
- 데미지 숫자와 치명타 표시는 풀링 또는 재사용 가능한 객체 기준으로 설계해 브라우저 렌더링 비용을 낮춘다.
- 히트 이펙트와 데미지 숫자는 짧게 종료되는 연출을 기본으로 하며, 화면에 오래 누적되는 구조를 피한다.

## 11. 초기 폴더 구조 초안

### 11.1. 전체 루트 구조

```text
rune-dungeon/
  client/
  server/
  shared/
  art/
    source/
      characters/
  docs/
    assets/
```

- `client/`는 `Svelte + TypeScript + Vite + Three.js/Threlte` 게임 클라이언트를 둔다.
- `server/`는 현재 수직 슬라이스를 위한 `Rust + WebSocket` 권위 서버를 둔다.
- 현재 `plan/` 문서는 계속 루트에 유지하고, 구현 시작 후 보조 문서는 `docs/`로 분리할 수 있다.

### 11.2. 클라이언트 구조 초안

```text
client/
  public/
    models/
      characters/
      weapons/
  src/
    main.ts
    lib/
      rendering/
      world/
      network/
      state/
      ui/
      data/
      utils/
      constants/
      types/
    assets/
      materials/
      effects/
      audio/
```

- `rendering/`: Threlte 루트, 고정 카메라, 월드 메시와 시각 효과
- `public/models/`: 웹 런타임에 제공하는 최적화된 GLB 캐릭터와 무기
- `art/source/characters/`: Blender 원본, 입력 원화, 생성 도구 원본과 고해상도 텍스처. 런타임 번들에 포함하지 않는다.
- `docs/assets/`: 에셋 파일별 출처, 라이선스, 생성 도구·등급·날짜와 사용 여부 기록
- `world/`: 공유 마을 허브와 협동 인스턴스의 표시 상태, 포털 UI, 입장 트리거
- `network/`: WebSocket 연결, 의도 전송, 서버 이벤트 수신
- `state/`: 복제된 서버 상태와 즉시 되돌릴 수 있는 시각 예측
- `ui/`: HUD, 인벤토리, 장착창, 제작 UI, 보스 체력 UI
- `data/`: 서버 검증 콘텐츠의 표시용 사본과 타입
- `utils/`: 공용 계산 로직, 한글 조합 보조 함수, 수치 계산 보조
- `constants/`: 티어명, 속성명, 무기군, 공통 키값
- `types/`: 클라이언트 전용 타입 정의

### 11.3. 서버 구조 초안

```text
server/
  Cargo.toml
  src/
    main.rs
    session/
    world/
    combat/
    inventory/
    crafting/
    content/
    persistence/
shared/
  Cargo.toml
  src/
    protocol.rs
    rules.rs
```

- `session/`: 게스트 닉네임, 서버 발급 플레이어 ID, WebSocket 세션
- `world/`: 권위 위치, 허브/인스턴스 멤버십, 포털과 던전 경계
- `combat/`, `inventory/`, `crafting/`: 의도 검증과 상태 전이
- `content/`: DropTable, CraftingRecipe, WorldContent를 포함한 시작 전 데이터 검증
- `persistence/`: 서버 소유 진행 저장과 재접속 복원
- `shared/`: 프로토콜과 클라이언트/서버가 공유하는 결정적 규칙
- 구현 단계의 `shared/content`는 서버 정본 콘텐츠를 보관하고, 현재 `client/src/game/data` 전환용 fixture와 같은 표시용 JSON은 정본에서 생성한다.

### 11.4. MVP 시작 권장 범위
- 첫 구현은 클라이언트와 서버를 함께 시작한다.
- `client/src/lib/rendering`, `world`, `network`, `state`, `ui`와 `server/src/session`, `world`, `combat`, `inventory`, `crafting`이 함께 살아 있어야 수직 슬라이스를 검증할 수 있다.

## 12. MVP 데이터 JSON 샘플

### 12.1. 샘플 기준
- 아래 데이터는 실제 Lv 1 시작 세이브가 아니라, `아르카디아 수직 슬라이스`를 빠르게 검증하기 위한 `Lv 12 움결 화` 로드아웃이다.
- 실제 Lv 1 시작 상태는 `씨앗` 티어와 튜토리얼 보상 정책에 맞춰 별도 작성한다.

### 12.2. player.json

```json
{
  "id": "player_mvp_001",
  "name": "Aram Wanderer",
  "level": 12,
  "stats": {
    "str": 12,
    "dex": 10,
    "int": 10,
    "vit": 12
  },
  "combatProfile": {
    "baseCritChance": 0.05,
    "baseCritMultiplier": 1.5,
    "attackBonusFromStr": 12,
    "defenseFromStr": 12,
    "combatFeedbackPriority": [
      "ATTACK_MOTION",
      "HIT_REACTION",
      "DAMAGE_TEXT",
      "CRITICAL_EMPHASIS",
      "INCANTATION_PROC"
    ]
  },
  "hp": {
    "max": 196,
    "current": 196
  },
  "equipped": {
    "weaponId": "weapon_greatsword_mvp_001",
    "mantraIds": ["mantra_ganghwa_001", "jahyeong_gang_001"],
    "incantationIds": ["incantation_fire_light_path_001", "incantation_fire_spread_001"],
    "inId": "in_fire_001"
  },
  "inventory": {
    "gold": 100,
    "fragments": {
      "ㄱ": 3,
      "ㅏ": 2,
      "ㅇ": 1,
      "ㅎ": 1,
      "ㅘ": 1,
      "ㅂ": 1
    },
    "items": [
      "talisman_sum_gil_001",
      "talisman_gyeol_bul_001",
      "talisman_jil_sum_001",
      "talisman_gwi_ro_001"
    ]
  },
  "visual": {
    "baseFormTierName": "씨앗",
    "inTierName": "움결",
    "inElement": "FIRE",
    "combatMode": "NORMAL",
    "orientationRadians": 0.7853981633974483,
    "modelKey": "player_base_seed",
    "rigKey": "humanoid_mvp",
    "animationClipKey": "idle",
    "weaponModelKey": "weapon_greatsword_bronze",
    "materialVariantKey": "fire_normal"
  }
}
```

### 12.3. weapons.json

```json
[
  {
    "id": "weapon_greatsword_mvp_001",
    "name": "낡은 양손검",
    "weaponClass": "GREATSWORD",
    "attackSpeed": 0.8,
    "minDamage": 12,
    "maxDamage": 20,
    "damageMultiplier": 1.45,
    "procRateBonus": 0.01,
    "defaultIncantationSlots": 2,
    "damageReductionBonus": 0.08,
    "staggerResistanceBonus": 0.15
  }
]
```

### 12.4. monsters.json

```json
[
  {
    "id": "monster_ink_slime_001",
    "name": "먹물 슬라임",
    "rank": "NORMAL",
    "maxHp": 140,
    "baseDefense": 0,
    "moveSpeed": 42,
    "aggroRange": 180,
    "attackRange": 28,
    "attackMotionMs": 1400,
    "hitFrameMs": 420,
    "baseDamage": 18,
    "hitStunMs": 260,
    "staggerResistance": 0.0,
    "drops": {
      "entries": [
        { "kind": "GOLD", "probability": 1, "quantity": { "min": 5, "max": 10 }, "guaranteed": true }
      ],
      "eumRollGroup": {
        "draws": { "min": 1, "max": 2 },
        "allowDuplicateSymbols": false,
        "entries": [
          { "symbol": "ㄱ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅏ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅇ", "weight": 1, "quantity": { "min": 1, "max": 1 } }
        ]
      }
    }
  },
  {
    "id": "monster_typo_sprite_001",
    "name": "오타 요정",
    "rank": "ELITE",
    "maxHp": 320,
    "baseDefense": 10,
    "moveSpeed": 68,
    "aggroRange": 240,
    "attackRange": 220,
    "attackMotionMs": 1050,
    "hitFrameMs": 260,
    "baseDamage": 28,
    "hitStunMs": 140,
    "staggerResistance": 0.2,
    "statusEffect": {
      "type": "CONFUSION",
      "durationMs": 2000
    },
    "drops": {
      "entries": [
        { "kind": "GOLD", "probability": 1, "quantity": { "min": 12, "max": 20 }, "guaranteed": true },
        { "kind": "ITEM", "id": "stone_inscribe_mantra_001", "probability": 0.25, "quantity": { "min": 1, "max": 1 }, "guaranteed": false }
      ],
      "eumRollGroup": {
        "draws": { "min": 2, "max": 4 },
        "allowDuplicateSymbols": false,
        "entries": [
          { "symbol": "ㅎ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅘ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅂ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅜ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㄹ", "weight": 1, "quantity": { "min": 1, "max": 1 } }
        ]
      }
    }
  }
]
```

### 12.5. bosses.json

```json
[
  {
    "id": "boss_pencil_knight_commander_001",
    "name": "몽당연필 기사단장",
    "rank": "BOSS",
    "maxHp": 2200,
    "baseDefense": 60,
    "baseDamage": 42,
    "moveSpeed": 38,
    "aggroRange": 260,
    "attackRange": 44,
    "attackMotionMs": 1800,
    "hitFrameMs": 620,
    "hitStunMs": 80,
    "staggerResistance": 0.6,
    "bossStateModifiers": {
      "incomingDamageMultiplier": 0.5,
      "weaknessExposeDurationMs": 4000,
      "groggyDurationMs": 10000,
      "groggyDefenseOverride": 0,
      "guaranteedIncantationTagOnWeakness": "FIRE"
    },
    "drops": {
      "entries": [
        { "kind": "GOLD", "probability": 1, "quantity": { "min": 80, "max": 120 }, "guaranteed": true },
        { "kind": "ITEM", "id": "stone_inscribe_mantra_001", "probability": 0.5, "quantity": { "min": 1, "max": 1 }, "guaranteed": false },
        { "kind": "ITEM", "id": "letter_gyeol_hwa_001", "probability": 0.25, "quantity": { "min": 1, "max": 1 }, "guaranteed": false }
      ],
      "eumRollGroup": {
        "draws": { "min": 3, "max": 5 },
        "allowDuplicateSymbols": false,
        "entries": [
          { "symbol": "ㅎ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅘ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅂ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅜ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㄹ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㄷ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅏ", "weight": 1, "quantity": { "min": 1, "max": 1 } },
          { "symbol": "ㅇ", "weight": 1, "quantity": { "min": 1, "max": 1 } }
        ]
      }
    }
  }
]
```

### 12.6. mantras.json

```json
[
  {
    "id": "jahyeong_gang_001",
    "name": "자형: 강",
    "kind": "JAHYEONG",
    "tierName": "움결",
    "stats": [
      { "type": "CRIT_CHANCE", "value": 0.01 },
      { "type": "ATTACK_FLAT", "value": 1 }
    ]
  },
  {
    "id": "mantra_ganghwa_001",
    "name": "결: 강화",
    "kind": "MANTRA",
    "tierName": "움결",
    "stats": [
      { "type": "CRIT_CHANCE", "value": 0.03 },
      { "type": "CRIT_DAMAGE", "value": 0.1 }
    ]
  },
  {
    "id": "letter_gyeol_hwa_001",
    "name": "결: 화",
    "kind": "LETTER",
    "tierName": "씨앗",
    "components": ["jahyeong_hwa_001"],
    "successRate": 1,
    "stats": [
      { "type": "ELEMENT_ATTACK_PERCENT", "value": 0.05 },
      { "type": "DAMAGE_PERCENT", "value": 0.02 }
    ],
    "element": "FIRE"
  }
]
```

### 12.7. incantations.json

```json
[
  {
    "id": "incantation_fire_light_path_001",
    "name": "결: 앞을 밝혀라",
    "kind": "INCANTATION",
    "tierName": "움결",
    "components": ["앞", "을", "밝", "혀", "라"],
    "effectId": "fire_line_small_001",
    "element": "FIRE",
    "procMeta": {
      "baseProcChance": 0.03,
      "targetRule": "SINGLE_TARGET",
      "maxProcChance": 0.2,
      "hasInternalCooldown": false,
      "allowMultiProcPerHit": true,
      "damageApplication": "APPLY_ALL_PROCS",
      "visualStacking": "STACK_ALL_PROCS"
    }
  },
  {
    "id": "incantation_fire_spread_001",
    "name": "결: 불길아 번져라",
    "kind": "INCANTATION",
    "tierName": "움결",
    "components": ["불", "길", "아", "번", "져", "라"],
    "effectId": "fire_hit_small_001",
    "element": "FIRE",
    "procMeta": {
      "baseProcChance": 0.03,
      "targetRule": "SINGLE_TARGET",
      "maxProcChance": 0.2,
      "hasInternalCooldown": false,
      "allowMultiProcPerHit": true,
      "damageApplication": "APPLY_ALL_PROCS",
      "visualStacking": "STACK_ALL_PROCS"
    }
  }
]
```

### 12.8. items.json

```json
[
  {
    "id": "talisman_sum_gil_001",
    "name": "부적: 숨길",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "HEAL_OVER_TIME",
      "durationMs": 1800000,
      "totalHealPercent": 0.3
    },
    "needsNumericTuning": true
  },
  {
    "id": "talisman_gyeol_bul_001",
    "name": "부적: 결불",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 1800000,
      "damagePercent": 0.1
    },
    "needsNumericTuning": true
  },
  {
    "id": "talisman_jil_sum_001",
    "name": "부적: 질숨",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 1800000,
      "attackSpeedBonus": 0.1
    },
    "needsNumericTuning": true
  },
  {
    "id": "talisman_nal_sum_001",
    "name": "부적: 날숨",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 1800000,
      "moveSpeedBonus": 0.1
    },
    "needsNumericTuning": true
  },
  {
    "id": "talisman_gud_gyeol_001",
    "name": "부적: 굳결",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 1800000,
      "defenseBonus": 0.1
    },
    "needsNumericTuning": true
  },
  {
    "id": "talisman_gwi_ro_001",
    "name": "부적: 귀로",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "RETURN",
      "channelingMs": 3000,
      "usableInCombat": false
    }
  },
  {
    "id": "in_fire_001",
    "name": "인: 움결 화",
    "kind": "IN",
    "tierName": "움결",
    "element": "FIRE"
  },
  {
    "id": "stone_inscribe_mantra_001",
    "name": "돌: 새김",
    "kind": "MATERIAL",
    "category": "STONE",
    "catalystType": "MANTRA"
  },
  {
    "id": "letter_gyeol_hwa_001",
    "name": "결: 화",
    "kind": "LETTER",
    "tierName": "씨앗",
    "element": "FIRE"
  }
]
```

## 13. 전투 처리 순서

아래 전투 처리 순서는 서버가 권위적으로 실행하고, 관련 상태 변화와 전투 피드백 이벤트를 연결된 클라이언트에 방송한다. 클라이언트는 서버 승인 전 최종 피해, HP, 드랍, 인벤토리를 확정하지 않는다.

| 단계 | 처리 내용 | 메모 |
| :--- | :--- | :--- |
| `1` | 공격 입력 및 공격 모션 시작 | 공격 가능 상태인지 먼저 검사 |
| `2` | 타격 시점 도달 확인 | 무기별 `hitFrameMs` 기준 |
| `3` | 타격 대상 1체 판정 | 현재 기획은 항상 `단일 대상 1체` |
| `4` | 무기 공격력 굴림 | `random(minDamage, maxDamage)` |
| `5` | 플레이어 공격 보너스 합산 | `STR`, 추가 공격력, 자형/진언 보정 |
| `6` | 원피해 계산 | `(무기 굴림 + 공격 보너스) x 무기 피해 계수` |
| `7` | 치명타 판정 | 기본 치명타 + 자형/진언 보정 |
| `8` | 치명 반영 원피해 계산 | 치명타면 배율 적용, 아니면 원피해 유지 |
| `9` | 방어 계산 | `max(1, floor(치명 반영 원피해 x 100 / (100 + 방어력) x 추가 피해 보정))` |
| `10` | 물리 피해 적용 | 대상 HP 감소, 피격 경직/피격 반응 처리 |
| `11` | 물리 타격 피드백 출력 | 히트 스파크, 플래시, 첫 데미지 숫자, 치명타 강조 |
| `12` | 언령결 발동 판정 | 장착한 언령결 각각 독립 확률 판정 |
| `13` | 발동 성공 언령결 피해 계산 | 같은 타격에서 성공한 언령결은 전부 개별 피해 |
| `14` | 언령결 피해 적용 및 연출 출력 | 단일 대상 유지, 별도 색상/연출 사용 |
| `15` | 대상 사망 확인 | HP 0 이하 시 사망 처리 진입 |
| `16` | 사망 연출 및 드랍 생성 | 골드, `음`, 아이템 드랍 |
| `17` | 전투 종료 후 상태 정리 | 공격 모션 종료, 입력 복귀, UI 정리 |

- 피격자의 회피는 별도 조작이 아닌 `2단계 확률 판정`이다: `회피 발동 확률` 성공 시 `회피 시 피해 보정 확률`에 따라 원래 피해의 `0~50%`만 적용한다. 처리 순서 내 정확한 위치와 산식은 밸런스 단계에서 정한다.
- `물리 피해`가 항상 먼저 들어가고, 언령결은 그 뒤에 덧붙는 구조로 고정한다.
- 다중 언령 발동이 나와도 첫 번째 물리 타격 숫자가 가장 먼저 읽히도록 처리한다.
- 보스 예외 상태(`평상시 피해 감소`, `약점 노출`, `그로기`, `특정 속성 언령 확정 발동`)는 `bossStateModifiers`를 참조한다.
- `incomingDamageMultiplier`는 평상시 보스가 받는 피해 감소를 표현한다.
- `groggyDefenseOverride`는 그로기 상태에서 보스 방어력을 강제로 바꾸는 값이며, 첫 보스는 `0`을 사용한다.
- 드랍 생성은 모든 피해 적용이 끝난 뒤 `사망 확정` 시점에 한 번만 수행한다.
