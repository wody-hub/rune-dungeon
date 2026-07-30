/**
 * @param {{ gold: number, fragments: Record<string, number>, items: unknown[] }} inventory
 */
export function toPlayerInventory(inventory) {
  return {
    gold: inventory.gold,
    eum: Object.entries(inventory.fragments).map(([symbol, quantity]) => ({ symbol, quantity })),
    items: inventory.items,
  };
}

/**
 * @param {{ inventory: { gold: number, fragments: Record<string, number>, items: unknown[] } }} legacy
 */
export function toPlayerData(legacy) {
  return {
    ...legacy,
    inventory: toPlayerInventory(legacy.inventory),
  };
}
