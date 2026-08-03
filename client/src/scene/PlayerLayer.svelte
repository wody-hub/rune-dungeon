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
