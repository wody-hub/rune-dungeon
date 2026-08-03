# Client POC M3 First Inscription Loop Design

## Objective

Validate the smallest complete client-only POC loop:

`combat reward → 음 collection → 자형: 화 crafting → 결: 화 inscription → equip → transformation on/off`

The loop is a deterministic functional checkpoint, not a replacement for the planned 흑심 채굴장 progression or final character art.

## Approved Constraints

- Preserve the existing movement, targeting, auto attack, monster chase, counterattack, gold/음 rewards, and respawn behavior.
- Retain the `먹빛 결정` system in `DESIGN.md`: dark restrained surfaces, semantic glow, angular compact HUD panels, approved type roles, and reduced-motion behavior.
- Keep the current player and slime geometry as explicitly temporary placeholders. M3 may add only state-reading aura and weapon-light treatment; it does not approve a final character or transformation form.
- Do not add persistence, server work, a new mining map, the 오타 요정, a boss, loot-table rewrites, failure mechanics, or final inventory/equipment screens.
- Do not apply `결: 화` stat or elemental-damage effects in M3. Existing combat values and cadence remain unchanged.
- No push or tag is part of this work.

## M3 Scenario

### Starting checkpoint

The M3 session seed starts with:

- Gold `15`.
- No `음 · ㅎ`, `음 · ㅘ`, `돌: 새김`, `자형: 화`, or `결: 화`.
- The existing `인: 움결 화` remains equipped, but the player is in normal (not transformed) mode.

Existing unrelated inventory data may remain available where it does not bypass this loop. The seed must not pre-own `결: 화`.

### Ordered flow

1. The player defeats one existing 먹물 슬라임. Its current gold and `ㄱ`/`ㅏ`/`ㅇ` reward rules remain unchanged; the guaranteed minimum gold reward brings the total to at least `20`.
2. Processing that first death enables one temporary scene object, the `각인 보급함`.
3. The player clicks the supply cache once. It grants `음 · ㅎ ×1`, `음 · ㅘ ×1`, and `돌: 새김 ×1`, then disappears permanently for the session.
4. The player crafts `자형: 화` from `음 · ㅎ ×1 + 음 · ㅘ ×1`. The recipe always succeeds and consumes those inputs.
5. The player inscribes `결: 화` from `자형: 화 ×1 + 돌: 새김 ×1 + 골드 20`. The recipe always succeeds and consumes those inputs.
6. The player equips `결: 화` into the M3 `현재 결` slot. It leaves the general item list and becomes the slot's selected item.
7. With both `현재 결: 화` and `인: 움결 화` present, the player can toggle transformation on and off.

`각인 보급함` is an explicit M3-only alternate supplier. The canonical future route remains 흑심 채굴장 resources and the 오타 요정/chests; M3 does not alter the existing 먹물 슬라임 drop table.

## State and Data Flow

The `game/` layer owns the M3 state and all mutations. Scene and Svelte components dispatch intentions and render snapshots only:

`scene click or UI action → GameIntent queue → tick(world, dt) → M3 state/inventory update → HUD snapshot → scene and DOM rendering`

The world state records, at minimum:

- Whether the first slime death has enabled the supply cache.
- Whether the cache has already been collected.
- The inventory's materials and crafted item IDs.
- The optional `현재 결` item ID.
- The normal/transformed combat-mode flag.
- A short player-facing M3 status message.

Mutating actions validate their prerequisites inside the pure game layer. A blocked action leaves state unchanged and supplies a clear message, such as `재료가 부족합니다` or `현재 결을 먼저 장착하세요`.

The supply cache can succeed only once. Each successful craft consumes its exact inputs once; repeating the action after input consumption is blocked. Transformation is blocked unless the equipped current Gyeol is `결: 화` and the existing equipped In is `인: 움결 화`.

Reloading intentionally returns to the M3 starting checkpoint. M3 does not include general unequip, alternative Gyeol selection, saving, or migration of this local POC state to a server.

## UI and Interaction

### Scene cache

After the first slime death, display an interactable, one-time `각인 보급함` in the current scene. It is a small ink-metal object with a restrained crystal accent. Its geometry is a functional placeholder, not a new final asset.

The cache's physical appearance, its disappearance after collection, and the player-facing status text communicate availability together; color alone never carries the state.

### M3 progression panel

Add one compact `M3 · 첫 각인` panel at bottom center. It has a maximum desktop width of roughly 360px and exposes only:

- The current stage and one short next-step explanation.
- Relevant material quantities, including text ratios such as `음 · ㅎ 1/1` and `골드 20/20`.
- Exactly one next actionable control when an action is ready.
- The most recent success or blocked-action status message.

The stages are: defeat a slime, collect the cache, craft `자형: 화`, inscribe `결: 화`, equip it, transform, and transformed. This panel replaces tabs, full inventory management, and step-by-step modal dialogs for M3.

The existing player HUD gains `현재 결 · 화` after equipping. Target, health, resource, and opt-in debug areas keep their approved visual-foundation structure. The M3 panel may show the cache materials even though the general resource panel remains focused on gold and `음`.

At 390px width, the resource panel remains at the bottom and the M3 panel stacks immediately above it. Neither panel may overlap the player or target panels, overflow horizontally, or prevent scene interaction outside its controls. Controls support pointer, touch, and keyboard focus.

## Visual and Motion Contract

- Panels use the existing ink-metal surface, thin paper/ink edge treatment, compact angular geometry, SUIT/Gowun Batang/IBM Plex Mono roles, and approved token values.
- Standard resource and interaction emphasis stays crystal teal. `결: 화`, its completed current-Gyeol slot, and transformation use the approved fire gold `#FFAD42`; crafting/inscription uses vermilion only for the seal moment.
- Cache collection displays labeled `음 · ㅎ`, `음 · ㅘ`, and `돌: 새김` acquisition chips that converge toward the resource/progression information within 160–240ms.
- Inscription shows a vermilion seal, restrained spreading ink, then an internally ignited fire Gyeol over 600–900ms.
- Equipping briefly strengthens the current-Gyeol slot without moving panel geometry.
- Transformation keeps the placeholder silhouette intact while adding ink-line edging, a fire aura, and stronger weapon emission. Existing combat feedback timing remains unchanged.
- Under `prefers-reduced-motion: reduce`, acquisition movement and inscription/transformation animation stop; final state, labels, and non-motion readability remain intact.

## Acceptance Criteria

1. A fresh M3 session cannot begin the crafting chain with the required Hwa ingredients or `결: 화` already owned.
2. The first existing slime death still grants its current gold and 음 reward, retains combat behavior, and enables exactly one supply cache.
3. Collecting the cache once grants the three specified inputs and cannot be repeated.
4. Both recipes use the approved data contracts, always succeed, and consume exactly the required inputs.
5. `결: 화` can be equipped into `현재 결`; transformation is unavailable until that state and `인: 움결 화` are both present, then supports on/off.
6. M3 does not alter damage, attack timing, pursuit, counterattack, normal slime drop results, or respawn behavior.
7. The player HUD, M3 panel, cache feedback, and transformed placeholder comply with `DESIGN.md`, including reduced motion and non-color state communication.
8. At 1280×720 and 390×844 the complete flow is readable and operable without HUD overlap or horizontal overflow.
9. Existing tests plus focused M3 tests, Svelte/TypeScript checks, the production build, runtime-data validation, and browser regression QA pass.

## Verification Plan

Add pure unit coverage for the M3 seed, first-death cache enablement, one-time collection, blocked actions, each exact recipe transaction, current-Gyeol equipment, and transformation gates/toggle. Extend HUD snapshot and equality coverage for M3 presentation state. Keep existing M2/M2.5 regression tests green.

Browser QA covers the full happy path, all initially blocked actions, cache one-time behavior, transformation off, default versus debug HUD, existing combat/reward/respawn behavior, reduced motion, and the 390px layout. Review copy and source comments to ensure no temporary player, cache, or transformed visual is described as final character art.

## Out of Scope

- 흑심 채굴장, 오타 요정, map/portal progression, and boss content.
- General inventory tabs, equipment slots, Gyeol swapping, item icons, and item persistence.
- Additional recipes, crafting failure, enhancement, rarity, `먹` protection materials, or drops of `ITEM` entries.
- Applying `결: 화` stats, fire damage, new weapon mechanics, or changed enemy behavior.
- Final player, weapon, monster, or transformation visual design.
