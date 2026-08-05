<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { onMount, untrack } from 'svelte';
  import {
    applyAuthoritativePlayerPosition,
    applyAuthoritativePlayerSnapshot,
    createWorld,
    enqueueIntent,
    tick,
  } from '../game/sim/world';
  import type { M3Action } from '../game/sim/m3-progression';
  import type { M4Area } from '../game/sim/m4-scenario';
  import { createFrameTimer, FRAME_TIME_MS } from '../game/loop/fixed-step';
  import {
    createHudSnapshot,
    hudSnapshotsEqual,
    type HudSnapshot,
  } from '../ui/hud-model';
  import IsoCamera from './IsoCamera.svelte';
  import GroundLayer from './GroundLayer.svelte';
  import MonsterLayer from './MonsterLayer.svelte';
  import M3SupplyCache from './M3SupplyCache.svelte';
  import M4BossGate from './M4BossGate.svelte';
  import PlayerLayer from './PlayerLayer.svelte';
  import {
    intentsForMonsterGesture,
    type MonsterGesture,
  } from './monster-input';
  import { ServerConnection, type ConnectionState } from '../net/connection';

  interactivity();
  const { advance } = useThrelte();

  let {
    onHudChange,
    serverUrl = null,
    onConnectionStateChange,
  }: {
    onHudChange: (snapshot: HudSnapshot) => void;
    serverUrl?: string | null;
    onConnectionStateChange: (state: ConnectionState | null) => void;
  } = $props();

  let lastHud: HudSnapshot | undefined;
  const initialServerUrl = untrack(() => serverUrl);
  const authorityDemo = initialServerUrl !== null;

  // 월드 상태는 반응성 그래프 밖의 plain object다. 프레임마다 바뀌는 값을
  // Svelte 반응성에 올리지 않고, 루프가 레이어 update()를 직접 호출한다.
  const world = createWorld({
    scenario: 'm4',
    playerMovement: authorityDemo ? 'authoritative' : 'local',
  });
  if (import.meta.env.DEV) {
    (window as unknown as { __world: unknown }).__world = world;
  }

  let camera = $state<{ update: () => void }>();
  let monsterLayer = $state<{ update: (nowMs: number) => void }>();
  let playerLayer = $state<{
    update: (nowMs: number, transformed: boolean, transformationSequence: number) => void;
  }>();
  let supplyCache = $state<{ update: (visible: boolean, nowMs: number) => void }>();
  let bossGate = $state<{
    update: (area: M4Area, unlocked: boolean, nowMs: number) => void;
  }>();
  let connection: ServerConnection | null = null;

  export function requestM3Action(action: M3Action): void {
    if (authorityDemo) {
      if (action === 'toggle_m3_transformation') {
        connection?.sendToggleTransformation();
      }
      return;
    }
    enqueueIntent(world, { type: action });
  }

  function publishHud(): void {
    const next = createHudSnapshot(world);
    if (lastHud && hudSnapshotsEqual(lastHud, next)) return;
    lastHud = next;
    onHudChange(next);
  }

  function handleMonsterGesture(monsterId: string, gesture: MonsterGesture): void {
    if (authorityDemo) return;
    for (const intent of intentsForMonsterGesture(monsterId, gesture)) {
      enqueueIntent(world, intent);
    }
  }

  function handleGroundClick(x: number, z: number): void {
    if (authorityDemo) {
      connection?.sendMove({ x, z });
      return;
    }
    enqueueIntent(world, { type: 'move_to_ground', point: { x, z } });
  }

  function handleBossGateEntry(): void {
    if (authorityDemo) return;
    enqueueIntent(world, { type: 'enter_m4_boss_room' });
  }

  onMount(() => {
    if (initialServerUrl !== null) {
      connection = new ServerConnection({
        url: initialServerUrl,
        clientVersion: '0.0.0',
        nickname: '모험가',
        onState: onConnectionStateChange,
        onJoin: (position) => {
          applyAuthoritativePlayerPosition(world, position);
          publishHud();
        },
        onSnapshot: (snapshot) => {
          applyAuthoritativePlayerSnapshot(world, snapshot.player);
          publishHud();
        },
      });
      connection.connect();
    }
    publishHud();
    const timer = createFrameTimer(performance.now());
    const dt = FRAME_TIME_MS / 1000;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const steps = timer.advance(now);
      if (steps === 0) return;
      for (let i = 0; i < steps; i++) tick(world, dt);
      playerLayer?.update(now, world.m3.transformed, world.m3.transformationSequence);
      monsterLayer?.update(now);
      supplyCache?.update(world.m3.cacheAvailable && !world.m3.cacheCollected, now);
      if (world.m4) bossGate?.update(world.m4.area, world.m4.gateUnlocked, now);
      camera?.update();
      publishHud();
      advance();
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      connection?.dispose();
      connection = null;
      onConnectionStateChange(null);
    };
  });
</script>

<IsoCamera bind:this={camera} {world} />

<T.AmbientLight color="#A9C5C2" intensity={0.34} />
<T.DirectionalLight color="#D9D2BD" position={[10, 20, 10]} intensity={1.05} />

<GroundLayer onGroundClick={handleGroundClick} />
<M4BossGate
  bind:this={bossGate}
  inputEnabled={!authorityDemo}
  onEnter={handleBossGateEntry}
/>
<MonsterLayer
  bind:this={monsterLayer}
  {world}
  inputEnabled={!authorityDemo}
  onMonsterGesture={handleMonsterGesture}
/>
<M3SupplyCache
  bind:this={supplyCache}
  inputEnabled={!authorityDemo}
  onCollect={requestM3Action}
/>
<PlayerLayer bind:this={playerLayer} {world} />
