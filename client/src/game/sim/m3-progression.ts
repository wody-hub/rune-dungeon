import craftingRecipes from '../data/crafting-recipes.json';
import type { CraftingRecipe, PlayerInventory } from '../types/data';

export const M3_IDS = {
  hwaInitial: 'ㅎ',
  hwaMedial: 'ㅘ',
  stone: 'stone_inscribe_mantra_001',
  jahyeong: 'jahyeong_hwa_001',
  letter: 'letter_gyeol_hwa_001',
  fireIn: 'in_fire_001',
  jahyeongRecipe: 'recipe_jahyeong_hwa_001',
  letterRecipe: 'recipe_letter_hwa_001',
} as const;

export const M3_ACTIONS = [
  'collect_m3_supply_cache',
  'craft_m3_jahyeong_hwa',
  'inscribe_m3_letter_hwa',
  'equip_m3_letter_hwa',
  'toggle_m3_transformation',
] as const;

export type M3Action = (typeof M3_ACTIONS)[number];

export type M3Stage =
  | 'defeat_slime'
  | 'collect_cache'
  | 'craft_jahyeong'
  | 'inscribe_letter'
  | 'equip_letter'
  | 'transform'
  | 'transformed';

export interface M3Progress {
  cacheAvailable: boolean;
  cacheCollected: boolean;
  currentGyeolId: string | null;
  transformed: boolean;
  statusMessage: string;
  acquisitionSequence: number;
  inscriptionSequence: number;
  equipSequence: number;
  transformationSequence: number;
}

export interface M3ActionResult {
  accepted: boolean;
  message: string;
}

const recipes = craftingRecipes as CraftingRecipe[];
const resetItemIds = new Set<string>([
  M3_IDS.stone,
  M3_IDS.jahyeong,
  M3_IDS.letter,
]);

function recipe(id: string): CraftingRecipe {
  const found = recipes.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing M3 crafting recipe: ${id}`);
  return found;
}

function eumQuantity(inventory: PlayerInventory, symbol: string): number {
  return inventory.eum.find((stack) => stack.symbol === symbol)?.quantity ?? 0;
}

function addEum(
  inventory: PlayerInventory,
  symbol: string,
  quantity: number,
): void {
  const stack = inventory.eum.find((entry) => entry.symbol === symbol);
  if (stack) stack.quantity += quantity;
  else inventory.eum.push({ symbol, quantity });
}

function removeEum(
  inventory: PlayerInventory,
  symbol: string,
  quantity: number,
): void {
  const index = inventory.eum.findIndex((entry) => entry.symbol === symbol);
  if (index < 0 || inventory.eum[index].quantity < quantity) {
    throw new Error(`Missing M3 음: ${symbol}`);
  }
  inventory.eum[index].quantity -= quantity;
  if (inventory.eum[index].quantity === 0) inventory.eum.splice(index, 1);
}

function removeItem(inventory: PlayerInventory, id: string): void {
  const index = inventory.items.indexOf(id);
  if (index < 0) throw new Error(`Missing M3 item: ${id}`);
  inventory.items.splice(index, 1);
}

function canCraft(inventory: PlayerInventory, entry: CraftingRecipe): boolean {
  const goldInputs = entry.inputs
    .filter((input) => input.kind === 'GOLD')
    .reduce((sum, input) => sum + input.quantity, 0);
  if (inventory.gold < entry.goldCost + goldInputs) return false;

  return (
    entry.inputs.every((input) => {
      if (input.kind === 'EUM') {
        return !!input.symbol && eumQuantity(inventory, input.symbol) >= input.quantity;
      }
      if (input.kind === 'ITEM') {
        return (
          !!input.id &&
          inventory.items.filter((id) => id === input.id).length >= input.quantity
        );
      }
      return inventory.gold >= input.quantity;
    }) && entry.catalystItemIds.every((id) => inventory.items.includes(id))
  );
}

function craft(inventory: PlayerInventory, entry: CraftingRecipe): boolean {
  if (!canCraft(inventory, entry)) return false;

  for (const input of entry.inputs) {
    if (input.kind === 'EUM') {
      removeEum(inventory, input.symbol!, input.quantity);
    } else if (input.kind === 'ITEM') {
      for (let count = 0; count < input.quantity; count += 1) {
        removeItem(inventory, input.id!);
      }
    } else {
      inventory.gold -= input.quantity;
    }
  }
  for (const id of entry.catalystItemIds) removeItem(inventory, id);
  inventory.gold -= entry.goldCost;
  inventory.items.push(entry.successOutputId);
  return true;
}

function result(
  progress: M3Progress,
  accepted: boolean,
  message: string,
): M3ActionResult {
  progress.statusMessage = message;
  return { accepted, message };
}

export function createM3InventorySeed(
  source: PlayerInventory,
): PlayerInventory {
  return {
    gold: 15,
    eum: source.eum
      .filter(
        ({ symbol }) =>
          symbol !== M3_IDS.hwaInitial && symbol !== M3_IDS.hwaMedial,
      )
      .map((stack) => ({ ...stack })),
    items: source.items.filter((id) => !resetItemIds.has(id)),
  };
}

export function createM3Progress(): M3Progress {
  return {
    cacheAvailable: false,
    cacheCollected: false,
    currentGyeolId: null,
    transformed: false,
    statusMessage: '먹물 슬라임을 처치해 보급함을 깨우세요.',
    acquisitionSequence: 0,
    inscriptionSequence: 0,
    equipSequence: 0,
    transformationSequence: 0,
  };
}

export function createM3CompletedCheckpoint(source: PlayerInventory): {
  inventory: PlayerInventory;
  progress: M3Progress;
} {
  return {
    inventory: createM3InventorySeed(source),
    progress: {
      ...createM3Progress(),
      cacheAvailable: true,
      cacheCollected: true,
      currentGyeolId: M3_IDS.letter,
      statusMessage: '결: 화를 현재 결에 장착했습니다.',
      acquisitionSequence: 1,
      inscriptionSequence: 1,
      equipSequence: 1,
    },
  };
}

export function enableM3SupplyCache(progress: M3Progress): void {
  if (progress.cacheAvailable || progress.cacheCollected) return;
  progress.cacheAvailable = true;
  progress.statusMessage = '각인 보급함이 깨어났습니다.';
}

export function isM3Action(
  intent: { type: string },
): intent is { type: M3Action } {
  return (M3_ACTIONS as readonly string[]).includes(intent.type);
}

export function getM3Stage(
  progress: M3Progress,
  inventory: PlayerInventory,
): M3Stage {
  if (!progress.cacheAvailable) return 'defeat_slime';
  if (!progress.cacheCollected) return 'collect_cache';
  if (progress.currentGyeolId === M3_IDS.letter) {
    return progress.transformed ? 'transformed' : 'transform';
  }
  if (inventory.items.includes(M3_IDS.letter)) return 'equip_letter';
  if (inventory.items.includes(M3_IDS.jahyeong)) return 'inscribe_letter';
  return 'craft_jahyeong';
}

export function applyM3Action(
  progress: M3Progress,
  inventory: PlayerInventory,
  equippedInId: string,
  action: M3Action,
): M3ActionResult {
  if (action === 'collect_m3_supply_cache') {
    if (progress.cacheCollected) {
      return result(progress, false, '각인 보급함은 이미 회수했습니다.');
    }
    if (!progress.cacheAvailable) {
      return result(progress, false, '먼저 먹물 슬라임을 처치하세요.');
    }
    addEum(inventory, M3_IDS.hwaInitial, 1);
    addEum(inventory, M3_IDS.hwaMedial, 1);
    inventory.items.push(M3_IDS.stone);
    progress.cacheCollected = true;
    progress.acquisitionSequence += 1;
    return result(progress, true, '음 · ㅎ, 음 · ㅘ, 돌: 새김을 획득했습니다.');
  }

  if (action === 'craft_m3_jahyeong_hwa') {
    if (!craft(inventory, recipe(M3_IDS.jahyeongRecipe))) {
      return result(progress, false, '자형: 화 재료가 부족합니다.');
    }
    return result(progress, true, '자형: 화를 조합했습니다.');
  }

  if (action === 'inscribe_m3_letter_hwa') {
    if (!craft(inventory, recipe(M3_IDS.letterRecipe))) {
      return result(progress, false, '결: 화 각인 재료가 부족합니다.');
    }
    progress.inscriptionSequence += 1;
    return result(progress, true, '결: 화가 점화되었습니다.');
  }

  if (action === 'equip_m3_letter_hwa') {
    if (!inventory.items.includes(M3_IDS.letter)) {
      return result(progress, false, '결: 화를 먼저 각인하세요.');
    }
    removeItem(inventory, M3_IDS.letter);
    progress.currentGyeolId = M3_IDS.letter;
    progress.equipSequence += 1;
    return result(progress, true, '결: 화를 현재 결에 장착했습니다.');
  }

  if (
    progress.currentGyeolId !== M3_IDS.letter ||
    equippedInId !== M3_IDS.fireIn
  ) {
    return result(progress, false, '현재 결과 인: 움결 화를 먼저 준비하세요.');
  }

  progress.transformed = !progress.transformed;
  if (progress.transformed) progress.transformationSequence += 1;
  return result(
    progress,
    true,
    progress.transformed
      ? '화 변신이 활성화되었습니다.'
      : '변신을 해제했습니다.',
  );
}
