import {
  toPlayerData as convertPlayerData,
  toPlayerInventory as convertPlayerInventory,
} from "../data/player-data.mjs";

export type TierName =
  | "씨앗"
  | "움결"
  | "무늬"
  | "물결"
  | "울림"
  | "숨결"
  | "빛살"
  | "여울"
  | "온결";

export type ElementType = "FIRE" | "WATER" | "EARTH" | "WIND" | "LIGHT" | "DARK";
export type ItemKind = "JAHYEONG" | "LETTER" | "MANTRA" | "INCANTATION" | "CONSUMABLE" | "MATERIAL" | "IN";
export type WeaponClass = "GREATSWORD" | "BOW" | "STAFF";
export type MonsterRank = "NORMAL" | "ELITE" | "BOSS";

export interface StatModifier {
  type: string;
  value: number;
}

export interface ProcMeta {
  baseProcChance: number;
  targetRule: "SINGLE_TARGET";
  maxProcChance: number;
  hasInternalCooldown: boolean;
  allowMultiProcPerHit: boolean;
  damageApplication: "APPLY_ALL_PROCS";
  visualStacking: "STACK_ALL_PROCS";
}

export interface JahyeongItem {
  id: string;
  name: string;
  kind: "JAHYEONG";
  tierName: TierName;
  initial: string;
  medial: string;
  final?: string;
  successRate: number;
  stats: StatModifier[];
  canInscribe: boolean;
}

export interface GyeolItem {
  id: string;
  name: string;
  kind: "LETTER" | "MANTRA" | "INCANTATION";
  tierName: TierName;
  components: string[];
  successRate: number;
  role: string;
  stats?: StatModifier[];
  element?: ElementType;
  effectId?: string;
  procMeta?: ProcMeta;
}

export interface GyeolData {
  schemaVersion: "runtime-gyeol.v1";
  sourceDesignData: string;
  jahyeong: JahyeongItem[];
  letterGyeol: GyeolItem[];
  mantraGyeol: GyeolItem[];
  incantationGyeol: GyeolItem[];
}

export interface WeaponItem {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  attackSpeed: number;
  minDamage: number;
  maxDamage: number;
  damageMultiplier: number;
  procRateBonus: number;
  defaultIncantationSlots: number;
  damageReductionBonus: number;
  staggerResistanceBonus: number;
  attackMotionMs: number;
  hitFrameMs: number;
  recoveryMs: number;
  rangePx: number;
  hitboxWidthPx: number;
  hitStunMs: number;
}

export interface DropEntry {
  kind: "GOLD" | "ITEM";
  id?: string;
  probability: number;
  quantity: { min: number; max: number };
  guaranteed: boolean;
}

export interface EumRollGroup {
  draws: { min: number; max: number };
  allowDuplicateSymbols: boolean;
  entries: Array<{
    symbol: string;
    weight: number;
    quantity: { min: number; max: number };
  }>;
}

export interface DropTable {
  entries: DropEntry[];
  eumRollGroup: EumRollGroup;
}

export interface CraftingRecipe {
  id: string;
  inputs: Array<{ kind: "GOLD" | "EUM" | "ITEM"; id?: string; symbol?: string; quantity: number }>;
  goldCost: number;
  catalystItemIds: string[];
  allowedSupportItemIds: string[];
  successRate: number;
  successOutputId: string;
  failure: { consumeInputs: boolean; outputId?: string };
}

export interface WorldPortalLink {
  id: string;
  fromMapId: string;
  toMapId: string;
  toSpawnPointId: string;
}

export interface WorldMapContent {
  id: string;
  name: string;
  kind: "SHARED_HUB" | "COOPERATIVE_INSTANCE";
  maxPlayers: number;
  spawnPointId: string;
  entryPortalLinkIds: string[];
  exitPortalLinkIds: string[];
}

export interface WorldContent {
  schemaVersion: "world-content.v1";
  maps: WorldMapContent[];
  portalLinks: WorldPortalLink[];
}

/** Player-facing stack for the collectible resource displayed as 음. */
export interface EumStack {
  symbol: string;
  quantity: number;
}

export interface PlayerInventory {
  gold: number;
  eum: EumStack[];
  items: string[];
}

/** Stable runtime wire representation retained until the protocol rename. */
export interface LegacyPlayerInventory {
  gold: number;
  resourceLabel: "음";
  fragments: Record<string, number>;
  items: string[];
}

export function toPlayerInventory(inventory: LegacyPlayerInventory): PlayerInventory {
  return convertPlayerInventory(inventory) as PlayerInventory;
}

export interface MonsterItem {
  id: string;
  name: string;
  rank: MonsterRank;
  maxHp: number;
  baseDefense: number;
  baseDamage: number;
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
  attackMotionMs: number;
  hitFrameMs: number;
  hitStunMs: number;
  staggerResistance: number;
  statusEffect?: {
    type: "CONFUSION";
    durationMs: number;
  };
  bossStateModifiers?: {
    incomingDamageMultiplier: number;
    weaknessExposeDurationMs: number;
    groggyDurationMs: number;
    groggyDefenseOverride: number;
    guaranteedIncantationTagOnWeakness: ElementType;
  };
  drops: DropTable;
}

export interface ConsumableItem {
  id: string;
  name: string;
  kind: "CONSUMABLE";
  effect:
    | { type: "HEAL_PERCENT"; value: number; cooldownMs: number }
    | {
        type: "BUFF";
        durationMs: number;
        damageBonus?: number;
        elementDamageBonus?: number;
        attackSpeedBonus?: number;
        moveSpeedBonus?: number;
        cooldownMs: number;
      }
    | { type: "RETURN"; channelingMs: number; usableInCombat: boolean };
}

export interface MaterialItem {
  id: string;
  name: string;
  kind: "MATERIAL";
  category: "INK" | "STONE";
  supportType?: "PROTECT" | "BUFFER" | "BOOST";
  catalystType?: "MANTRA" | "INCANTATION" | "ADVANCED";
  role: string;
}

export interface TransformationInItem {
  id: string;
  name: string;
  kind: "IN";
  tierName: TierName;
  element: ElementType;
  combatMode: "TRANSFORMED";
  visual: {
    baseFormTierName: TierName;
    auraEffectKey: string;
  };
}

export interface CharacterVisualState {
  baseFormTierName: TierName;
  inElement?: ElementType;
  combatMode: "NORMAL" | "TRANSFORMED";
  orientationRadians: number;
  modelKey: string;
  rigKey: string;
  animationClipKey: "idle" | "walk" | "attack" | "hit" | "death";
  weaponModelKey?: string;
  materialVariantKey?: string;
  auraEffectKey?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  level: number;
  stats: {
    str: number;
    dex: number;
    int: number;
    vit: number;
  };
  combatProfile: {
    baseCritChance: number;
    baseCritMultiplier: number;
    attackBonusFromStr: number;
    defenseFromStr: number;
    combatFeedbackPriority: string[];
  };
  hp: {
    max: number;
    current: number;
  };
  equipped: {
    weaponId: string;
    mantraIds: string[];
    incantationIds: string[];
    inId: string;
  };
  inventory: PlayerInventory;
  visual: CharacterVisualState;
}

/** JSON fixture shape retained while the Rust protocol still sends fragments. */
export type LegacyPlayerData = Omit<PlayerData, "inventory"> & {
  inventory: LegacyPlayerInventory;
};

export function toPlayerData(legacy: LegacyPlayerData): PlayerData {
  return convertPlayerData(legacy) as PlayerData;
}
