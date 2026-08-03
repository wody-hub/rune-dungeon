<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { themeCssVariables } from './design/visual-theme';
  import type { M3Action } from './game/sim/m3-progression';
  import GameScene from './scene/GameScene.svelte';
  import Hud from './ui/Hud.svelte';
  import { isDebugHudEnabled, type HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
  let scene = $state<{ requestM3Action: (action: M3Action) => void }>();
  const showDebugHud = isDebugHudEnabled(import.meta.env.DEV, window.location.search);
</script>

<div class="game-root" style={themeCssVariables()}>
  <Canvas renderMode="manual">
    <GameScene bind:this={scene} onHudChange={(snapshot) => (hud = snapshot)} />
  </Canvas>
  <Hud
    snapshot={hud}
    showDebug={showDebugHud}
    onM3Action={(action) => scene?.requestM3Action(action)}
  />
</div>

<style>
  .game-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
