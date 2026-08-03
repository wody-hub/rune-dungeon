# Client POC Visual Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved `먹빛 결정` visual system to the existing POC HUD and placeholder scene without implementing M3 gameplay or final character art.

**Architecture:** Keep simulation data and behavior unchanged. Add one framework-free visual-token module shared by the DOM shell and Threlte scene, keep HUD formatting at the existing snapshot boundary, and isolate time-based WebGL presentation math in a pure tested module. The existing scene components continue to mutate Three.js objects through their imperative `update()` methods.

**Tech Stack:** Svelte 5.56, TypeScript 6, Vite 8, Threlte 8, Three.js 0.185, Vitest 4.

## Global Constraints

- Root `DESIGN.md` is the source of truth for color, typography, spacing, motion, and glow behavior.
- Do not add runtime dependencies or download 3D assets.
- Do not implement collection, crafting, equipment, transformation, or the bottom-center M3 progression control.
- Do not present the restyled primitive player or slime meshes as final character designs.
- Preserve the simulation/render dependency direction: `game/` must not import Svelte, Threlte, Three.js, or `scene/`.
- Preserve existing HP, targeting, gold, `음`, movement, attack, monster AI, death, reward, and respawn behavior.
- Glow supplements silhouettes and labels; color or emission must not be the only state indicator.

## File Structure

- Create `client/src/design/visual-theme.ts`: shared DOM and WebGL visual constants plus CSS-variable serialization.
- Create `client/src/design/__tests__/visual-theme.test.ts`: token-contract tests.
- Modify `client/index.html`: Korean metadata and approved font loading.
- Modify `client/src/App.svelte`: install theme variables and opt-in debug HUD flag.
- Modify `client/src/app.css`: global shell only; HUD styling moves into its component.
- Modify `client/src/ui/hud-model.ts`: pure debug-HUD query rule.
- Modify `client/src/ui/__tests__/hud-model.test.ts`: debug query tests.
- Modify `client/src/ui/Hud.svelte`: player, target, resources, and optional debug sections.
- Create `client/src/scene/visual-state.ts`: deterministic glow pulse and selected-slime visual state.
- Create `client/src/scene/__tests__/visual-state.test.ts`: presentation-state tests.
- Modify `client/src/scene/GameScene.svelte`: pass render time and apply approved lighting.
- Modify `client/src/scene/PlayerLayer.svelte`: restyle the temporary player and add crystal/weapon accents.
- Modify `client/src/scene/MonsterLayer.svelte`: forward render time.
- Modify `client/src/scene/MonsterEntity.svelte`: restyle temporary ink slime, core, eyes, and selection ring.
- Modify `client/src/scene/GroundLayer.svelte`: apply ink-metal ground colors.
- Modify `client/README.md`: record the visual checkpoint and debug-HUD URL.

---

### Task 1: Shared visual theme and application shell

**Files:**
- Create: `client/src/design/visual-theme.ts`
- Create: `client/src/design/__tests__/visual-theme.test.ts`
- Modify: `client/index.html`
- Modify: `client/src/App.svelte`
- Modify: `client/src/app.css`

**Interfaces:**
- Consumes: the palette and font roles in root `DESIGN.md`.
- Produces: `visualTheme`, `VisualTheme`, and `themeCssVariables()` for HUD and scene tasks.

- [ ] **Step 1: Write the failing theme-contract tests**

Create `client/src/design/__tests__/visual-theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { themeCssVariables, visualTheme } from '../visual-theme';

describe('visual theme', () => {
  it('keeps the approved ink, crystal, seal, and fire colors', () => {
    expect(visualTheme.colors).toMatchObject({
      ink950: '#0D1418',
      metalSurface: '#182328',
      paperText: '#DDD4BD',
      crystalGlow: '#68D5D0',
      sealVermilion: '#E05A42',
      fireGyeol: '#FFAD42',
      danger: '#CF505C',
    });
  });

  it('serializes stable CSS custom properties for the Svelte shell', () => {
    expect(themeCssVariables()).toBe(
      [
        '--rd-ink-950:#0D1418',
        '--rd-metal-surface:#182328',
        '--rd-paper-text:#DDD4BD',
        '--rd-muted-text:#9F9A89',
        '--rd-crystal-glow:#68D5D0',
        '--rd-seal-vermilion:#E05A42',
        '--rd-fire-gyeol:#FFAD42',
        '--rd-danger:#CF505C',
        '--rd-success:#74C995',
        '--rd-info:#72AEE8',
      ].join(';'),
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```bash
cd client && npx vitest run src/design/__tests__/visual-theme.test.ts
```

Expected: FAIL because `../visual-theme` does not exist.

- [ ] **Step 3: Implement the shared visual theme**

Create `client/src/design/visual-theme.ts`:

```ts
export const visualTheme = {
  colors: {
    ink950: '#0D1418',
    metalSurface: '#182328',
    paperText: '#DDD4BD',
    mutedText: '#9F9A89',
    crystalGlow: '#68D5D0',
    sealVermilion: '#E05A42',
    fireGyeol: '#FFAD42',
    danger: '#CF505C',
    success: '#74C995',
    info: '#72AEE8',
  },
  motion: {
    glowPeriodMs: 2_400,
    microMs: 100,
    shortMs: 200,
  },
} as const;

export type VisualTheme = typeof visualTheme;

const cssVariables: ReadonlyArray<readonly [string, keyof VisualTheme['colors']]> = [
  ['--rd-ink-950', 'ink950'],
  ['--rd-metal-surface', 'metalSurface'],
  ['--rd-paper-text', 'paperText'],
  ['--rd-muted-text', 'mutedText'],
  ['--rd-crystal-glow', 'crystalGlow'],
  ['--rd-seal-vermilion', 'sealVermilion'],
  ['--rd-fire-gyeol', 'fireGyeol'],
  ['--rd-danger', 'danger'],
  ['--rd-success', 'success'],
  ['--rd-info', 'info'],
];

export function themeCssVariables(theme: VisualTheme = visualTheme): string {
  return cssVariables
    .map(([variable, color]) => `${variable}:${theme.colors[color]}`)
    .join(';');
}
```

- [ ] **Step 4: Run the theme-contract test and verify it passes**

Run:

```bash
cd client && npx vitest run src/design/__tests__/visual-theme.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Load the approved fonts and install theme variables**

Replace `client/index.html` with:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0D1418" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://cdn.jsdelivr.net/gh/sunn-us/SUIT/fonts/variable/woff2/SUIT-Variable.css"
      rel="stylesheet"
    />
    <title>Rune Dungeon · 룬 던전</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Update `client/src/App.svelte` so its script imports `themeCssVariables` and the root installs the returned variables:

```svelte
<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { themeCssVariables } from './design/visual-theme';
  import GameScene from './scene/GameScene.svelte';
  import Hud from './ui/Hud.svelte';
  import type { HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
</script>

<div class="game-root" style={themeCssVariables()}>
  <Canvas renderMode="manual">
    <GameScene onHudChange={(snapshot) => (hud = snapshot)} />
  </Canvas>
  <Hud snapshot={hud} />
</div>

<style>
  .game-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
```

Replace only the global shell rules at the start of `client/src/app.css`; retain the existing `.hud` rules until Task 2 moves them:

```css
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0d1418;
  color: #ddd4bd;
  font-family: "SUIT Variable", sans-serif;
}

body {
  text-rendering: optimizeLegibility;
}

#app {
  width: 100%;
  height: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

- [ ] **Step 6: Verify Task 1 and commit it**

Run:

```bash
cd client && npx vitest run src/design/__tests__/visual-theme.test.ts && npm run check && npm run build
```

Expected: 2 focused tests PASS, Svelte/TypeScript reports 0 errors and 0 warnings, and Vite build succeeds.

Commit:

```bash
git add client/index.html client/src/App.svelte client/src/app.css client/src/design
git commit -m "feat: add inkbound crystal visual tokens"
```

---

### Task 2: Player-facing HUD hierarchy and opt-in debug information

**Files:**
- Modify: `client/src/ui/hud-model.ts`
- Modify: `client/src/ui/__tests__/hud-model.test.ts`
- Modify: `client/src/ui/Hud.svelte`
- Modify: `client/src/App.svelte`
- Modify: `client/src/app.css`

**Interfaces:**
- Consumes: `HudSnapshot`, `playerHpFillRatio()`, and the CSS variables installed by `App.svelte`.
- Produces: `isDebugHudEnabled(dev, search)` and `<Hud snapshot showDebug>`.

- [ ] **Step 1: Add failing tests for the explicit debug-HUD gate**

Add `isDebugHudEnabled` to the imports in `client/src/ui/__tests__/hud-model.test.ts`, then add this test inside `describe('HUD model', ...)`:

```ts
  it.each([
    [true, '?debugHud', true],
    [true, '?other=value', false],
    [false, '?debugHud', false],
  ])(
    'resolves debug HUD for dev=%s and search=%s',
    (dev, search, expected) => {
      expect(isDebugHudEnabled(dev, search)).toBe(expected);
    },
  );
```

- [ ] **Step 2: Run the focused HUD tests and verify the missing-export failure**

Run:

```bash
cd client && npx vitest run src/ui/__tests__/hud-model.test.ts
```

Expected: FAIL because `isDebugHudEnabled` is not exported.

- [ ] **Step 3: Implement the debug-HUD gate**

Append to `client/src/ui/hud-model.ts`:

```ts
export function isDebugHudEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).has('debugHud');
}
```

Update `client/src/App.svelte` by changing its HUD-model import and adding the debug flag:

```ts
import { isDebugHudEnabled, type HudSnapshot } from './ui/hud-model';
const showDebugHud = isDebugHudEnabled(import.meta.env.DEV, window.location.search);
```

and:

```svelte
<Hud snapshot={hud} showDebug={showDebugHud} />
```

- [ ] **Step 4: Run the HUD tests and verify they pass**

Run:

```bash
cd client && npx vitest run src/ui/__tests__/hud-model.test.ts
```

Expected: the existing HUD tests plus the 3 debug-query cases PASS.

- [ ] **Step 5: Replace the HUD markup with the approved information hierarchy**

Replace `client/src/ui/Hud.svelte` with:

```svelte
<script lang="ts">
  import { playerHpFillRatio, type HudSnapshot } from './hud-model';

  let {
    snapshot,
    showDebug = false,
  }: {
    snapshot: HudSnapshot | null;
    showDebug?: boolean;
  } = $props();

  const modeLabel = {
    idle: '대기',
    moving: '이동',
    attacking: '공격',
  } as const;
</script>

<div class="hud" aria-live="polite">
  {#if snapshot}
    <section class="hud-panel player-panel" aria-label="플레이어 상태">
      <span class="panel-kicker">PLAYER · 방랑자</span>
      <div class="panel-heading">
        <strong>생명</strong>
        <b>{snapshot.playerHp} / {snapshot.playerMaxHp}</b>
      </div>
      <div class="hp-track player-hp-track" aria-hidden="true">
        <div
          class="hp-fill player-hp-fill"
          style:width={`${playerHpFillRatio(snapshot.playerHp, snapshot.playerMaxHp) * 100}%`}
        ></div>
      </div>
    </section>

    {#if snapshot.target}
      <section class="hud-panel target-panel" aria-label="선택 대상">
        <span class="panel-kicker">TARGET</span>
        <div class="panel-heading target-heading">
          <strong>{snapshot.target.name}</strong>
          <b>{snapshot.target.hp} / {snapshot.target.maxHp}</b>
        </div>
        <div class="hp-track" aria-hidden="true">
          <div
            class="hp-fill target-hp-fill"
            style:width={`${Math.max(0, snapshot.target.hp / snapshot.target.maxHp) * 100}%`}
          ></div>
        </div>
      </section>
    {/if}

    <section class="hud-panel resource-panel" aria-label="보유 자원">
      <span class="panel-kicker">ACQUIRED · 보유 자원</span>
      <div class="gold-row"><span>골드</span><b>{snapshot.gold}</b></div>
      <div class="eum-grid">
        {#each snapshot.eum as stack (stack.symbol)}
          <div class="eum-chip">
            <strong>{stack.symbol}</strong>
            <span>×{stack.quantity}</span>
          </div>
        {/each}
      </div>
    </section>

    {#if showDebug}
      <aside class="hud-panel debug-panel" aria-label="개발 정보">
        <span class="panel-kicker">DEBUG</span>
        <div><span>상태</span><b>{modeLabel[snapshot.playerMode]}</b></div>
        <div><span>자동공격</span><b>{snapshot.autoAttackEnabled ? 'ON' : 'OFF'}</b></div>
      </aside>
    {/if}
  {/if}
</div>

<style>
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: var(--rd-paper-text);
    font-family: "SUIT Variable", sans-serif;
  }

  .hud-panel {
    position: absolute;
    padding: 13px 15px;
    border: 1px solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-crystal-glow);
    border-radius: 2px;
    background: linear-gradient(135deg, rgb(24 35 40 / 92%), rgb(13 20 24 / 88%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 2px 0 var(--rd-crystal-glow);
    backdrop-filter: blur(8px);
  }

  .panel-kicker {
    display: block;
    color: var(--rd-muted-text);
    font: 600 10px/1.2 "IBM Plex Mono", monospace;
    letter-spacing: 0.12em;
  }

  .panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px;
    margin-top: 7px;
  }

  .panel-heading strong {
    font: 700 15px/1.2 "Gowun Batang", serif;
  }

  .panel-heading b,
  .gold-row b,
  .debug-panel b {
    font: 600 11px/1.2 "IBM Plex Mono", monospace;
  }

  .player-panel { top: 16px; left: 16px; width: 230px; }

  .target-panel {
    top: 16px;
    left: 50%;
    width: min(330px, calc(100vw - 300px));
    transform: translateX(-50%);
    border-left-color: color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-bottom-color: var(--rd-seal-vermilion);
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 0 -2px var(--rd-seal-vermilion);
    text-align: center;
  }

  .target-heading { justify-content: center; }

  .resource-panel { right: 16px; bottom: 16px; width: 250px; }

  .gold-row {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    padding-bottom: 9px;
    border-bottom: 1px solid color-mix(in srgb, var(--rd-paper-text) 12%, transparent);
  }

  .gold-row span { color: var(--rd-muted-text); font-size: 12px; }

  .eum-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 9px; }

  .eum-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--rd-crystal-glow) 30%, transparent);
    background: color-mix(in srgb, var(--rd-crystal-glow) 6%, transparent);
  }

  .eum-chip strong { color: var(--rd-crystal-glow); font: 700 14px "Gowun Batang", serif; }
  .eum-chip span { font: 500 9px "IBM Plex Mono", monospace; }

  .debug-panel { left: 16px; bottom: 16px; width: 180px; opacity: 0.78; }
  .debug-panel > div { display: flex; justify-content: space-between; margin-top: 7px; font-size: 11px; }

  .hp-track { height: 6px; margin-top: 9px; overflow: hidden; background: #263138; }
  .hp-fill { height: 100%; transition: width 100ms linear; }
  .player-hp-fill { background: linear-gradient(90deg, #4c9b7c, var(--rd-crystal-glow)); box-shadow: 0 0 14px var(--rd-crystal-glow); }
  .target-hp-fill { background: linear-gradient(90deg, #7c3038, var(--rd-danger)); box-shadow: 0 0 12px color-mix(in srgb, var(--rd-danger) 48%, transparent); }

  @media (max-width: 720px) {
    .player-panel { width: calc(100vw - 32px); }
    .target-panel { top: 112px; width: calc(100vw - 32px); }
    .resource-panel { width: calc(100vw - 32px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-fill { transition: none; }
  }
</style>
```

Remove all `.hud` through `.hp-fill` rules from `client/src/app.css`; the file must retain only the global shell rules from Task 1.

- [ ] **Step 6: Verify Task 2 and commit it**

Run:

```bash
cd client && npx vitest run src/ui/__tests__/hud-model.test.ts && npm run check && npm run build
```

Expected: focused tests PASS, Svelte/TypeScript reports 0 errors and 0 warnings, and Vite build succeeds.

Commit:

```bash
git add client/src/App.svelte client/src/app.css client/src/ui
git commit -m "feat: restructure combat HUD hierarchy"
```

---

### Task 3: Ink-metal placeholder scene and state-driven crystal glow

**Files:**
- Create: `client/src/scene/visual-state.ts`
- Create: `client/src/scene/__tests__/visual-state.test.ts`
- Modify: `client/src/scene/GameScene.svelte`
- Modify: `client/src/scene/PlayerLayer.svelte`
- Modify: `client/src/scene/MonsterLayer.svelte`
- Modify: `client/src/scene/MonsterEntity.svelte`
- Modify: `client/src/scene/GroundLayer.svelte`
- Modify: `client/README.md`

**Interfaces:**
- Consumes: `visualTheme`, `visualTheme.motion.glowPeriodMs`, `WorldState`, and existing imperative layer updates.
- Produces: `glowPulse(nowMs, reducedMotion)`, `monsterVisualState(selected)`, `PlayerLayer.update(nowMs)`, `MonsterLayer.update(nowMs)`, and `MonsterEntity.update(selected, nowMs)`.

- [ ] **Step 1: Write failing visual-state tests**

Create `client/src/scene/__tests__/visual-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { visualTheme } from '../../design/visual-theme';
import { glowPulse, monsterVisualState } from '../visual-state';

describe('scene visual state', () => {
  it('loops the crystal pulse every approved 2.4 seconds', () => {
    expect(glowPulse(0, false)).toBeCloseTo(0.35);
    expect(glowPulse(1_200, false)).toBeCloseTo(0.47);
    expect(glowPulse(2_400, false)).toBeCloseTo(0.35);
  });

  it('uses a stable midpoint when reduced motion is requested', () => {
    expect(glowPulse(0, true)).toBe(0.41);
    expect(glowPulse(1_200, true)).toBe(0.41);
  });

  it('uses silhouette plus seal ring to identify selection', () => {
    expect(monsterVisualState(false)).toEqual({
      body: '#13191C',
      core: visualTheme.colors.crystalGlow,
      ring: visualTheme.colors.sealVermilion,
      ringVisible: false,
      coreBoost: 0,
    });
    expect(monsterVisualState(true)).toMatchObject({
      body: '#20272A',
      ringVisible: true,
      coreBoost: 0.24,
    });
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```bash
cd client && npx vitest run src/scene/__tests__/visual-state.test.ts
```

Expected: FAIL because `../visual-state` does not exist.

- [ ] **Step 3: Implement deterministic presentation state**

Create `client/src/scene/visual-state.ts`:

```ts
import { visualTheme } from '../design/visual-theme';

export function glowPulse(nowMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0.41;
  const phase = (nowMs % visualTheme.motion.glowPeriodMs) / visualTheme.motion.glowPeriodMs;
  return 0.35 + 0.06 * (1 - Math.cos(phase * Math.PI * 2));
}

export function monsterVisualState(selected: boolean): {
  body: string;
  core: string;
  ring: string;
  ringVisible: boolean;
  coreBoost: number;
} {
  return {
    body: selected ? '#20272A' : '#13191C',
    core: visualTheme.colors.crystalGlow,
    ring: visualTheme.colors.sealVermilion,
    ringVisible: selected,
    coreBoost: selected ? 0.24 : 0,
  };
}
```

- [ ] **Step 4: Run the visual-state tests and verify they pass**

Run:

```bash
cd client && npx vitest run src/scene/__tests__/visual-state.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Restyle the temporary player while preserving its placeholder status**

Replace `client/src/scene/PlayerLayer.svelte` with:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import type { Group, MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { WorldState } from '../game/sim/world';
  import { glowPulse } from './visual-state';

  let { world }: { world: WorldState } = $props();
  let group = $state<Group>();
  let coreMaterial = $state<MeshStandardMaterial>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(nowMs: number): void {
    if (!group) return;
    group.position.set(world.player.pos.x, 0, world.player.pos.z);
    if (coreMaterial) coreMaterial.emissiveIntensity = glowPulse(nowMs, reducedMotion);
  }
</script>

<!-- Primitive geometry remains an explicitly temporary silhouette. -->
<T.Group bind:ref={group}>
  <T.Mesh position.y={0.86} scale={[0.82, 1, 0.72]}>
    <T.CapsuleGeometry args={[0.4, 0.9, 8, 12]} />
    <T.MeshStandardMaterial color={visualTheme.colors.metalSurface} metalness={0.72} roughness={0.38} />
  </T.Mesh>
  <T.Mesh position={[0, 0.96, 0.34]} scale={[0.16, 0.38, 0.08]}>
    <T.OctahedronGeometry args={[0.5, 0]} />
    <T.MeshStandardMaterial
      bind:ref={coreMaterial}
      color={visualTheme.colors.crystalGlow}
      emissive={visualTheme.colors.crystalGlow}
      emissiveIntensity={0.35}
      roughness={0.24}
    />
  </T.Mesh>
  <T.Group position={[0.58, 0.78, 0]} rotation={[0, 0, -0.34]}>
    <T.Mesh position.y={-0.42} scale={[0.1, 0.72, 0.1]}>
      <T.BoxGeometry />
      <T.MeshStandardMaterial color="#31434A" metalness={0.82} roughness={0.28} />
    </T.Mesh>
    <T.Mesh position.y={-0.86} scale={[0.05, 0.22, 0.05]}>
      <T.BoxGeometry />
      <T.MeshStandardMaterial
        color={visualTheme.colors.fireGyeol}
        emissive={visualTheme.colors.fireGyeol}
        emissiveIntensity={0.3}
      />
    </T.Mesh>
  </T.Group>
</T.Group>
```

- [ ] **Step 6: Restyle the temporary ink slime with an emissive core and non-color selection ring**

Replace `client/src/scene/MonsterEntity.svelte` with:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import type { Group, Mesh, MeshStandardMaterial } from 'three';
  import type { MonsterState } from '../game/sim/entities/monster';
  import type { MonsterGesture } from './monster-input';
  import { glowPulse, monsterVisualState } from './visual-state';

  let {
    monster,
    onGesture,
  }: {
    monster: MonsterState;
    onGesture: (gesture: MonsterGesture) => void;
  } = $props();

  let group = $state<Group>();
  let bodyMaterial = $state<MeshStandardMaterial>();
  let coreMaterial = $state<MeshStandardMaterial>();
  let selectionRing = $state<Mesh>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(selected: boolean, nowMs: number): void {
    if (!group) return;
    group.position.set(monster.pos.x, 0, monster.pos.z);
    group.visible = monster.alive;
    const visual = monsterVisualState(selected);
    bodyMaterial?.color.set(visual.body);
    if (coreMaterial) {
      coreMaterial.color.set(visual.core);
      coreMaterial.emissive.set(visual.core);
      coreMaterial.emissiveIntensity = glowPulse(nowMs, reducedMotion) + visual.coreBoost;
    }
    if (selectionRing) selectionRing.visible = monster.alive && visual.ringVisible;
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh
    position.y={0.55}
    scale={[0.9, 0.65, 0.9]}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      if (!monster.alive) return;
      event.stopPropagation();
      onGesture('select');
    }}
    ondblclick={(event: IntersectionEvent<MouseEvent>) => {
      if (!monster.alive) return;
      event.stopPropagation();
      onGesture('start_auto_attack');
    }}
  >
    <T.SphereGeometry args={[0.65, 20, 14]} />
    <T.MeshStandardMaterial bind:ref={bodyMaterial} color="#13191C" metalness={0.18} roughness={0.78} />
  </T.Mesh>
  <T.Mesh position={[0.16, 0.59, 0.48]} scale={[0.16, 0.2, 0.1]}>
    <T.OctahedronGeometry args={[0.5, 0]} />
    <T.MeshStandardMaterial
      bind:ref={coreMaterial}
      color="#68D5D0"
      emissive="#68D5D0"
      emissiveIntensity={0.35}
    />
  </T.Mesh>
  <T.Mesh position={[-0.16, 0.67, 0.55]} scale={[0.035, 0.08, 0.025]}>
    <T.SphereGeometry args={[1, 8, 6]} />
    <T.MeshBasicMaterial color="#DDD4BD" />
  </T.Mesh>
  <T.Mesh position={[0.02, 0.67, 0.58]} scale={[0.035, 0.08, 0.025]}>
    <T.SphereGeometry args={[1, 8, 6]} />
    <T.MeshBasicMaterial color="#DDD4BD" />
  </T.Mesh>
  <T.Mesh bind:ref={selectionRing} position.y={0.04} rotation.x={Math.PI / 2} visible={false}>
    <T.TorusGeometry args={[0.78, 0.035, 8, 32]} />
    <T.MeshBasicMaterial color="#E05A42" />
  </T.Mesh>
</T.Group>
```

- [ ] **Step 7: Forward render time through the existing imperative update boundary**

In `client/src/scene/MonsterLayer.svelte`, change the entity handle type and `update` signature to:

```ts
  let entities = $state<
    Array<{ update: (selected: boolean, nowMs: number) => void } | undefined>
  >([]);

  export function update(nowMs: number): void {
    for (let index = 0; index < monsters.length; index += 1) {
      const monster = monsters[index];
      entities[index]?.update(world.player.combatTargetId === monster.entityId, nowMs);
    }
  }
```

In `client/src/scene/GameScene.svelte`, update the handle declarations:

```ts
  let monsterLayer = $state<{ update: (nowMs: number) => void }>();
  let playerLayer = $state<{ update: (nowMs: number) => void }>();
```

and replace the two render-update calls inside the animation loop with:

```ts
      playerLayer?.update(now);
      monsterLayer?.update(now);
```

Replace the two light declarations with:

```svelte
<T.AmbientLight color="#A9C5C2" intensity={0.34} />
<T.DirectionalLight color="#D9D2BD" position={[10, 20, 10]} intensity={1.05} />
```

- [ ] **Step 8: Apply the ink-metal ground palette**

Replace `client/src/scene/GroundLayer.svelte` with:

```svelte
<script lang="ts">
  import { T } from '@threlte/core';
  import { visualTheme } from '../design/visual-theme';

  let { onGroundClick }: { onGroundClick: (x: number, z: number) => void } = $props();
</script>

<T.Mesh
  rotation.x={-Math.PI / 2}
  onclick={(event: { point: { x: number; z: number } }) =>
    onGroundClick(event.point.x, event.point.z)}
>
  <T.PlaneGeometry args={[100, 100]} />
  <T.MeshStandardMaterial color={visualTheme.colors.ink950} metalness={0.12} roughness={0.92} />
</T.Mesh>
<T.GridHelper args={[100, 100, 0x2b4548, 0x17262a]} position.y={0.01} />
```

- [ ] **Step 9: Document the checkpoint and debug route**

In `client/README.md`, change the milestone row to:

```markdown
| POC 디자인 체크포인트 | `먹빛 결정` 토큰, HUD 계층, 임시 플레이어·슬라임 재질, 결정 발광 | **완료** (2026-08-03) |
```

Append to the `## 디버그` section:

```markdown

기본 HUD에서 상태 머신과 자동공격 정보는 숨긴다. 개발 서버 URL에 `?debugHud`를 추가하면 좌하단 디버그 패널에서 확인할 수 있다. 예: `http://localhost:5173/?debugHud`.

현재 플레이어와 먹물 슬라임은 `DESIGN.md`의 색·실루엣·발광 위치를 검증하는 기본 도형이다. 얼굴, 의상, 갑주, 무기, 최종 변신형을 승인한 캐릭터 디자인으로 취급하지 않는다.
```

- [ ] **Step 10: Run the complete automated verification**

Run:

```bash
cd client && npx vitest run && npm run check && npm run build
cd .. && node scripts/validate-runtime-data.mjs
```

Expected: all Vitest tests pass, Svelte/TypeScript reports 0 errors and 0 warnings, Vite build succeeds, and runtime data validation reports PASS. Based on the current 84-test baseline and the tests specified above, Vitest should report 92 passing cases.

- [ ] **Step 11: Run browser QA against the acceptance states**

Start the client:

```bash
cd client && npm run dev -- --host 127.0.0.1
```

Verify at 1280×720 and a 390×844 viewport:

1. Idle: player HP and resource panels are readable; no debug information is visible.
2. Target selected: target name, numeric HP, red HP bar, and vermilion ground ring are visible.
3. Player damaged: player numeric HP and crystal-tinted HP bar update without layout movement.
4. Target damaged: target numeric HP and danger bar update without layout movement.
5. Rewards: killing one slime updates gold and `음` quantities; resource chips do not overflow.
6. Respawn: hidden/dead slime returns with the ink body and crystal core.
7. Debug opt-in: `/?debugHud` displays state and auto-attack; the default URL does not.
8. Reduced motion: emulating `prefers-reduced-motion: reduce` stops HUD transitions and leaves WebGL crystal intensity stable.
9. Narrow viewport: player and target panels stack; the resource panel remains readable and does not cover the selected target at the center.
10. Placeholder boundary: no copy or documentation calls the current primitive meshes final character designs.

Capture screenshots for idle, selected target, first player damage, rewards, debug HUD, and narrow viewport under a new QA evidence directory selected by the execution workflow.

- [ ] **Step 12: Commit the scene and documentation changes**

```bash
git add client/src/scene client/README.md
git commit -m "feat: apply inkbound crystal scene styling"
```

---

## Self-Review Results

- **Spec coverage:** All seven acceptance criteria in `docs/superpowers/specs/2026-08-03-client-poc-visual-foundation-design.md` map to Tasks 1–3. M3 gameplay and final character design remain explicitly excluded.
- **Placeholder scan:** The plan contains no unresolved implementation markers or unspecified error-handling steps.
- **Type consistency:** Render time is consistently `number` in milliseconds from `requestAnimationFrame` through `GameScene`, `PlayerLayer`, `MonsterLayer`, `MonsterEntity`, and `glowPulse`.
- **Dependency direction:** Only `scene/` and `App.svelte` import `design/`; the pure `game/` layer remains unchanged.
- **Intermediate commits:** Every task has a passing test, check, and build gate; Task 1 keeps the original HUD call until Task 2 adds the explicit debug gate.
