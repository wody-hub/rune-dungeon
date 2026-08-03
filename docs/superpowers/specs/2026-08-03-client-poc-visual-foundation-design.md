# Client POC Visual Foundation Design

## Objective

Apply the approved `먹빛 결정` direction to the existing client at the smallest scope that improves visual identity without delaying M3 gameplay validation.

## Product Promise

The world absorbs light; `음`, `결`, weapons, crystals, inscription, and transformation visibly emit it. Metal and crystal define the 3D world, while paper fibers and ink strokes appear in UI edges and state transitions.

## Scope

### In scope

- Centralized visual tokens for the approved palette, typography, spacing, panel geometry, and glow timings.
- Combat HUD hierarchy: player survival and equipped Gyeol, selected target, recent resources, and M3 loop state.
- Separation of developer-only state from the player-facing HUD.
- Minimal player and ink-slime placeholder restyling using existing geometry.
- Subtle 2.4-second crystal glow breathing and short combat-state glow feedback.
- Responsive behavior for desktop and narrow viewports.
- Automated model tests plus browser visual QA at the current POC resolution.

### Out of scope

- Final player character, face, costume, armor, weapon, or transformation-form design.
- Final monster concept art or production-ready 3D models.
- Inventory, crafting, equipping, and transformation gameplay behavior; those belong to M3.
- New post-processing pipelines, texture authoring, rigging, or production VFX.
- Replacing placeholder meshes with downloaded or AI-generated assets.

## Visual Contract

- Use the tokens and roles defined in root `DESIGN.md`.
- Large dark surfaces remain low saturation; glow colors are reserved for meaningful game state.
- Base crystal glow uses `#68D5D0`; `결: 화` uses `#FFAD42`; target and inscription use `#E05A42` or semantic danger `#CF505C`.
- Player and slime must remain readable without glow; glow enhances state but never carries meaning alone.
- Panels stay compact, angular, and thin-bordered. Paper texture is suggested through edge treatment and noise, not a beige full-screen overlay.
- The existing placeholder geometry may change material, proportion, and emissive accents but must not be presented as final character design.

## HUD Information Contract

- Left/top player panel: HP, current Gyeol when present, and immediately relevant survival state.
- Top/center target panel: target name, HP, and targetable state.
- Right/bottom resource panel: gold and collected `음`, designed to accept recent-acquisition feedback in M3.
- Bottom/center M3 progression area is not implemented until M3 provides real collection, crafting, equipment, and transformation state.
- Player state-machine labels and auto-attack debugging remain available only behind an explicit debug presentation path.

## Motion Contract

- Idle emissive breathing duration: 2.4 seconds, subtle enough not to read as damage or selection.
- Micro state change: 80–120ms.
- Short combat feedback: 160–240ms.
- No looping motion may move panel geometry or combat text.
- Respect reduced-motion preferences for CSS-driven HUD effects.

## Acceptance Criteria

1. The running client visibly uses the approved palette and typography roles.
2. Player, target, and resource information remain readable against the game world at 1280×720.
3. Existing HP, targeting, gold, and `음` behavior remains functionally unchanged.
4. Developer-only combat state is not mixed with the default player-facing hierarchy.
5. Existing unit tests, Svelte checks, runtime data validation, and production build pass.
6. Browser QA covers idle, target selected, player damaged, target damaged, resource display, and narrow viewport states.
7. Review notes explicitly state that the restyled geometry is a placeholder and does not approve final character design.

## Preview Reference

The consultation preview was generated outside the repository at `/tmp/rune-dungeon-design-preview-20260803.html`. `DESIGN.md` is the durable source of truth; the temporary preview is not an implementation asset.
