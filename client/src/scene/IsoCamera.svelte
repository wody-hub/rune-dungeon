<script lang="ts">
  import { T } from '@threlte/core';
  import type { OrthographicCamera } from 'three';
  import { deriveCameraOffset, ISO_PITCH, ISO_YAW, ISO_DISTANCE } from '../game/sim/camera';
  import { getRenderedPlayerPosition, type WorldState } from '../game/sim/world';

  let { world }: { world: WorldState } = $props();

  // 오프셋 보존 하드 팔로우: lerp 없이 플레이어 위치 + 파생 오프셋을 매 프레임 재적용한다.
  const offset = deriveCameraOffset(ISO_PITCH, ISO_YAW, ISO_DISTANCE);
  let ref = $state<OrthographicCamera>();

  export function update(): void {
    if (!ref) return;
    const p = getRenderedPlayerPosition(world);
    ref.position.set(p.x + offset.x, offset.y, p.z + offset.z);
    ref.lookAt(p.x, 0, p.z);
  }
</script>

<T.OrthographicCamera makeDefault zoom={40} bind:ref oncreate={() => update()} />
