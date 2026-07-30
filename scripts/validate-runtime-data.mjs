import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const runtimeEumSymbols = new Set(["ㄱ", "ㅏ", "ㅇ", "ㅎ", "ㅘ", "ㅂ", "ㅜ", "ㄹ", "ㄷ"]);
const resourceKinds = new Set(["GOLD", "EUM", "ITEM"]);

function assertProbability(value, label) {
  assert.equal(typeof value, "number", `${label} probability must be a number`);
  assert.ok(value > 0 && value <= 1, `${label} probability must be in (0, 1]`);
}

function assertPositiveInteger(value, label) {
  assert.ok(Number.isInteger(value) && value > 0, `${label} must be a positive integer`);
}

function assertQuantityRange(quantity, label) {
  assert.ok(quantity && typeof quantity === "object", `${label} quantity must be an object`);
  assertPositiveInteger(quantity.min, `${label} quantity.min`);
  assertPositiveInteger(quantity.max, `${label} quantity.max`);
  assert.ok(quantity.min <= quantity.max, `${label} quantity.min must be <= quantity.max`);
}

function assertResourceReference(resource, label, runtimeItemIds) {
  assert.ok(resourceKinds.has(resource.kind), `${label} has an invalid kind`);
  if (resource.kind === "GOLD") {
    assert.equal(resource.id, undefined, `${label} GOLD must not include id`);
    assert.equal(resource.symbol, undefined, `${label} GOLD must not include symbol`);
    return;
  }
  if (resource.kind === "EUM") {
    assert.equal(resource.id, undefined, `${label} EUM must not include id`);
    assert.equal(typeof resource.symbol, "string", `${label} EUM must include symbol`);
    assert.ok(runtimeEumSymbols.has(resource.symbol), `${label} references an invalid 음 symbol ${resource.symbol}`);
    return;
  }
  assert.equal(resource.symbol, undefined, `${label} ITEM must not include symbol`);
  assert.equal(typeof resource.id, "string", `${label} ITEM must include id`);
  assert.ok(runtimeItemIds.has(resource.id), `${label} references an invalid item ${resource.id}`);
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
const craftingRecipes = readJson("client/src/game/data/crafting-recipes.json");
const consumables = readJson("client/src/game/data/consumables.json");
const materials = readJson("client/src/game/data/materials.json");
const transformationIns = readJson("client/src/game/data/transformation-ins.json");

for (const [file, data] of [
  ["player.json", player],
  ["weapons.json", weapons],
  ["gyeol.json", gyeol],
  ["monsters.json", monsters],
  ["crafting-recipes.json", craftingRecipes],
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
const monsterIndex = indexById(monsters, "monsters");
const runtimeItemIds = new Set([
  ...jahyeongIndex.keys(),
  ...letterIndex.keys(),
  ...mantraIndex.keys(),
  ...incantationIndex.keys(),
  ...consumableIndex.keys(),
  ...materialIndex.keys(),
  ...inIndex.keys(),
]);
const runtimeItemKinds = new Set();

for (const data of [gyeol, consumables, materials, transformationIns]) {
  for (const entry of flattenValues(data)) {
    if (entry.path.at(-1) === "kind" && typeof entry.value === "string") {
      runtimeItemKinds.add(entry.value);
    }
  }
}

const typeSource = readText("client/src/game/types/data.ts");
for (const requiredTerm of [
  "export interface CharacterVisualState",
  "orientationRadians: number",
  "modelKey: string",
  "rigKey: string",
  'animationClipKey: "idle" | "walk" | "attack" | "hit" | "death"',
  "weaponModelKey?: string",
  "materialVariantKey?: string",
  "auraEffectKey?: string",
]) {
  assert.ok(typeSource.includes(requiredTerm), `3D character visual contract includes ${requiredTerm}`);
}
for (const staleTerm of [
  "Direction8",
  "SpriteSheetAsset",
  "weaponSpriteKey",
  "armorSpriteKey",
  "frameWidth",
  "frameHeight",
  "framesPerAction",
]) {
  assert.ok(!typeSource.includes(staleTerm), `runtime types must not include stale 2D visual term ${staleTerm}`);
}
assert.equal(typeof player.visual.orientationRadians, "number", "player visual orientationRadians");
assert.equal(typeof player.visual.modelKey, "string", "player visual modelKey");
assert.equal(typeof player.visual.rigKey, "string", "player visual rigKey");
assert.ok(
  new Set(["idle", "walk", "attack", "hit", "death"]).has(player.visual.animationClipKey),
  "player visual animationClipKey",
);
for (const staleKey of ["direction", "action", "weaponSpriteKey", "armorSpriteKey"]) {
  assert.equal(player.visual[staleKey], undefined, `player visual must not include ${staleKey}`);
}

const worldContentPath = "client/src/game/data/world-content.json";
assert.ok(existsSync(join(root, worldContentPath)), "validated WorldContent fixture must exist");
const worldContent = readJson(worldContentPath);
assertNoNulls("world-content.json", worldContent);
assert.equal(worldContent.schemaVersion, "world-content.v1", "WorldContent schemaVersion");
assert.ok(Array.isArray(worldContent.maps), "WorldContent maps must be an array");
assert.ok(Array.isArray(worldContent.portalLinks), "WorldContent portalLinks must be an array");
const worldMapIndex = indexById(worldContent.maps, "WorldContent maps");
const portalLinkIndex = indexById(worldContent.portalLinks, "WorldContent portalLinks");
assert.equal(worldMapIndex.size, 4, "WorldContent must include Arcadia and exactly three gameplay maps");
const expectedWorldMaps = new Map([
  ["arcadia", { name: "아르카디아", kind: "SHARED_HUB" }],
  ["dawn_field", { name: "새벽 들판", kind: "COOPERATIVE_INSTANCE" }],
  ["blackheart_mine", { name: "흑심 채굴장", kind: "COOPERATIVE_INSTANCE" }],
  ["pencil_knight_boss_room", { name: "몽당연필 기사단장 보스방", kind: "COOPERATIVE_INSTANCE" }],
]);
for (const [id, expected] of expectedWorldMaps) {
  const map = worldMapIndex.get(id);
  assert.ok(map, `WorldContent includes ${id}`);
  assert.equal(map.name, expected.name, `${id} name`);
  assert.equal(map.kind, expected.kind, `${id} kind`);
  assertPositiveInteger(map.maxPlayers, `${id} maxPlayers`);
  assert.equal(typeof map.spawnPointId, "string", `${id} spawnPointId`);
  assert.ok(Array.isArray(map.entryPortalLinkIds) && map.entryPortalLinkIds.length > 0, `${id} entry portal links`);
  assert.ok(Array.isArray(map.exitPortalLinkIds) && map.exitPortalLinkIds.length > 0, `${id} exit portal links`);
  if (map.kind === "COOPERATIVE_INSTANCE") {
    assert.equal(map.maxPlayers, 4, `${id} cooperative maxPlayers`);
  }
}
assert.equal(
  worldContent.maps.filter((map) => map.kind === "SHARED_HUB").length,
  1,
  "Arcadia must be the only shared hub",
);
assert.equal(
  worldContent.maps.filter((map) => map.kind === "COOPERATIVE_INSTANCE").length,
  3,
  "all three gameplay maps must be cooperative instances",
);
for (const portal of portalLinkIndex.values()) {
  const fromMap = worldMapIndex.get(portal.fromMapId);
  const toMap = worldMapIndex.get(portal.toMapId);
  assert.ok(fromMap, `${portal.id} fromMapId must reference a world map`);
  assert.ok(toMap, `${portal.id} toMapId must reference a world map`);
  assert.equal(portal.toSpawnPointId, toMap.spawnPointId, `${portal.id} target spawn point`);
  assert.ok(fromMap.exitPortalLinkIds.includes(portal.id), `${portal.id} must be an exit link of ${fromMap.id}`);
  assert.ok(toMap.entryPortalLinkIds.includes(portal.id), `${portal.id} must be an entry link of ${toMap.id}`);
}
for (const map of worldMapIndex.values()) {
  for (const id of map.entryPortalLinkIds) {
    const portal = portalLinkIndex.get(id);
    assert.ok(portal, `${map.id} references unknown entry portal link ${id}`);
    assert.equal(portal.toMapId, map.id, `${id} must enter ${map.id}`);
  }
  for (const id of map.exitPortalLinkIds) {
    const portal = portalLinkIndex.get(id);
    assert.ok(portal, `${map.id} references unknown exit portal link ${id}`);
    assert.equal(portal.fromMapId, map.id, `${id} must exit ${map.id}`);
  }
}

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

const averageWeaponRoll = (mvpWeapon.minDamage + mvpWeapon.maxDamage) / 2;
const averageBaseDamage =
  (averageWeaponRoll + player.combatProfile.attackBonusFromStr) * mvpWeapon.damageMultiplier;
const expectedCritMultiplier =
  1 + player.combatProfile.baseCritChance * (player.combatProfile.baseCritMultiplier - 1);
const expectedPreDefenseDamage = averageBaseDamage * expectedCritMultiplier;

assert.equal(Number(expectedPreDefenseDamage.toFixed(3)), 41.615, "MVP expected pre-defense damage");

const combatDocumentRequirements = {
  "plan/03_Item_and_Equipment.md": [
    "`24~32`는 무기 공격력 굴림과 STR 보너스를 더한 뒤, 무기 피해 계수를 적용하기 전 범위",
    "`34.8~46.4`는 대검 피해 계수를 적용한 비치명타 방어력 계산 전 범위",
    "평균 기대 피해 `41.615`",
  ],
  "plan/13_Monster_AI_Design.md": [
    "`24~32`는 무기 공격력 굴림과 STR 보너스를 더한 피해 계수 적용 전 범위",
    "`34.8~46.4`는 비치명타 방어력 계산 전 범위",
    "평균 기대 피해 `41.615`",
  ],
  "plan/16_Character_and_Leveling.md": [
    "대검 `24~32`는 무기 공격력 굴림과 STR 보너스를 더한 피해 계수 적용 전 범위",
    "비치명타 방어력 계산 전 범위는 `34.8~46.4`",
    "평균 기대 피해는 방어력 적용 전 `41.615`",
  ],
  "plan/17_MVP_Development_Roadmap.md": [
    "대검의 `24~32`는 무기 공격력 굴림과 STR 보너스를 더한 피해 계수 적용 전 범위",
    "비치명타 방어력 계산 전 범위는 `34.8~46.4`",
    "평균 기대 피해 `41.615`",
  ],
};
for (const [path, requiredPhrases] of Object.entries(combatDocumentRequirements)) {
  const source = readText(path);
  for (const phrase of requiredPhrases) {
    assert.ok(source.includes(phrase), `${path} contains combat baseline: ${phrase}`);
  }
}

const worldStructureDocumentPaths = [
  "progress.md",
  "plan/01_Game_Overview.md",
  "plan/04_Technical_Architecture.md",
  "plan/14_Story_and_World_Lore.md",
  "plan/17_MVP_Development_Roadmap.md",
  "docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md",
];
const requiredWorldStructureTerms = ["공유 마을 허브", "협동 인스턴스", "포털"];
const retiredWorldStructureTerms = [
  "공유 필드",
  "공유 월드",
  "심리스 월드",
  "심리스 오픈월드",
  "shared field",
  "shared channel",
  "seamless world",
];

for (const path of worldStructureDocumentPaths) {
  const source = readText(path);
  for (const term of requiredWorldStructureTerms) {
    assert.ok(source.includes(term), `${path} must define ${term}`);
  }
  for (const term of retiredWorldStructureTerms) {
    assert.ok(!source.includes(term), `${path} must not promise ${term}`);
  }
}

const finalContractPlanPaths = [
  "plan/04_Technical_Architecture.md",
  "plan/06_Art_Direction.md",
  "plan/08_Expanded_Systems.md",
  "plan/13_Monster_AI_Design.md",
  "plan/16_Character_and_Leveling.md",
  "plan/17_MVP_Development_Roadmap.md",
];
for (const path of finalContractPlanPaths) {
  const source = readText(path);
  for (const term of ["`아르카디아`만 `공유 마을 허브`", "`음` 파밍", "`포털`", "`협동 인스턴스`"]) {
    assert.ok(source.includes(term), `${path} must carry the final hub-instance and 음 contract: ${term}`);
  }
  for (const staleTerm of ["공유 월드", "공유 필드", "심리스 월드", "한글 파편"]) {
    assert.ok(!source.includes(staleTerm), `${path} must not contain stale contract term ${staleTerm}`);
  }
}

const architectureSource = readText("plan/04_Technical_Architecture.md");
for (const staleTerm of [
  "Direction8",
  "SpriteSheetAsset",
  "weaponSpriteKey",
  "armorSpriteKey",
  "frameWidth",
  "frameHeight",
  "framesPerAction",
]) {
  assert.ok(!architectureSource.includes(staleTerm), `plan/04 must not include stale 2D visual term ${staleTerm}`);
}

const dataReadmeSource = readText("data/design/README.md");
const verticalSliceSpecSource = readText("docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md");
const itemEquipmentPlanSource = readText("plan/03_Item_and_Equipment.md");
const storyPlanSource = readText("plan/14_Story_and_World_Lore.md");
const mvpRoadmapSource = readText("plan/17_MVP_Development_Roadmap.md");
assert.ok(
  itemEquipmentPlanSource.includes("가중치로 뽑고"),
  "plan/03 must describe grouped weighted 음 draws",
);
assert.ok(
  itemEquipmentPlanSource.includes("중복 없이"),
  "plan/03 must describe grouped 음 draws without replacement",
);
assert.ok(
  !itemEquipmentPlanSource.includes("각각 확률 `1/3`"),
  "plan/03 must not describe independent 1/3 음 rolls",
);
assert.ok(
  storyPlanSource.includes("인벤토리의 수집 재화 분류는 `음`"),
  "plan/14 must use 음 as the player inventory resource category",
);
assert.ok(
  verticalSliceSpecSource.includes("중복 없이"),
  "vertical-slice spec must describe grouped 음 draws without replacement",
);
for (const [path, source] of [
  ["plan/04_Technical_Architecture.md", architectureSource],
  ["plan/17_MVP_Development_Roadmap.md", mvpRoadmapSource],
]) {
  assert.ok(
    source.includes("각 선택 뒤에는 뽑힌 기호를 남은 가중치 풀에서 제거"),
    `${path} must state that grouped 음 draws remove the selected symbol from the remaining weighted pool`,
  );
}
for (const [path, source] of [
  ["plan/04_Technical_Architecture.md", architectureSource],
  ["data/design/README.md", dataReadmeSource],
  ["docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md", verticalSliceSpecSource],
]) {
  for (const term of ["`client/src/game/data`", "전환용 fixture", "`shared/content`", "서버 정본", "생성"]) {
    assert.ok(source.includes(term), `${path} must define server/shared content ownership: ${term}`);
  }
}
const progressSource = readText("progress.md");
for (const term of ["명시적 드랍 계약", "그룹 음 보상", "제작 레시피가 이미 존재"]) {
  assert.ok(progressSource.includes(term), `progress.md must hand off the current drop contract: ${term}`);
}
for (const term of ["그룹 음 보상", "제작 레시피", "이미 존재"]) {
  assert.ok(verticalSliceSpecSource.includes(term), `vertical-slice handoff must describe current content: ${term}`);
}

const monsterAiDesignSource = readText("plan/13_Monster_AI_Design.md");
assert.ok(!monsterAiDesignSource.includes("약 `4~5회` 타격"), "plan/13 has no fixed slime kill-count claim");
assert.ok(!monsterAiDesignSource.includes("약 `10~12회` 타격"), "plan/13 has no fixed elite kill-count claim");
assert.ok(
  monsterAiDesignSource.includes("첫 서버 전투 테스트의 관측 처치 시간을 바탕으로 플레이테스트 보정한다"),
  "plan/13 requires boss playtest calibration",
);

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
const expectedEumGroups = new Map([
  ["monster_ink_slime_001", { draws: { min: 1, max: 2 }, symbols: ["ㄱ", "ㅏ", "ㅇ"], allowDuplicateSymbols: false }],
  ["monster_typo_sprite_001", { draws: { min: 2, max: 4 }, symbols: ["ㅎ", "ㅘ", "ㅂ", "ㅜ", "ㄹ"], allowDuplicateSymbols: false }],
  ["boss_pencil_knight_commander_001", { draws: { min: 3, max: 5 }, symbols: ["ㅎ", "ㅘ", "ㅂ", "ㅜ", "ㄹ", "ㄷ", "ㅏ", "ㅇ"], allowDuplicateSymbols: false }],
]);
for (const monster of monsters) {
  assert.ok(Array.isArray(monster.drops.entries), `${monster.id} drops.entries must be an array`);
  for (const [index, entry] of monster.drops.entries.entries()) {
    const label = `${monster.id} drop ${index}`;
    assert.notEqual(entry.kind, "EUM", `${label} must use the grouped eumRollGroup contract`);
    assertProbability(entry.probability, label);
    assertQuantityRange(entry.quantity, label);
    assert.equal(typeof entry.guaranteed, "boolean", `${label} guaranteed must be a boolean`);
    if (entry.guaranteed) {
      assert.equal(entry.probability, 1, `${label} guaranteed drops must have probability 1`);
    }
    assertResourceReference(entry, label, runtimeItemIds);
  }
  const expectedGroup = expectedEumGroups.get(monster.id);
  assert.ok(expectedGroup, `${monster.id} must have an expected 음 group`);
  const group = monster.drops.eumRollGroup;
  assert.ok(group && typeof group === "object", `${monster.id} drops.eumRollGroup`);
  assert.deepEqual(group.draws, expectedGroup.draws, `${monster.id} grouped 음 draws`);
  assert.equal(group.allowDuplicateSymbols, expectedGroup.allowDuplicateSymbols, `${monster.id} grouped 음 replacement policy`);
  assert.ok(Array.isArray(group.entries), `${monster.id} eumRollGroup.entries`);
  assert.deepEqual(
    group.entries.map((entry) => entry.symbol),
    expectedGroup.symbols,
    `${monster.id} grouped 음 symbol pool`,
  );
  for (const [index, entry] of group.entries.entries()) {
    const label = `${monster.id} eumRollGroup entry ${index}`;
    assert.ok(runtimeEumSymbols.has(entry.symbol), `${label} symbol`);
    assert.equal(typeof entry.weight, "number", `${label} weight`);
    assert.ok(entry.weight > 0, `${label} weight must be positive`);
    assertQuantityRange(entry.quantity, label);
  }
  if (monster.id === "monster_ink_slime_001") {
    assert.deepEqual(group.entries.map((entry) => entry.weight), [1, 1, 1], "ink slime grouped 음 weights");
  }
}

const recipeIds = new Set();
for (const recipe of craftingRecipes) {
  assert.equal(typeof recipe.id, "string", "crafting recipe must include id");
  assert.ok(!recipeIds.has(recipe.id), `crafting recipes has duplicate id ${recipe.id}`);
  recipeIds.add(recipe.id);
  assert.ok(Array.isArray(recipe.inputs) && recipe.inputs.length > 0, `${recipe.id} must have inputs`);
  for (const [index, input] of recipe.inputs.entries()) {
    const label = `${recipe.id} input ${index}`;
    assertPositiveInteger(input.quantity, `${label} quantity`);
    assertResourceReference(input, label, runtimeItemIds);
  }
  assert.ok(
    Number.isInteger(recipe.goldCost) && recipe.goldCost >= 0,
    `${recipe.id} goldCost must be a non-negative integer`,
  );
  assert.ok(Array.isArray(recipe.catalystItemIds), `${recipe.id} catalystItemIds must be an array`);
  for (const id of recipe.catalystItemIds) {
    assert.ok(runtimeItemIds.has(id), `${recipe.id} catalyst ${id} must reference a runtime item`);
  }
  assert.deepEqual(recipe.allowedSupportItemIds, [], `${recipe.id} allowedSupportItemIds`);
  assert.equal(recipe.successRate, 1, `${recipe.id} successRate must be 1 (first slice crafting cannot fail)`);
  assertProbability(recipe.successRate, `${recipe.id} successRate`);
  assert.equal(typeof recipe.successOutputId, "string", `${recipe.id} successOutputId must be a string`);
  assert.ok(runtimeItemIds.has(recipe.successOutputId), `${recipe.id} successOutputId must reference a runtime item`);
  assert.ok(recipe.failure && typeof recipe.failure === "object", `${recipe.id} failure must be an object`);
  assert.equal(typeof recipe.failure.consumeInputs, "boolean", `${recipe.id} failure.consumeInputs must be a boolean`);
  if (recipe.failure.outputId !== undefined) {
    assert.equal(typeof recipe.failure.outputId, "string", `${recipe.id} failure.outputId must be a string`);
    assert.ok(runtimeItemIds.has(recipe.failure.outputId), `${recipe.id} failure.outputId must reference a runtime item`);
  }
}

assert.deepEqual(
  craftingRecipes.slice(0, 2).map((recipe) => ({
    id: recipe.id,
    successRate: recipe.successRate,
    successOutputId: recipe.successOutputId,
    goldCost: recipe.goldCost,
    catalystItemIds: recipe.catalystItemIds,
  })),
  [
    {
      id: "recipe_jahyeong_hwa_001",
      successRate: 1,
      successOutputId: "jahyeong_hwa_001",
      goldCost: 0,
      catalystItemIds: [],
    },
    {
      id: "recipe_letter_hwa_001",
      successRate: 1,
      successOutputId: "letter_gyeol_hwa_001",
      goldCost: 20,
      catalystItemIds: ["stone_inscribe_mantra_001"],
    },
  ],
  "first two recipes retain approved slice contract: eum + stone + gold, 100% success",
);

function expectedDamageAfterDefense(defense, incomingDamageMultiplier = 1) {
  return expectedPreDefenseDamage * (100 / (100 + defense)) * incomingDamageMultiplier;
}

const slime = monsterIndex.get("monster_ink_slime_001");
const elite = monsterIndex.get("monster_typo_sprite_001");
const boss = monsterIndex.get("boss_pencil_knight_commander_001");
assert.equal(Number(expectedDamageAfterDefense(slime.baseDefense).toFixed(3)), 41.615, "slime expected post-defense damage");
assert.equal(Number(expectedDamageAfterDefense(elite.baseDefense).toFixed(3)), 37.832, "elite expected post-defense damage");
assert.equal(
  Number(expectedDamageAfterDefense(boss.baseDefense, boss.bossStateModifiers.incomingDamageMultiplier).toFixed(3)),
  13.005,
  "boss normal-phase expected post-defense damage",
);

console.log("runtime data OK");
