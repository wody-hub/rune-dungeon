<script lang="ts">
  import { Canvas } from '@threlte/core';
  import GameScene from './scene/GameScene.svelte';
</script>

<!-- renderMode="manual": 게임 루프가 advance()로 렌더를 주도한다. HUD는 이후 Canvas 형제로 추가. -->
<div class="game-root">
  <Canvas renderMode="manual">
    <GameScene />
  </Canvas>
</div>

<style>
  .game-root {
    width: 100%;
    height: 100%;
  }
</style>
