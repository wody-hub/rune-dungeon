<script lang="ts">
  import { Canvas } from '@threlte/core';
  import GameScene from './scene/GameScene.svelte';
  import Hud from './ui/Hud.svelte';
  import type { HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
</script>

<div class="game-root">
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
