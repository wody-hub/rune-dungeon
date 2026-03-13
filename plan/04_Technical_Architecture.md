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
  name: string; // 예: "강", "불", "빛"
  initial: string;
  medial: string;
  final?: string;
  stats: {
    type: string;
    value: number;
  }[];
  canInscribe: boolean;
}
```

### 1.3. 결
```typescript
interface GyeolItem {
  id: string;
  name: string; // 예: "강", "태양", "어둠을 밝히는 불꽃이여"
  kind: "LETTER" | "MANTRA" | "INCANTATION";
  tierName: "씨앗" | "움결" | "무늬" | "물결" | "울림" | "숨결" | "빛살" | "여울" | "온결";
  components: string[];
  stats?: {
    type: string;
    value: number;
  }[];
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

```typescript
interface WeaponItem {
  id: string;
  weaponClass: "GREATSWORD" | "BOW" | "STAFF";
  attackSpeed: number;
  minDamage: number;
  maxDamage: number;
  damageMultiplier: number;
  procRateBonus?: number; // 느린 무기군 전용 기본 발동 확률 보정
  defaultIncantationSlots?: number;
  damageReductionBonus?: number;
  staggerResistanceBonus?: number;
  critChanceBonus?: number;
  critDamageBonus?: number;
}
```

```typescript
interface CombatProfile {
  baseCritChance: number; // MVP 기본값 0.05
  baseCritMultiplier: number; // MVP 기본값 1.5
  attackBonusFromStr: number;
  defenseFromStr: number;
}
```

### 1.4. 돌
```typescript
interface CatalystItem {
  id: string;
  label: string; // 예: "돌: 새김", "돌: 말문", "돌: 깃듦"
  catalystType: "MANTRA" | "INCANTATION" | "ADVANCED";
  tierName?: string;
  element?: "FIRE" | "WATER" | "EARTH" | "WIND" | "LIGHT" | "DARK";
}
```

### 1.5. 먹
```typescript
interface SupportItem {
  id: string;
  label: string; // 예: "먹: 지킴", "먹: 남김", "먹: 돋움"
  supportType: "PROTECT" | "BUFFER" | "BOOST";
  value?: number;
}
```

### 1.6. 캐릭터 비주얼 상태
```typescript
type Direction8 = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
type CharacterAction = "IDLE" | "WALK" | "ATTACK" | "HIT" | "DEATH";
type CombatMode = "NORMAL" | "TRANSFORMED";

interface CharacterVisualState {
  baseFormTierName: "씨앗" | "움결" | "무늬" | "물결" | "울림" | "숨결" | "빛살" | "여울" | "온결";
  inElement?: "FIRE" | "WATER" | "EARTH" | "WIND" | "LIGHT" | "DARK";
  combatMode: CombatMode;
  direction: Direction8;
  action: CharacterAction;
  weaponSpriteKey?: string;
  armorSpriteKey?: string;
  auraEffectKey?: string;
}
```

### 1.7. 스프라이트 리소스
```typescript
interface SpriteSheetAsset {
  key: string;
  atlas?: string;
  frameWidth: number;
  frameHeight: number;
  directions: Direction8[];
  actions: CharacterAction[];
  framesPerAction: number;
}
```

## 2. 상태 트리 예시
```json
{
  "player": {
    "level": 12,
    "stats": { "str": 10, "dex": 10, "int": 10 },
    "inventory": ["jahyeong_1", "gyeol_1", "stone_1", "ink_1"],
    "equipped": { "weapon": "weapon_1", "armor": "armor_1" },
    "visual": {
      "baseFormTierName": "움결",
      "inElement": "FIRE",
      "combatMode": "NORMAL",
      "direction": "SE",
      "action": "IDLE",
      "weaponSpriteKey": "weapon_bronze_sword"
    }
  },
  "field": {
    "idleRewards": {
      "gold": 100,
      "fragments": { "ㄱ": 3, "ㅏ": 2 }
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

### 4.1. 조합
- 재화형 자모 파편을 사용해 `자형` 생성

### 4.2. 결: 글자 각인
- `자형`에 의미를 새겨 `결: 글자` 생성

### 4.3. 각인
- `자형` 또는 `결: 글자` + `돌` + 선택적 `먹`을 사용해 진언결/언령결 생성

### 4.4. 각성
- 후반 `천지인` 재료로 낮은 티어 언령결 강화

## 5. 렌더링 방향
- **Core Framework:** `Phaser`
- **View Style:** `2D 쿼터뷰 감성` 또는 `탑다운 기반 대각 이동`
- **Character Rendering:** `8방향 스프라이트 애니메이션`
- **Layer Composition:** `기본 몸체 + 무기 + 제한적 방어구 + 속성 오라`
- **Effects:** Phaser 파티클, additive 블렌드, 색상 오버레이로 결 발광과 변신 위상 표현
- **의도:** 웹개발자 기준 바이브 코딩으로 빠르게 구현 가능한 구조를 우선 채택하고, 캐릭터/전투/변신의 플레이 검증 속도를 높인다

## 6. 캐릭터 구현 원칙

### 6.1. 방향 및 애니메이션
- 플레이어와 주요 몬스터는 `8방향` 기준으로 제작한다.
- 기본 애니메이션 분류는 `idle`, `walk`, `attack`, `hit`, `death`를 사용한다.
- 단, 첫 MVP는 `idle`, `walk`, `attack`까지만 우선 구현한다.
- 초기 프레임 기준은 `방향당 4프레임 내외`를 기본값으로 둔다.

### 6.2. 변신 표현
- 비전투 모드는 현재 장착한 `인` 계열의 `1티어 기본폼`을 사용한다.
- 전투 모드는 현재 장착한 `인: [티어] [속성]`에 맞는 전투 스프라이트로 교체한다.
- 상위 티어는 풀 스프라이트 신규 제작만을 의미하지 않는다.
- 초기 구현에서는 `기본 스프라이트 + 색상 차등 + 오라 + 일부 갑주 오버레이` 조합으로 티어 차이를 표현할 수 있다.

### 6.3. 장비 레이어링
- 장비는 리니지 스타일처럼 레이어 방식으로 합성한다.
- 첫 MVP에서는 `무기 레이어`를 최우선으로 구현한다.
- 방어구는 스탯 중심으로 설계하되, 초반에는 외형 레이어를 최소화한다.
- 갑주 실루엣 변화는 주요 티어 전환 시점에만 제한적으로 반영한다.

## 7. 아트 생산 파이프라인
- `무료 에셋 조사 -> AI 생성 -> 수동 보정 -> 스프라이트 시트화 -> Phaser 등록` 순으로 작업한다.
- AI 생성 결과물은 방향 일관성이 깨질 수 있으므로 그대로 사용하지 않는다.
- `Aseprite`, `Piskel`, `TexturePacker` 등으로 방향/프레임 정렬과 수동 보정을 수행한다.
- 파일 네이밍은 `unit_element_tier_action_direction` 규칙을 기본으로 한다.

## 8. MVP 기술 범위
- 첫 수직 슬라이스는 `플레이어 1종`, `무기 1종`, `속성 1종`, `기본 변신 1종`, `필드 1`, `던전 1`, `보스 1`까지만 다룬다.
- 첫 구현 목표는 그래픽 완성도가 아니라 `이동`, `공격`, `언령 확률 발동`, `피격`, `변신 on/off`, `결 파밍`, `자형 -> 결: 글자` 루프 검증이다.

## 9. 전투 리소스 정책
- 전투에 별도의 `마나` 자원은 사용하지 않는다.
- 언령결은 공격 적중 시 확률적으로 발동하는 장착형 효과다.
- `언령 발동 확률`은 기본적으로 진언결 중심 특수 옵션이며, 예외적으로 공속이 느린 무기군은 무기 고유 기본 옵션으로만 추가 발동 확률 보정을 가질 수 있다.
- 장비 옵션 전반이 무분별하게 언령 발동 확률을 제공하는 구조는 사용하지 않는다.
- 진언결과 장비는 `언령 피해` 같은 보정값을 제공할 수 있다.
- 같은 타격에서 여러 언령결이 동시에 발동할 수 있으며, 성공한 언령결은 모두 단일 대상에게 개별 피해를 적용한다.
- 전투 밸런스는 `개별 언령 기대값`보다 `초당 총 발동 기대값` 기준으로 본다.
- 기본 기대값 계산식은 `attackSpeed x effectiveProcChance x equippedIncantationCount`로 둔다.
- 기본 공격 공식은 `random(minDamage, maxDamage) + attackBonus`를 출발값으로 둔다.
- MVP 기본 치명타는 `critChance 5%`, `critMultiplier 1.5`를 사용한다.
- 1차 기준 수치는 `GREATSWORD 0.8 / +1%`, `BOW 1.6 / +0%`, `STAFF 1.1 / +3%`를 사용한다.
- MVP `GREATSWORD`는 `minDamage 12`, `maxDamage 20`, `damageMultiplier 1.45`, `defaultIncantationSlots 2`, `attackSpeed 0.8`, `procRateBonus +1%`를 기본값으로 사용한다.
