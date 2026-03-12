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
  skillId?: string;
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

## 2. 상태 트리 예시
```json
{
  "player": {
    "level": 12,
    "stats": { "str": 10, "dex": 10, "int": 10 },
    "inventory": ["jahyeong_1", "gyeol_1", "stone_1", "ink_1"],
    "equipped": { "weapon": "weapon_1", "armor": "armor_1" }
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
- **Framework:** React Three Fiber
- **Visual Helper:** `@react-three/drei`
- **Post Processing:** `Bloom`, `SSAO`
- **의도:** 어두운 배경 위에 선명한 결 이펙트와 장비 광택 표현
