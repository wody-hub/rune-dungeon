<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { themeCssVariables } from './design/visual-theme';
  import type { M3Action } from './game/sim/m3-progression';
  import GameScene from './scene/GameScene.svelte';
  import ConnectionNotice from './ui/ConnectionNotice.svelte';
  import Hud from './ui/Hud.svelte';
  import type { ConnectionState } from './net/connection';
  import { isDebugHudEnabled, type HudSnapshot } from './ui/hud-model';

  let hud = $state<HudSnapshot | null>(null);
  let scene = $state<{ requestM3Action: (action: M3Action) => void }>();
  let connectionState = $state<ConnectionState | null>(null);
  const serverUrl = new URLSearchParams(window.location.search).get('server');
  const authorityDemo = serverUrl !== null;
  const showDebugHud = isDebugHudEnabled(import.meta.env.DEV, window.location.search);
</script>

<div class="game-root" style={themeCssVariables()}>
  <Canvas renderMode="manual">
    <GameScene
      bind:this={scene}
      {serverUrl}
      onHudChange={(snapshot) => (hud = snapshot)}
      onConnectionStateChange={(state) => (connectionState = state)}
    />
  </Canvas>
  <Hud
    snapshot={hud}
    showDebug={showDebugHud}
    {authorityDemo}
    onM3Action={(action) => scene?.requestM3Action(action)}
  />
  <ConnectionNotice
    state={connectionState}
    {authorityDemo}
    onReload={() => window.location.reload()}
  />
</div>

<style>
  .game-root {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
