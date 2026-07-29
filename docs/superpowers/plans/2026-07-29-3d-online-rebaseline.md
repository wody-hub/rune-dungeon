# 3D Online Rebaseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authoritative Rune Dungeon documents and runtime content contract consistent with the approved online fixed-isometric 3D vertical slice.

**Architecture:** Keep the existing gameplay rules and content IDs, but replace the 2D local-only implementation baseline with a Svelte/Threlte client, Rust WebSocket server, and server-authoritative game state. Evolve the JSON contract so drops and crafting are explicit server-resolved rules, while the browser only displays replicated state.

**Tech Stack:** Markdown, TypeScript runtime types, JSON runtime content, Node.js validation, future Svelte + Three.js/Threlte client, Rust + WebSocket server.

## Global Constraints

- Player-facing text calls all consonant and vowel collection resources `음`; technical classifications remain internal.
- Camera is fixed-isometric 3D with constrained zoom, not free camera.
- Guest nickname sessions are the first online access mechanism; OAuth is excluded.
- The server owns identity, position, combat, drops, inventory, crafting, transformation, and persistence.
- Do not copy code or assets from `/Users/j.jaeyo/Project/ETC/OpenMMO`; use it only as an architectural reference.
- Preserve the no-mana, single-target, independent no-cooldown incantation policy and 20% proc cap.

---

### Task 1: Replace the authoritative 2D/local technology baseline

**Files:**
- Modify: `progress.md`
- Modify: `plan/01_Game_Overview.md`
- Modify: `plan/04_Technical_Architecture.md`
- Modify: `plan/06_Art_Direction.md`
- Modify: `plan/16_Character_and_Leveling.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md`
- Produces: one consistent architecture, visual, and MVP definition for all later implementation plans.

- [ ] **Step 1: Write a failing terminology/architecture guard**

Add checks to `scripts/validate-runtime-data.mjs` that read the six source documents and fail if they describe the *first implementation* as Phaser, a local-only client, a 2D sprite baseline, Java/Spring as the selected server, or 3D/multiplayer as deferred scope.

```js
const sourceDocuments = [
  "progress.md",
  "plan/01_Game_Overview.md",
  "plan/04_Technical_Architecture.md",
  "plan/06_Art_Direction.md",
  "plan/16_Character_and_Leveling.md",
  "plan/17_MVP_Development_Roadmap.md",
].map(readText).join("\n");

for (const stalePhrase of [
  "Game Engine:** `Phaser 3`",
  "첫 구현은 서버 없이",
  "2D 스프라이트 기반",
  "3D 카메라와 3D 캐릭터 파이프라인",
]) {
  assert.ok(!sourceDocuments.includes(stalePhrase), `stale implementation baseline: ${stalePhrase}`);
}
```

- [ ] **Step 2: Run the guard to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure naming an existing Phaser, local-only, 2D-sprite, or deferred-3D phrase.

- [ ] **Step 3: Rewrite the source documents from the approved design**

Apply these exact decisions consistently:

```text
Client: Svelte + TypeScript + Vite + Three.js/Threlte
Server: Rust + WebSocket; server-authoritative game state
View: constrained fixed-isometric 3D
Access: guest nickname + server-issued player ID
First world: shared town, field, compact dungeon, boss
Deferred: OAuth, world generation, housing, trading, party/guild, AI agents,
          auto/offline rewards, and production economy
```

Retain the existing Arcardia locations, monsters, 결 loop, and manual combat loop.
Replace the old Phaser scene list with client rendering/UI responsibilities and
server world/session/combat responsibilities. State that localStorage may only
store non-authoritative client preferences, not game progress.

- [ ] **Step 4: Run the guard and runtime validation**

Run: `node scripts/validate-runtime-data.mjs`

Expected: `runtime data OK`.

- [ ] **Step 5: Commit the baseline rewrite**

```bash
git add progress.md plan/01_Game_Overview.md plan/04_Technical_Architecture.md \
  plan/06_Art_Direction.md plan/16_Character_and_Leveling.md \
  plan/17_MVP_Development_Roadmap.md scripts/validate-runtime-data.mjs
git commit -m "docs: rebase plans on 3d online architecture"
```

### Task 2: Migrate the player-facing resource name to 음

**Files:**
- Modify: `progress.md`
- Modify: `plan/01_Game_Overview.md`
- Modify: `plan/02_System_Hangul_Rune.md`
- Modify: `plan/03_Item_and_Equipment.md`
- Modify: `plan/04_Technical_Architecture.md`
- Modify: `plan/05_Educational_System.md`
- Modify: `plan/12_Incantation_Skill_System.md`
- Modify: `plan/13_Monster_AI_Design.md`
- Modify: `plan/14_Story_and_World_Lore.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`
- Modify: `client/src/game/data/*.json`
- Modify: `client/src/game/types/data.ts`
- Modify: `scripts/validate-runtime-data.mjs`

**Interfaces:**
- Consumes: approved `Player-Facing Terminology` section in the design spec.
- Produces: `eum`-named display types and copy without changing existing stable content IDs.

- [ ] **Step 1: Add a failing display-name test**

Add a runtime data field and assertion that makes the player-facing resource name explicit.

```ts
export interface EumStack {
  symbol: string;
  quantity: number;
}

export interface PlayerInventory {
  gold: number;
  eum: EumStack[];
  items: string[];
}
```

```js
assert.equal(player.inventory.resourceLabel, "음", "player-facing fragment resource name");
```

- [ ] **Step 2: Run the validator to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure because `resourceLabel` and the `eum` inventory representation do not yet exist.

- [ ] **Step 3: Implement the terminology migration**

Use `음` in all player-facing prose, reward labels, UI examples, and JSON display
metadata. Preserve `ㄱ`, `ㅏ`, and other symbols as technical values; preserve
stable IDs such as `jahyeong_hwa_001` and the internal `fragments` wire field
until the Rust protocol plan explicitly renames them. Convert the TypeScript
player-facing inventory contract to `EumStack[]`, and use a small compatibility
loader if legacy JSON remains necessary during the transition.

- [ ] **Step 4: Run copy and data validation**

Run:

```bash
rg -n '자모 파편|자음/모음 파편' plan progress.md client/src/game/data
node scripts/validate-runtime-data.mjs
```

Expected: no player-facing source-document matches except an explicitly labeled
technical-language explanation; validator prints `runtime data OK`.

- [ ] **Step 5: Commit the terminology migration**

```bash
git add progress.md plan client/src/game/data client/src/game/types/data.ts scripts/validate-runtime-data.mjs
git commit -m "docs: rename collection resource to eum"
```

### Task 3: Make server-resolved drops and crafting explicit

**Files:**
- Modify: `client/src/game/types/data.ts`
- Modify: `client/src/game/data/monsters.json`
- Create: `client/src/game/data/crafting-recipes.json`
- Modify: `scripts/validate-runtime-data.mjs`
- Modify: `data/design/gyeol-balance.json`
- Modify: `data/design/README.md`
- Modify: `plan/03_Item_and_Equipment.md`
- Modify: `plan/04_Technical_Architecture.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`

**Interfaces:**
- Consumes: stable item IDs in runtime JSON.
- Produces: server-ready `DropEntry` and `CraftingRecipe` contracts and validation.

- [ ] **Step 1: Write failing schema validation for probability and quantities**

Add a JSON loader for `crafting-recipes.json` and assert each drop entry has a
probability in `(0, 1]`, an integer quantity range with `min <= max`, and a
referenced item or 음 symbol.

```ts
export interface DropEntry {
  kind: "GOLD" | "EUM" | "ITEM";
  id?: string;
  symbol?: string;
  probability: number;
  quantity: { min: number; max: number };
  guaranteed: boolean;
}

export interface CraftingRecipe {
  id: string;
  inputs: Array<{ kind: "GOLD" | "EUM" | "ITEM"; id?: string; symbol?: string; quantity: number }>;
  successRate: number;
  successOutputId: string;
  failure: { consumeInputs: boolean; outputId?: string };
}
```

- [ ] **Step 2: Run validation to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure because current monster drops are list-only and
`crafting-recipes.json` is absent.

- [ ] **Step 3: Add the minimum explicit content**

Create exactly these first-slice recipes:

```json
[
  {
    "id": "recipe_jahyeong_hwa_001",
    "inputs": [
      { "kind": "EUM", "symbol": "ㅎ", "quantity": 1 },
      { "kind": "EUM", "symbol": "ㅘ", "quantity": 1 }
    ],
    "successRate": 1,
    "successOutputId": "jahyeong_hwa_001",
    "failure": { "consumeInputs": false }
  },
  {
    "id": "recipe_letter_hwa_001",
    "inputs": [
      { "kind": "ITEM", "id": "jahyeong_hwa_001", "quantity": 1 }
    ],
    "successRate": 0.95,
    "successOutputId": "letter_gyeol_hwa_001",
    "failure": { "consumeInputs": true }
  }
]
```

Replace each monster's `gold`, `fragments`, and `items` lists with `entries`.
For the slime, include one guaranteed gold entry of quantity 5–10 and three
equally likely one-unit 음 entries for `ㄱ`, `ㅏ`, and `ㅇ`; use the same explicit
format for elite and boss drops while retaining their existing reward identities.

- [ ] **Step 4: Run validation and reference checks**

Run: `node scripts/validate-runtime-data.mjs`

Expected: `runtime data OK` and no invalid item, symbol, probability, or recipe
output reference.

- [ ] **Step 5: Commit the server-rule contract**

```bash
git add client/src/game/types/data.ts client/src/game/data/monsters.json \
  client/src/game/data/crafting-recipes.json scripts/validate-runtime-data.mjs \
  data/design plan/03_Item_and_Equipment.md plan/04_Technical_Architecture.md \
  plan/17_MVP_Development_Roadmap.md
git commit -m "feat: define server-ready drops and crafting"
```

### Task 4: Correct combat-document arithmetic and assert it in validation

**Files:**
- Modify: `plan/03_Item_and_Equipment.md`
- Modify: `plan/13_Monster_AI_Design.md`
- Modify: `plan/16_Character_and_Leveling.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`
- Modify: `scripts/validate-runtime-data.mjs`

**Interfaces:**
- Consumes: `player.json`, `weapons.json`, and `monsters.json`.
- Produces: an executable expected-damage calculation that matches the documented formula.

- [ ] **Step 1: Add failing expected-damage assertions**

```js
const averageWeaponRoll = (mvpWeapon.minDamage + mvpWeapon.maxDamage) / 2;
const averageBaseDamage = (averageWeaponRoll + player.combatProfile.attackBonusFromStr) * mvpWeapon.damageMultiplier;
const expectedCritMultiplier =
  1 + player.combatProfile.baseCritChance * (player.combatProfile.baseCritMultiplier - 1);
const expectedPreDefenseDamage = averageBaseDamage * expectedCritMultiplier;

assert.equal(Number(expectedPreDefenseDamage.toFixed(3)), 41.615, "MVP expected pre-defense damage");
```

- [ ] **Step 2: Run validation to verify current explanatory prose is stale**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure after adding document-text checks because `plan/13` still calls
the pre-multiplier 24–32 range the effective hit range.

- [ ] **Step 3: Correct the documents without inventing untested balance targets**

Define `24–32` everywhere as the pre-multiplier weapon-plus-STR range. Define
`34.8–46.4` as the non-critical greatsword range before enemy defense. Replace
the slime and elite fixed hit-count claims with formula-derived expected damage,
and describe the boss as requiring a playtest-calibrated weakness/groggy cycle.
Keep current HP values until the first server combat test provides observed
time-to-kill data.

- [ ] **Step 4: Run the final arithmetic and data validation**

Run: `node scripts/validate-runtime-data.mjs`

Expected: `runtime data OK`.

- [ ] **Step 5: Commit the corrected combat baseline**

```bash
git add plan/03_Item_and_Equipment.md plan/13_Monster_AI_Design.md \
  plan/16_Character_and_Leveling.md plan/17_MVP_Development_Roadmap.md \
  scripts/validate-runtime-data.mjs
git commit -m "docs: align combat balance with damage formula"
```

### Task 5: Perform the authoritative consistency gate

**Files:**
- Modify: `progress.md`
- Modify: `docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md`

**Interfaces:**
- Consumes: the commits from Tasks 1–4.
- Produces: an accurate handoff stating the selected 3D online architecture and remaining implementation work.

- [ ] **Step 1: Add final consistency checks**

Check that every source document names the same client/server architecture,
uses `음` for player-facing collection copy, and does not promise local-only
or 2D-only implementation.

- [ ] **Step 2: Run the complete check suite**

Run:

```bash
git diff --check
node scripts/validate-runtime-data.mjs
rg -n 'Phaser 3|서버 없이|2D 스프라이트 기반|자모 파편|자음/모음 파편' progress.md plan client/src/game/data
```

Expected: no diff errors, `runtime data OK`, and only explicitly labeled historic
or technical references in the final search results.

- [ ] **Step 3: Update the handoff**

Set `progress.md` to state that the next implementation plan is the Rust server
and Svelte/Threlte client foundation, with the OpenMMO path as architecture-only
reference. Remove the Vite + Phaser next-session recommendation.

- [ ] **Step 4: Commit the consistency gate**

```bash
git add progress.md docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md
git commit -m "docs: finalize 3d online design baseline"
```

### Task 6: Record the hub-and-instance world structure

**Files:**
- Modify: `progress.md`
- Modify: `plan/01_Game_Overview.md`
- Modify: `plan/04_Technical_Architecture.md`
- Modify: `plan/14_Story_and_World_Lore.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`
- Modify: `docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md`

**Interfaces:**
- Consumes: the approved 3D online architecture and portal transition rules.
- Produces: a world model in which the town is the only shared hub and every
  gameplay area is an independently created cooperative instance.

- [ ] **Step 1: Add a failing world-structure guard**

Add validation that fails if an authoritative document calls the first-slice
field a shared world, promises a seamless world, or lacks all three terms:
`공유 마을 허브`, `협동 인스턴스`, and `포털`.

- [ ] **Step 2: Run the guard to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure because the current first-slice documents still describe a
shared field rather than an instance.

- [ ] **Step 3: Rewrite the world model consistently**

Apply these exact rules:

```text
공유 공간: 아르카디아 마을 허브만 공유한다.
게임플레이: 새벽 들판, 흑심 채굴장, 보스방은 입장 시 생성되는 협동 인스턴스다.
입장: 같은 파티 또는 초대된 게스트가 같은 인스턴스에 들어간다.
이동: 심리스 월드가 아니라 마을·구역 포털과 입장 트리거를 통해 다음 구역으로 이동한다.
확장: 이후 지역도 각 지역 허브와 필드/던전 인스턴스를 포털 네트워크로 연결한다.
```

Do not describe the first-slice field as a shared channel or a seamless open
field. Retain the existing Arcadia-to-field-to-dungeon-to-boss route.

- [ ] **Step 4: Run the world-structure and runtime checks**

Run:

```bash
node scripts/validate-runtime-data.mjs
rg -n '공유 필드|심리스 월드|shared field' progress.md plan/01_Game_Overview.md \
  plan/04_Technical_Architecture.md plan/14_Story_and_World_Lore.md \
  plan/17_MVP_Development_Roadmap.md docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md
```

Expected: `runtime data OK`; the search returns no active first-slice shared
field or seamless-world promise.

- [ ] **Step 5: Commit the recorded world structure**

```bash
git add progress.md plan/01_Game_Overview.md plan/04_Technical_Architecture.md \
  plan/14_Story_and_World_Lore.md plan/17_MVP_Development_Roadmap.md \
  docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md \
  scripts/validate-runtime-data.mjs docs/superpowers/plans/2026-07-29-3d-online-rebaseline.md
git commit -m "docs: define hub and instance world structure"
```

### Task 7: Resolve final cross-document and content-contract findings

**Files:**
- Modify: `progress.md`
- Modify: `plan/04_Technical_Architecture.md`
- Modify: `plan/06_Art_Direction.md`
- Modify: `plan/08_Expanded_Systems.md`
- Modify: `plan/13_Monster_AI_Design.md`
- Modify: `plan/16_Character_and_Leveling.md`
- Modify: `plan/17_MVP_Development_Roadmap.md`
- Modify: `data/design/README.md`
- Modify: `docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md`
- Modify: `client/src/game/types/data.ts`
- Modify: `client/src/game/data/player.json`
- Modify: `client/src/game/data/monsters.json`
- Modify: `client/src/game/data/crafting-recipes.json`
- Create: `client/src/game/data/world-content.json`
- Modify: `scripts/validate-runtime-data.mjs`

**Interfaces:**
- Consumes: the approved 3D online, `음`, hub-and-instance, drop, crafting, and
  combat decisions.
- Produces: complete runtime contracts for 3D visual state and world instances,
  grouped 음 rewards, explicit crafting policy, and per-document regression guards.

- [ ] **Step 1: Add failing assertions for every final-review defect**

Add validation that fails when any of these is absent or stale: 3D model/rig/
clip visual references; a validated `WorldContent` JSON file; grouped 1–2 and
2–4 음 rewards; explicit zero-valued crafting gold/catalyst/support policy;
instance wording in every affected plan; `음` in player-facing resource copy;
server/shared content ownership; current drop-contract handoff; and elite/boss
expected-damage assertions.

- [ ] **Step 2: Run the validator to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure identifying a missing final-contract requirement.

- [ ] **Step 3: Replace 2D visual state with a 3D render contract**

Use this public shape and migrate `player.json` to it:

```ts
interface CharacterVisualState {
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
```

Remove `Direction8`, spritesheet/frame-sheet contracts, `weaponSpriteKey`, and
2D frame references from active runtime types and architecture prose.

- [ ] **Step 4: Add a validated portal-instance world contract**

Create `world-content.json` with a shared Arcadia hub and exactly three
cooperative instance maps: Dawn Field, Blackheart Mine, and Pencil Knight boss
room. Each map must declare `id`, `kind`, `maxPlayers`, `spawnPointId`, and
entry/exit portal links. Arcadia has kind `SHARED_HUB`; the three gameplay maps
have kind `COOPERATIVE_INSTANCE`; every instance has `maxPlayers: 4`.

- [ ] **Step 5: Encode grouped 음 rewards and explicit crafting policy**

Replace independent one-unit monster 음 entries with an `eumRollGroup` contract:

```ts
interface EumRollGroup {
  draws: { min: number; max: number };
  allowDuplicateSymbols: boolean;
  entries: Array<{ symbol: string; weight: number; quantity: { min: number; max: number } }>;
}
```

The slime group draws `1–2`; the elite group draws `2–4`; the boss group draws
`3–5`. Preserve existing symbol pools. Every recipe declares `goldCost: 0`,
`catalystItemIds: []`, `allowedSupportItemIds: []`, and an explicit failure
consumption policy. The first two recipes retain their current success rates and
outputs.

- [ ] **Step 6: Correct remaining prose and source ownership**

Make every plan describe Arcadia as the only shared hub and all gameplay/farming
as cooperative instances. Replace player-facing `한글 파편`/resource `파편`
phrases with `음`; do not rename unrelated physical debris. Define current
`client/src/game/data` as transitional fixtures and `shared/content` as the
future server-canonical content source, generated into client display copies.
Update `progress.md` to say explicit drops and recipes already exist.

- [ ] **Step 7: Add per-document and arithmetic regression checks**

Require the revised hub-instance and `음` wording in every changed plan file.
Assert expected post-defense values using the current data:

```text
slime: 41.615
elite: 37.832
boss normal phase: 13.005
```

- [ ] **Step 8: Run the full consistency suite**

Run:

```bash
git diff --check
node scripts/validate-runtime-data.mjs
rg -n 'Direction8|SpriteSheetAsset|weaponSpriteKey|공유 월드|공유 필드|심리스 월드|한글 파편' \
  progress.md plan data/design client/src/game/types client/src/game/data
```

Expected: no diff errors, `runtime data OK`, and no active stale visual/world/
resource references.

- [ ] **Step 9: Commit the final-contract fixes**

```bash
git add progress.md plan data/design docs/superpowers/specs \
  client/src/game/types/data.ts client/src/game/data scripts/validate-runtime-data.mjs \
  docs/superpowers/plans/2026-07-29-3d-online-rebaseline.md
git commit -m "docs: resolve 3d online contract gaps"
```

### Task 8: Finalize grouped 음 reward semantics

**Files:**
- Modify: `plan/03_Item_and_Equipment.md`
- Modify: `plan/14_Story_and_World_Lore.md`
- Modify: `client/src/game/types/data.ts`
- Modify: `client/src/game/data/monsters.json`
- Modify: `scripts/validate-runtime-data.mjs`
- Modify: `docs/superpowers/specs/2026-07-29-3d-online-vertical-slice-design.md`
- Modify: `docs/superpowers/plans/2026-07-29-3d-online-rebaseline.md`

**Interfaces:**
- Consumes: `EumRollGroup` and the first-slice grouped draw ranges.
- Produces: unambiguous replacement semantics and matching authoritative prose.

- [ ] **Step 1: Add failing grouped-reward assertions**

Require every `EumRollGroup` to declare `allowDuplicateSymbols`. Require the
slime group to use `draws 1–2`, equal weights, and `allowDuplicateSymbols: false`.
Require plan 03 to describe grouped weighted draws rather than independent `1/3`
rolls. Require plan 14's inventory resource category to use `음`.

- [ ] **Step 2: Run the validator to verify it fails**

Run: `node scripts/validate-runtime-data.mjs`

Expected: failure because the current grouped-roll contract lacks replacement
semantics and the documents contain stale copy.

- [ ] **Step 3: Define no-replacement grouped draws**

Use this exact field:

```ts
allowDuplicateSymbols: boolean;
```

Set it to `false` for every current group. Each draw removes the selected entry
from that reward's remaining weighted pool, so a single monster reward cannot
contain the same 음 symbol twice. Keep slime `1–2`, elite `2–4`, and boss `3–5`.

- [ ] **Step 4: Align all prose and the design specification**

Replace the independent-roll description in plan 03 with the grouped weighted,
without-replacement rule. Replace plan 14's player inventory category `파편` with
`음`. Add the same no-replacement rule to the design specification.

- [ ] **Step 5: Run final checks and commit**

Run:

```bash
git diff --check
node scripts/validate-runtime-data.mjs
rg -n '독립.*1/3|인벤토리.*파편' plan/03_Item_and_Equipment.md plan/14_Story_and_World_Lore.md
```

Expected: no diff errors, `runtime data OK`, and no stale reward/category text.

```bash
git add plan/03_Item_and_Equipment.md plan/14_Story_and_World_Lore.md \
  client/src/game/types/data.ts client/src/game/data/monsters.json \
  scripts/validate-runtime-data.mjs docs/superpowers/specs \
  docs/superpowers/plans/2026-07-29-3d-online-rebaseline.md
git commit -m "docs: define grouped eum reward semantics"
```
