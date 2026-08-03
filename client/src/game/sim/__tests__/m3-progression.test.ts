import { describe, expect, it } from 'vitest';
import type { PlayerInventory } from '../../types/data';
import {
  M3_IDS,
  applyM3Action,
  createM3InventorySeed,
  createM3Progress,
  enableM3SupplyCache,
  getM3Stage,
} from '../m3-progression';

function sourceInventory(): PlayerInventory {
  return {
    gold: 100,
    eum: [
      { symbol: 'ㄱ', quantity: 3 },
      { symbol: 'ㅎ', quantity: 1 },
      { symbol: 'ㅘ', quantity: 1 },
    ],
    items: [M3_IDS.stone, M3_IDS.jahyeong, M3_IDS.letter],
  };
}

describe('M3 progression', () => {
  it('creates the approved checkpoint without Hwa inputs or pre-crafted output', () => {
    expect(createM3InventorySeed(sourceInventory())).toEqual({
      gold: 15,
      eum: [{ symbol: 'ㄱ', quantity: 3 }],
      items: [],
    });
  });

  it('enables and collects the supply cache exactly once', () => {
    const progress = createM3Progress();
    const inventory = createM3InventorySeed(sourceInventory());
    enableM3SupplyCache(progress);

    expect(getM3Stage(progress, inventory)).toBe('collect_cache');
    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache'),
    ).toMatchObject({ accepted: true });
    expect(inventory).toMatchObject({
      eum: expect.arrayContaining([
        { symbol: 'ㅎ', quantity: 1 },
        { symbol: 'ㅘ', quantity: 1 },
      ]),
      items: [M3_IDS.stone],
    });
    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache'),
    ).toMatchObject({
      accepted: false,
      message: '각인 보급함은 이미 회수했습니다.',
    });
  });

  it('consumes the two approved recipes once and records their outputs', () => {
    const progress = createM3Progress();
    const inventory = createM3InventorySeed(sourceInventory());
    inventory.gold = 20;
    enableM3SupplyCache(progress);
    applyM3Action(progress, inventory, 'in_fire_001', 'collect_m3_supply_cache');

    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'craft_m3_jahyeong_hwa'),
    ).toMatchObject({ accepted: true });
    expect(inventory.eum.some(({ symbol }) => symbol === 'ㅎ' || symbol === 'ㅘ')).toBe(false);
    expect(inventory.items).toContain(M3_IDS.jahyeong);

    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'inscribe_m3_letter_hwa'),
    ).toMatchObject({ accepted: true });
    expect(inventory).toMatchObject({ gold: 0, items: [M3_IDS.letter] });
    expect(progress.inscriptionSequence).toBe(1);
  });

  it('requires the equipped current Gyeol and matching In before transformation can toggle', () => {
    const progress = createM3Progress();
    const inventory: PlayerInventory = { gold: 20, eum: [], items: [M3_IDS.letter] };

    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation'),
    ).toMatchObject({ accepted: false });
    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'equip_m3_letter_hwa'),
    ).toMatchObject({ accepted: true });
    expect(
      applyM3Action(progress, inventory, 'in_water_001', 'toggle_m3_transformation'),
    ).toMatchObject({ accepted: false });
    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation'),
    ).toMatchObject({ accepted: true });
    expect(progress.transformed).toBe(true);
    expect(
      applyM3Action(progress, inventory, 'in_fire_001', 'toggle_m3_transformation'),
    ).toMatchObject({ accepted: true });
    expect(progress.transformed).toBe(false);
  });
});
