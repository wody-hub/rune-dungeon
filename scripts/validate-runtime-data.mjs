import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toPlayerData } from "../client/src/game/data/player-data.mjs";

const root = new URL("..", import.meta.url).pathname;

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function flattenValues(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenValues(entry, [...path, index]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => flattenValues(entry, [...path, key]));
  }
  return [{ path, value }];
}

function assertNoNulls(file, data) {
  const nullPaths = flattenValues(data)
    .filter((entry) => entry.value === null)
    .map((entry) => entry.path.join("."));
  assert.deepEqual(nullPaths, [], `${file} contains null runtime values`);
}

function indexById(items, label) {
  const index = new Map();
  for (const item of items) {
    assert.equal(typeof item.id, "string", `${label} item is missing id`);
    assert.ok(!index.has(item.id), `${label} has duplicate id ${item.id}`);
    index.set(item.id, item);
  }
  return index;
}

function assertRate(value, expected, label) {
  assert.equal(value, expected, `${label} expected ${expected}, got ${value}`);
}

const player = readJson("client/src/game/data/player.json");
assert.equal(player.inventory.resourceLabel, "음", "player-facing fragment resource name");
assert.ok(player.inventory.fragments, "legacy fragments wire field must remain available during protocol transition");
const playerData = toPlayerData(player);
assert.deepEqual(playerData.inventory.eum, [
  { symbol: "ㄱ", quantity: 3 },
  { symbol: "ㅏ", quantity: 2 },
  { symbol: "ㅇ", quantity: 1 },
  { symbol: "ㅎ", quantity: 1 },
  { symbol: "ㅘ", quantity: 1 },
  { symbol: "ㅂ", quantity: 1 },
], "legacy fragments convert to player-facing eum stacks");
const weapons = readJson("client/src/game/data/weapons.json");
const gyeol = readJson("client/src/game/data/gyeol.json");
const monsters = readJson("client/src/game/data/monsters.json");
const consumables = readJson("client/src/game/data/consumables.json");
const materials = readJson("client/src/game/data/materials.json");
const transformationIns = readJson("client/src/game/data/transformation-ins.json");

for (const [file, data] of [
  ["player.json", player],
  ["weapons.json", weapons],
  ["gyeol.json", gyeol],
  ["monsters.json", monsters],
  ["consumables.json", consumables],
  ["materials.json", materials],
  ["transformation-ins.json", transformationIns],
]) {
  assertNoNulls(file, data);
}

const weaponIndex = indexById(weapons, "weapons");
const jahyeongIndex = indexById(gyeol.jahyeong, "jahyeong");
const letterIndex = indexById(gyeol.letterGyeol, "letterGyeol");
const mantraIndex = indexById(gyeol.mantraGyeol, "mantraGyeol");
const incantationIndex = indexById(gyeol.incantationGyeol, "incantationGyeol");
const consumableIndex = indexById(consumables, "consumables");
const materialIndex = indexById(materials, "materials");
const inIndex = indexById(transformationIns, "transformationIns");
const runtimeItemKinds = new Set();

for (const data of [gyeol, consumables, materials, transformationIns]) {
  for (const entry of flattenValues(data)) {
    if (entry.path.at(-1) === "kind" && typeof entry.value === "string") {
      runtimeItemKinds.add(entry.value);
    }
  }
}

const typeSource = readText("client/src/game/types/data.ts");
const itemKindMatch = typeSource.match(/export type ItemKind = ([^;]+);/s);
assert.ok(itemKindMatch, "ItemKind union must exist in client/src/game/types/data.ts");
const declaredItemKinds = new Set([...itemKindMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]));
for (const kind of runtimeItemKinds) {
  assert.ok(declaredItemKinds.has(kind), `runtime kind ${kind} must be included in ItemKind`);
}

const planSource = readText("plan/04_Technical_Architecture.md");
const sourceDocuments = [
  "progress.md",
  "plan/01_Game_Overview.md",
  "plan/04_Technical_Architecture.md",
  "plan/06_Art_Direction.md",
  "plan/16_Character_and_Leveling.md",
  "plan/17_MVP_Development_Roadmap.md",
]
  .map(readText)
  .join("\n");

for (const stalePhrase of [
  "Game Engine:** `Phaser 3`",
  "첫 구현은 서버 없이",
  "2D 스프라이트 기반",
  "3D 카메라와 3D 캐릭터 파이프라인",
]) {
  assert.ok(!sourceDocuments.includes(stalePhrase), `stale implementation baseline: ${stalePhrase}`);
}

const runtimeDataSource = [
  "client/src/game/data/player.json",
  "client/src/game/data/weapons.json",
  "client/src/game/data/gyeol.json",
  "client/src/game/data/monsters.json",
  "client/src/game/data/consumables.json",
  "client/src/game/data/materials.json",
  "client/src/game/data/transformation-ins.json",
].map(readText).join("\n");
const stalePlanIds = [
  "incantation_fire_001",
  "incantation_fire_002",
  "catalyst_sae_gim_001",
  "gyeol_letter_hwa_001",
  "boss_stubby_knight_001",
  "mantra_cheolbyeok_001",
].filter((id) => planSource.includes(id) && !runtimeDataSource.includes(id));
assert.deepEqual(stalePlanIds, [], "plan/04 contains runtime sample IDs that are absent from client runtime data");

assert.ok(weaponIndex.has(player.equipped.weaponId), "player weaponId must reference weapons.json");
for (const id of player.equipped.mantraIds) {
  assert.ok(mantraIndex.has(id) || jahyeongIndex.has(id), `player mantraId ${id} must reference mantra or jahyeong data`);
}
for (const id of player.equipped.incantationIds) {
  assert.ok(incantationIndex.has(id), `player incantationId ${id} must reference incantation data`);
}
assert.ok(inIndex.has(player.equipped.inId), "player inId must reference transformation-ins.json");
for (const id of player.inventory.items) {
  const found =
    consumableIndex.has(id) ||
    materialIndex.has(id) ||
    letterIndex.has(id) ||
    mantraIndex.has(id) ||
    incantationIndex.has(id) ||
    inIndex.has(id);
  assert.ok(found, `inventory item ${id} must reference a runtime item`);
}

const mvpWeapon = weaponIndex.get("weapon_greatsword_mvp_001");
assertRate(mvpWeapon.attackSpeed, 0.8, "MVP greatsword attackSpeed");
assertRate(mvpWeapon.procRateBonus, 0.01, "MVP greatsword procRateBonus");
assert.equal(mvpWeapon.defaultIncantationSlots, 2, "MVP greatsword incantation slots");

for (const incantation of incantationIndex.values()) {
  assert.equal(incantation.kind, "INCANTATION", `${incantation.id} kind`);
  assert.equal(incantation.procMeta.targetRule, "SINGLE_TARGET", `${incantation.id} targetRule`);
  assert.equal(incantation.procMeta.hasInternalCooldown, false, `${incantation.id} cooldown policy`);
  assert.equal(incantation.procMeta.maxProcChance, 0.2, `${incantation.id} maxProcChance`);
  assert.equal(incantation.element, "FIRE", `${incantation.id} MVP element`);
  assertRate(incantation.procMeta.baseProcChance, 0.03, `${incantation.id} baseProcChance`);
}

assert.equal(incantationIndex.size, 2, "MVP runtime should include exactly 2 incantations");
assert.ok(monsters.some((monster) => monster.id === "monster_ink_slime_001"), "monster data includes ink slime");
assert.ok(monsters.some((monster) => monster.id === "boss_pencil_knight_commander_001"), "monster data includes MVP boss");
for (const monster of monsters) {
  for (const id of monster.drops.items ?? []) {
    const found =
      materialIndex.has(id) ||
      letterIndex.has(id) ||
      mantraIndex.has(id) ||
      incantationIndex.has(id) ||
      consumableIndex.has(id);
    assert.ok(found, `${monster.id} drop item ${id} must reference runtime item data`);
  }
}

console.log("runtime data OK");
