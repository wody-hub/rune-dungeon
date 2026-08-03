<script lang="ts">
  import { T } from '@threlte/core';
  import { visualTheme } from '../design/visual-theme';

  let { onGroundClick }: { onGroundClick: (x: number, z: number) => void } = $props();
</script>

<T.Mesh
  rotation.x={-Math.PI / 2}
  onclick={(event: { point: { x: number; z: number } }) =>
    onGroundClick(event.point.x, event.point.z)}
>
  <T.PlaneGeometry args={[100, 100]} />
  <T.MeshStandardMaterial color={visualTheme.colors.ink950} metalness={0.12} roughness={0.92} />
</T.Mesh>
<T.GridHelper args={[100, 100, 0x2b4548, 0x17262a]} position.y={0.01} />
