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
- 재화형 자모 파편을 사용해 `자형`을 생성한다.
- `자형` 조합은 `100% 확정`이다.

### 4.2. 결: 글자 각인
- `자형`에 의미를 새겨 `결: 글자`를 생성한다.
- `결: 글자`부터는 확률, `돌`, `먹`, 희귀도가 붙는다.

### 4.3. 진언결/언령결 각인
- `자형` 또는 `결: 글자`와 `돌`, 선택적 `먹`을 사용해 진언결/언령결을 생성한다.
- 진언결은 패시브 빌드 축이고, 언령결은 기본 공격 적중 시 확률 발동하는 전투 연출/피해 축이다.

### 4.4. 천지인 각성
- 후반 `천지인` 재료는 낮은 티어 언령결을 강화한다.
- 새 언령결 제작 재료가 아니라, 기존 언령결의 보존 가치를 살리는 강화 축이다.

## 5. 구현 기술 스택
- **Language:** `TypeScript`
- **Build Tool:** `Vite`
- **Game Engine:** `Phaser 3`
- **Data Format:** 초기 수직 슬라이스는 `로컬 JSON`
- **Hangul Library:** `hangul-js`
- **Persistence:** 초기 수직 슬라이스는 `localStorage` 또는 매우 얇은 저장 계층
- **Primary Target:** `웹 브라우저`
- **확장 방향:** 이후 `PWA`, 모바일 래핑, 데스크탑 패키징 확장 가능

첫 구현은 서버 없이 클라이언트 중심 단일 실행형으로 시작한다. 서버는 `멀티플레이`, `계정`, `동기화`, `경제 검증`, `치트 방어`, `라이브 운영`이 필요해지는 시점에 도입한다.

서버 도입 시 1차 확정 스택은 `Java + Spring Boot + JPA + QueryDSL`, 데이터베이스는 `PostgreSQL`을 기준으로 둔다.

## 6. 렌더링 방향
- **Core Framework:** `Phaser 3`
- **View Style:** `2D 쿼터뷰 감성` 또는 `탑다운 기반 대각 이동`
- **Character Rendering:** `8방향 스프라이트 애니메이션`
- **Layer Composition:** `기본 몸체 + 무기 + 제한적 방어구 + 속성 오라`
- **Effects:** Phaser 파티클, additive 블렌드, 색상 오버레이로 결 발광과 변신 위상을 표현한다.

## 7. 캐릭터 구현 원칙
- 플레이어와 주요 몬스터는 `8방향` 기준으로 제작한다.
- 기본 애니메이션 분류는 `idle`, `walk`, `attack`, `hit`, `death`를 사용한다.
- 첫 수직 슬라이스는 `idle`, `walk`, `attack`까지만 우선 구현한다.
- 초기 프레임 기준은 `방향당 4프레임 내외`를 기본값으로 둔다.
- 전투 모드는 현재 장착한 `인: [티어] [속성]`에 맞는 전투 스프라이트 또는 오라로 구분한다.
- 첫 MVP는 `기본 몸체 + 무기 + 오라`만으로도 충분하다.

## 8. MVP 기술 범위
- 첫 수직 슬라이스는 `플레이어 1종`, `무기 1종`, `속성 1종`, `기본 변신 1종`, `필드 1`, `던전 1`, `보스 1`까지만 다룬다.
- 첫 구현 목표는 그래픽 완성도가 아니라 `이동`, `공격`, `언령 확률 발동`, `피격`, `변신 on/off`, `결 파밍`, `자형 -> 결: 글자` 루프 검증이다.

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
  docs/
```

- `client/`는 `TypeScript + Vite + Phaser 3` 게임 클라이언트를 둔다.
- `server/`는 이후 확장용 `Spring Boot + JPA + QueryDSL` 백엔드를 둔다.
- 현재 `plan/` 문서는 계속 루트에 유지하고, 구현 시작 후 보조 문서는 `docs/`로 분리할 수 있다.

### 11.2. 클라이언트 구조 초안

```text
client/
  public/
  src/
    main.ts
    game/
      config/
      scenes/
      entities/
      systems/
      ui/
      data/
      utils/
      constants/
      types/
    assets/
      sprites/
      tiles/
      effects/
      audio/
```

- `config/`: Phaser 설정, 해상도, 입력, 공통 게임 옵션
- `scenes/`: `TitleScene`, `TownScene`, `FieldScene`, `DungeonScene`, `BossScene`
- `entities/`: `Player`, `Monster`, `Boss`, `DropItem`
- `systems/`: `CombatSystem`, `DropSystem`, `CraftSystem`, `TransformSystem`, `SaveSystem`
- `ui/`: HUD, 인벤토리, 장착창, 제작 UI, 보스 체력 UI
- `data/`: MVP용 로컬 JSON 로더와 샘플 데이터
- `utils/`: 공용 계산 로직, 한글 조합 보조 함수, 수치 계산 보조
- `constants/`: 티어명, 속성명, 무기군, 공통 키값
- `types/`: 클라이언트 전용 타입 정의

### 11.3. 서버 구조 초안

```text
server/
  src/main/java/.../runedungeon/
    common/
    auth/
    player/
    inventory/
    equipment/
    combat/
    dungeon/
    drop/
    craft/
    admin/
  src/main/resources/
    application.yml
  src/test/java/.../runedungeon/
```

- `common/`: 공통 설정, 예외, 응답 포맷, 유틸
- `auth/`: 계정, 인증, 토큰
- `player/`: 플레이어 기본 정보와 저장 상태
- `inventory/`: 인벤토리, 자모 파편, 소모품
- `equipment/`: 장비, 자형, 결, 진언결, 언령결 장착
- `combat/`: 전투 결과 저장, 피해 로그, 보스 상태 예외 처리
- `dungeon/`: 던전 입장, 진행 상태, 결과 정산
- `drop/`: 드랍 검증과 지급
- `craft/`: `자형 -> 결: 글자 -> 진언결/언령결` 제작 처리
- `admin/`: 운영툴, 보상 지급, 밸런스 데이터 조회

### 11.4. MVP 시작 권장 범위
- 첫 구현은 `client/`만 먼저 시작한다.
- `server/`는 폴더만 잡거나 별도 저장소로 분리할 수 있지만, 실제 구현은 수직 슬라이스 검증 후 시작한다.
- `client/src/game/scenes`, `entities`, `systems`, `data`, `ui` 5개 축만 먼저 살아 있으면 수직 슬라이스 검증이 가능하다.

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
      "potion_sum_mul_001",
      "potion_gyeol_bul_001",
      "potion_jil_sum_001",
      "potion_gwiro_gyeol_001"
    ]
  },
  "visual": {
    "baseFormTierName": "움결",
    "inElement": "FIRE",
    "combatMode": "NORMAL",
    "direction": "SE",
    "action": "IDLE",
    "weaponSpriteKey": "weapon_greatsword_bronze"
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
    "moveSpeed": 42,
    "aggroRange": 180,
    "attackRange": 28,
    "attackMotionMs": 1400,
    "hitFrameMs": 420,
    "baseDamage": 18,
    "hitStunMs": 260,
    "staggerResistance": 0.0,
    "drops": {
      "gold": [5, 10],
      "fragments": ["ㄱ", "ㅏ", "ㅇ"]
    }
  },
  {
    "id": "monster_typo_sprite_001",
    "name": "오타 요정",
    "rank": "ELITE",
    "maxHp": 320,
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
      "gold": [12, 20],
      "fragments": ["ㅎ", "ㅘ", "ㅂ", "ㅜ", "ㄹ"],
      "items": ["stone_inscribe_mantra_001"]
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
      "gold": [80, 120],
      "fragments": ["ㅎ", "ㅘ", "ㅂ", "ㅜ", "ㄹ", "ㄷ", "ㅏ", "ㅇ"],
      "items": ["stone_inscribe_mantra_001", "letter_gyeol_hwa_001"]
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
    "successRate": 0.95,
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
    "id": "potion_sum_mul_001",
    "name": "숨물",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "HEAL_PERCENT",
      "value": 0.3,
      "cooldownMs": 12000
    }
  },
  {
    "id": "potion_gyeol_bul_001",
    "name": "결불",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 12000,
      "damageBonus": 0.1,
      "elementDamageBonus": 0.1,
      "cooldownMs": 30000
    }
  },
  {
    "id": "potion_jil_sum_001",
    "name": "질숨",
    "kind": "CONSUMABLE",
    "effect": {
      "type": "BUFF",
      "durationMs": 10000,
      "attackSpeedBonus": 0.12,
      "moveSpeedBonus": 0.1,
      "cooldownMs": 30000
    }
  },
  {
    "id": "potion_gwiro_gyeol_001",
    "name": "귀로결",
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
| `16` | 사망 연출 및 드랍 생성 | 골드, 파편, 아이템 드랍 |
| `17` | 전투 종료 후 상태 정리 | 공격 모션 종료, 입력 복귀, UI 정리 |

- `물리 피해`가 항상 먼저 들어가고, 언령결은 그 뒤에 덧붙는 구조로 고정한다.
- 다중 언령 발동이 나와도 첫 번째 물리 타격 숫자가 가장 먼저 읽히도록 처리한다.
- 보스 예외 상태(`평상시 피해 감소`, `약점 노출`, `그로기`, `특정 속성 언령 확정 발동`)는 `bossStateModifiers`를 참조한다.
- `incomingDamageMultiplier`는 평상시 보스가 받는 피해 감소를 표현한다.
- `groggyDefenseOverride`는 그로기 상태에서 보스 방어력을 강제로 바꾸는 값이며, 첫 보스는 `0`을 사용한다.
- 드랍 생성은 모든 피해 적용이 끝난 뒤 `사망 확정` 시점에 한 번만 수행한다.
