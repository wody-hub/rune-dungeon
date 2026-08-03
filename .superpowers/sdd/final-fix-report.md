# M2.5 Final Fix Report — Monster Counterattack

## Scope

- Player HUD HP fill must be bounded to the visible `[0, 100]%` range.
- A `playerMaxHp`-only HUD change must publish.
- Separate monsters must retain separately-started counterattack clocks.
- Important browser-QA remains a controller-owned post-commit pipeline; it is not represented as a completed code fix here.

## RED evidence

1. Added the HP-fill edge cases before product code, then ran:

   ```sh
   export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH
   cd client && npx vitest run src/ui/__tests__/hud-model.test.ts
   ```

   Result: one file failed; 4 tests failed and 5 passed. Each new boundary case failed with `TypeError: playerHpFillRatio is not a function`, proving the new test exercised a missing product API rather than a test setup error.

2. Added two behavior-preserving regression assertions before product code:

   - `hudSnapshotsEqual` returns false when only `playerMaxHp` changes. This passed immediately because the existing comparator already compares that visible value.
   - Staggered counterattack engagement: first slime starts at 0 ms, second at 200 ms. The existing simulation passed `src/game/sim/__tests__/world.test.ts` with 26 tests: at 420 ms only the first hit lands; 200 ms later the second hit lands. This verifies existing independent clock behavior at both boundaries instead of only observing simultaneous attacks.

## GREEN evidence

- Added `playerHpFillRatio(playerHp, playerMaxHp)` in `hud-model.ts`. It returns 0 for a non-positive maximum and otherwise applies both lower and upper clamps.
- Switched `Hud.svelte` to use that pure model helper, keeping the component presentation-only.
- Ran the focused suites:

  ```sh
  export PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH
  cd client && npx vitest run src/ui/__tests__/hud-model.test.ts src/game/sim/__tests__/world.test.ts
  ```

  Result: `Test Files 2 passed (2)`, `Tests 35 passed (35)`.

## Final gates

| Gate | Result |
| --- | --- |
| `cd client && npm run check` | Passed — 0 errors, 0 warnings |
| `cd client && npx vitest run` | Passed — 13 files, 84 tests |
| `cd client && npm run build` | Passed — 438 modules; existing chunk-size advisory only |
| `node scripts/validate-runtime-data.mjs` | Passed — `runtime data OK` |
| `git diff --check` | Passed — no output |

## Self-review

- The fill calculation now cannot exceed 100% or fall below 0% for the requested zero, negative, and over-max HP cases; non-positive maximum HP is safely empty.
- The snapshot test isolates a maximum-only change, so comparator regressions cannot be hidden by a simultaneous current-HP update.
- The counterattack test establishes non-simultaneous clock starts and observes each hit boundary independently.
- No production simulation logic changed, and no new dependency was added.
- `.DS_Store` was intentionally left untouched and excluded from the commit.
- Browser QA was intentionally not marked complete. The controller must run the required browser-QA pipeline after this commit.
