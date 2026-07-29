export function toPlayerInventory(inventory) {
  return {
    gold: inventory.gold,
    eum: Object.entries(inventory.fragments).map(([symbol, quantity]) => ({ symbol, quantity })),
    items: inventory.items,
  };
}

export function toPlayerData(legacy) {
  return {
    ...legacy,
    inventory: toPlayerInventory(legacy.inventory),
  };
}
