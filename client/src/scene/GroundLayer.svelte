<script lang="ts">
  import { T } from '@threlte/core';

  let { onGroundClick }: { onGroundClick: (x: number, z: number) => void } = $props();
</script>

<T.Mesh
  rotation.x={-Math.PI / 2}
  onclick={(e: { point: { x: number; z: number } }) => onGroundClick(e.point.x, e.point.z)}
>
  <T.PlaneGeometry args={[100, 100]} />
  <T.MeshStandardMaterial color="#4a5d3a" />
</T.Mesh>
<T.GridHelper args={[100, 100, 0x3a4a34, 0x2a3a24]} position.y={0.01} />
