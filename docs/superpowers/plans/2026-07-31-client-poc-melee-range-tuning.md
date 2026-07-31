# Client POC Melee Range Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the equipped greatsword behave as a close-range weapon so the initial combat loop visibly approaches a slime before attacking.

**Architecture:** Keep the existing weapon identity, simulation formula, unit-conversion boundary, and monster spawns. Change only the fixture range, protect the behavior with a world-level regression test, then repeat the full command and browser verification before committing the pending M2 handoff documentation.

**Tech Stack:** TypeScript 6, Vitest 4, Svelte 5, Vite 8, Node.js 22.12+

## Global Constraints

- Keep `weapon_greatsword_mvp_001` and its `GREATSWORD` class.
- Change `rangePx` from `56` to exactly `18`.
- Keep `LOGICAL_PX_TO_WORLD_UNIT = 0.1`, producing runtime range `1.8`.
- Do not change `hitboxWidthPx`, damage, attack timing, monster spawns, or rewards.
- Add a failing regression test before changing the fixture.
- The initial `slime-1` at distance `3` must cause movement before damage.
- All existing simulation, type, build, runtime-data, and browser checks must remain green.

---

### Task 1: Greatsword Melee Range Regression

**Files:**

- Modify: `client/src/game/sim/__tests__/world.test.ts`
- Modify: `client/src/game/data/weapons.json`

**Interfaces:**

- Consumes: `createWorld`, `enqueueIntent`, `tick`, and the equipped weapon fixture.
- Produces: fixture range `rangePx: 18` and a regression proving the initial slime requires approach.

- [ ] **Step 1: Write the failing world regression test**

In `client/src/game/sim/__tests__/world.test.ts`, add under `world combat loop`:

```ts
it('approaches the initial slime with the equipped melee weapon', () => {
  const w = createWorld({ random: zeroRandom() });
  const monster = w.monsters.get('slime-1')!;
  const initialHp = monster.hp;

  startCombat(w);
  tick(w, 0.1);

  expect(w.content.weapon.range).toBeCloseTo(1.8);
  expect(w.player.mode).toBe('moving');
  expect(w.player.pos.x).toBeGreaterThan(0);
  expect(monster.hp).toBe(initialHp);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim/__tests__/world.test.ts
```

Expected: FAIL because runtime weapon range is `5.6`, the player remains at
`{ x: 0, z: 0 }`, and mode becomes `attacking`.

- [ ] **Step 3: Make the minimal fixture change**

In `client/src/game/data/weapons.json`, change only:

```diff
-    "rangePx": 56,
+    "rangePx": 18,
```

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
cd client
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  npx vitest run src/game/sim/__tests__/world.test.ts
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run check
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npx vitest run
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH npm run build
cd ..
PATH=/Users/j.jaeyo/.nvm/versions/node/v22.20.0/bin:$PATH \
  node scripts/validate-runtime-data.mjs
git diff --check
```

Expected:

- focused world test passes;
- `svelte-check` reports 0 errors and 0 warnings;
- every Vitest test passes;
- Vite build exits 0;
- runtime validation prints `runtime data OK`;
- `git diff --check` exits 0.

- [ ] **Step 5: Commit**

```bash
git add client/src/game/sim/__tests__/world.test.ts client/src/game/data/weapons.json
git commit -m "fix: tune greatsword to melee range"
```

- [ ] **Step 6: Resume Task 5 browser verification**

Repeat the ten browser checks in
`docs/superpowers/plans/2026-07-31-client-poc-m2-visual-connection.md`.
For step 6, record evidence that the player position changes before the first
HP reduction. Commit the already prepared `client/README.md` and `progress.md`
only after all ten checks pass.
