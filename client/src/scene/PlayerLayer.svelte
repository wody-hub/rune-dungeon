<script lang="ts">
  import { T } from '@threlte/core';
  import type { Group } from 'three';
  import type { WorldState } from '../game/sim/world';

  let { world }: { world: WorldState } = $props();
  let group = $state<Group>();

  export function update(): void {
    if (!group) return;
    group.position.set(world.player.pos.x, 0, world.player.pos.z);
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh position.y={0.85}>
    <T.CapsuleGeometry args={[0.4, 0.9, 8, 16]} />
    <T.MeshStandardMaterial color="#7fb2ff" />
  </T.Mesh>
</T.Group>
