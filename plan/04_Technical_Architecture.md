# [기획서] 04. 기술적 설계 및 데이터 구조 (Technical Schema)

## 1. 데이터 모델 정의 (Data Model)
시스템 전반에서 사용되는 핵심 객체의 TypeScript 인터페이스 정의입니다.

### 1.1. 아이템 (Item)
```typescript
interface Item {
  id: string;
  name: string;
  type: 'WEAPON' | 'ARMOR' | 'HELM' | 'BOOTS';
  rarity: 'COMMON' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'RUNEWORD';
  baseStats: {
    damage?: number;
    defense?: number;
    moveSpeed?: number;
  };
  sockets: number; // 소켓 개수 (0~4)
  equippedRunes: string[]; // 장착된 Glyph ID 배열
  activeRuneWordId?: string; // 활성화된 룬워드 ID
}
```

### 1.2. 룬 (Rune - Glyph)
```typescript
interface Glyph {
  id: string;
  char: string; // '강', '화' 등
  components: string[]; // ['ㄱ', 'ㅏ', 'ㅇ']
  stats: {
    type: string; // 'CRIT', 'FIRE_DMG', 'AOE' 등
    value: number;
  }[];
  quality: number; // 0 ~ 1.0 (100%)
}
```

### 1.3. 룬워드 (RuneWord)
```typescript
interface RuneWord {
  id: string;
  word: string; // '강화'
  sequence: string[]; // ['강', '화']
  effect: {
    statMultiplier: number; // 데미지 증폭 등
    activeSkillId?: string; // 활성화될 스킬 ID
    visualEffectId: string; // 아이템의 오라 등 시각 효과
  };
}
```

---

## 2. 클라이언트 상태 트리 (State Tree)
Zustand 등으로 관리할 전역 상태의 구조입니다.

```json
{
  "player": {
    "stats": { "str": 10, "dex": 10, "int": 10 },
    "inventory": ["item_id_1", "item_id_2"],
    "equipped": { "weapon": "item_id_3", "armor": "item_id_4" }
  },
  "dungeon": {
    "currentFloor": 1,
    "enemies": [],
    "droppedItems": []
  }
}
```

---

## 3. 한글 조합 라이브러리 연동 가이드
- **Library:** `hangul-js` 활용 (https://github.com/dittos/hangul-js)
- **Assemble:** `Hangul.assemble(['ㄱ', 'ㅏ', 'ㅇ'])` -> `'강'`
- **Disassemble:** `Hangul.disassemble('강')` -> `['ㄱ', 'ㅏ', 'ㅇ']`
- **조합 제한:** 인벤토리 창에서 드래그 앤 드롭 시, 유효한 한글 조합이 아닐 경우(예: ㄱㄱㅏ) 시각적으로 붉게 표시하고 조합 버튼 비활성화.

---

## 5. 상세 기술 스택 및 비주얼 구현 (Rendering Pipeline)
뮤/바스티안 스타일의 고광택 및 한글 빛 축제 연출을 위한 구체적 기술입니다.

### 5.1. 렌더링 라이브러리 (3D Stack)
- **Framework:** `React Three Fiber` (R3F)
- **Visual Helper:** `@react-three/drei` (고급 재질 관리)
- **Post-Processing:** `@react-three/postprocessing`
  - `Bloom`: 룬과 고광택 장비의 빛 번짐 효과.
  - `SSAO`: SD 캐릭터와 던전 오브젝트 사이의 그림자 디테일.

### 5.2. 장비 재질 진화 로직 (PBR Customization)
- **기본 상태:** `meshStandardMaterial`의 `roughness: 0.8` (무광).
- **룬워드 상태:** `meshPhysicalMaterial`을 사용하여 실시간 환경 반사광 극대화.
  - `metalness: 1.0`, `roughness: 0.05` (거울 같은 유광).
  - `transmission: 0.5` (무기 파츠를 수정체처럼 투명하게 처리).

### 5.3. 빛의 흐름 연출 (Shader Effect)
- **마나 플로우 (Mana Flow):** 장비 표면의 텍스처를 따라 흐르는 빛을 구현하기 위해 `ShaderMaterial`을 활용한 유동성 효과 적용.
- **파동 효과 (Pulsing):** `emissiveIntensity` 값을 시간에 따라 사인파(Sin wave) 형태로 조절하여 맥박 치는 듯한 효과 부여.

---

## 6. 플랫폼 대응 전략 (Cross-Platform Deployment)
- **Web (Desktop/Mobile):** 브라우저 기반 PWA 배포.
- **iOS/Android App:** **Capacitor**를 사용하여 네이티브 빌드.
- **Performance:** 모바일 저사양 대응을 위해 환경 맵(Environment Map)의 해상도를 동적으로 조절하는 최적화 로직 포함.
