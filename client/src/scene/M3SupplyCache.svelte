<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import type { Group, MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { M3Action } from '../game/sim/m3-progression';
  import { glowPulse } from './visual-state';

  let {
    inputEnabled = true,
    onCollect,
  }: {
    inputEnabled?: boolean;
    onCollect: (action: M3Action) => void;
  } = $props();
  let group = $state<Group>();
  let coreMaterial = $state<MeshStandardMaterial>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(visible: boolean, nowMs: number): void {
    if (!group) return;
    group.visible = visible;
    if (coreMaterial) coreMaterial.emissiveIntensity = glowPulse(nowMs, reducedMotion) + 0.16;
  }
</script>

<!-- M3-only functional cache, not final prop art. -->
<T.Group bind:ref={group} position={[-1.8, 0, -1.4]} visible={false}>
  <T.Mesh
    position.y={0.3}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!inputEnabled) return;
      onCollect('collect_m3_supply_cache');
    }}
  >
    <T.BoxGeometry args={[0.68, 0.56, 0.68]} />
    <T.MeshStandardMaterial color={visualTheme.colors.metalSurface} metalness={0.66} roughness={0.34} />
  </T.Mesh>
  <T.Mesh position={[0, 0.68, 0]} scale={[0.2, 0.3, 0.2]}>
    <T.OctahedronGeometry args={[0.5, 0]} />
    <T.MeshStandardMaterial
      bind:ref={coreMaterial}
      color={visualTheme.colors.crystalGlow}
      emissive={visualTheme.colors.crystalGlow}
      emissiveIntensity={0.51}
    />
  </T.Mesh>
</T.Group>
