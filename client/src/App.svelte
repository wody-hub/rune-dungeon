<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { themeCssVariables } from './design/visual-theme';
  import GameScene from './scene/GameScene.svelte';
  import Hud from './ui/Hud.svelte';
  import { isDebugHudEnabled, type HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
  const showDebugHud = isDebugHudEnabled(import.meta.env.DEV, window.location.search);
</script>

<div class="game-root" style={themeCssVariables()}>
  <Canvas renderMode="manual">
    <GameScene onHudChange={(snapshot) => (hud = snapshot)} />
  </Canvas>
  <Hud snapshot={hud} showDebug={showDebugHud} />
</div>

<style>
  .game-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
