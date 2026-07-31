<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import { onMount } from 'svelte';
  import { createWorld, enqueueIntent, tick } from '../game/sim/world';
  import { createFrameTimer, FRAME_TIME_MS } from '../game/loop/fixed-step';
  import IsoCamera from './IsoCamera.svelte';
  import GroundLayer from './GroundLayer.svelte';
  import MonsterLayer from './MonsterLayer.svelte';
  import PlayerLayer from './PlayerLayer.svelte';
  import {
    intentsForMonsterGesture,
    type MonsterGesture,
  } from './monster-input';

  interactivity();
  const { advance } = useThrelte();

  // 월드 상태는 반응성 그래프 밖의 plain object다. 프레임마다 바뀌는 값을
  // Svelte 반응성에 올리지 않고, 루프가 레이어 update()를 직접 호출한다.
  const world = createWorld();
  if (import.meta.env.DEV) {
    (window as unknown as { __world: unknown }).__world = world;
  }

  let camera = $state<{ update: () => void }>();
  let monsterLayer = $state<{ update: () => void }>();
  let playerLayer = $state<{ update: () => void }>();

  function handleMonsterGesture(monsterId: string, gesture: MonsterGesture): void {
    for (const intent of intentsForMonsterGesture(monsterId, gesture)) {
      enqueueIntent(world, intent);
    }
  }

  onMount(() => {
    const timer = createFrameTimer(performance.now());
    const dt = FRAME_TIME_MS / 1000;
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const steps = timer.advance(now);
      if (steps === 0) return;
      for (let i = 0; i < steps; i++) tick(world, dt);
      playerLayer?.update();
      monsterLayer?.update();
      camera?.update();
      advance();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
</script>

<IsoCamera bind:this={camera} {world} />

<T.AmbientLight intensity={0.6} />
<T.DirectionalLight position={[10, 20, 10]} intensity={1.2} />

<GroundLayer
  onGroundClick={(x, z) => enqueueIntent(world, { type: 'move_to_ground', point: { x, z } })}
/>
<MonsterLayer bind:this={monsterLayer} {world} onMonsterGesture={handleMonsterGesture} />
<PlayerLayer bind:this={playerLayer} {world} />
