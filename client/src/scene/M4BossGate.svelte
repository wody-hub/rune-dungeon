<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import type { Group, MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { M4Area } from '../game/sim/m4-scenario';

  let {
    inputEnabled = true,
    onEnter,
  }: {
    inputEnabled?: boolean;
    onEnter: () => void;
  } = $props();
  let group = $state<Group>();
  let seal = $state<MeshStandardMaterial>();
  let open = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  export function update(area: M4Area, unlocked: boolean, nowMs: number): void {
    if (!group) return;
    group.visible = area === 'blackheart_mine';
    open = unlocked;
    if (seal) {
      seal.emissiveIntensity = unlocked
        ? reducedMotion
          ? 0.42
          : 0.32 + 0.1 * (1 - Math.cos((nowMs / 1_200) * Math.PI))
        : 0.04;
    }
  }
</script>

<T.Group bind:ref={group} position={[0, 0, 7]}>
  <T.Mesh
    position.y={1.1}
    scale={[2.2, 2.2, 0.25]}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!inputEnabled) return;
      if (open) onEnter();
    }}
  >
    <T.BoxGeometry />
    <T.MeshStandardMaterial color="#182328" metalness={0.74} roughness={0.35} />
  </T.Mesh>
  <T.Mesh position={[0, 1.1, 0.28]} scale={[0.28, 0.48, 0.08]}>
    <T.OctahedronGeometry />
    <T.MeshStandardMaterial
      bind:ref={seal}
      color={visualTheme.colors.crystalGlow}
      emissive={visualTheme.colors.crystalGlow}
      emissiveIntensity={0.04}
    />
  </T.Mesh>
</T.Group>
