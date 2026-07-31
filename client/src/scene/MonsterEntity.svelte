<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import type { Group, Mesh, MeshStandardMaterial } from 'three';
  import type { MonsterState } from '../game/sim/entities/monster';
  import type { MonsterGesture } from './monster-input';

  let {
    monster,
    onGesture,
  }: {
    monster: MonsterState;
    onGesture: (gesture: MonsterGesture) => void;
  } = $props();

  let group = $state<Group>();
  let bodyMaterial = $state<MeshStandardMaterial>();
  let selectionRing = $state<Mesh>();

  export function update(selected: boolean): void {
    if (!group) return;
    group.position.set(monster.pos.x, 0, monster.pos.z);
    group.visible = monster.alive;
    bodyMaterial?.color.set(selected ? '#ffca5c' : '#34243f');
    if (selectionRing) selectionRing.visible = monster.alive && selected;
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh
    position.y={0.55}
    scale={[0.9, 0.65, 0.9]}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!monster.alive) return;
      onGesture('select');
    }}
    ondblclick={(event: IntersectionEvent<MouseEvent>) => {
      event.stopPropagation();
      if (!monster.alive) return;
      onGesture('start_auto_attack');
    }}
  >
    <T.SphereGeometry args={[0.65, 20, 14]} />
    <T.MeshStandardMaterial bind:ref={bodyMaterial} color="#34243f" />
  </T.Mesh>
  <T.Mesh
    bind:ref={selectionRing}
    position.y={0.04}
    rotation.x={Math.PI / 2}
    visible={false}
  >
    <T.TorusGeometry args={[0.78, 0.06, 8, 32]} />
    <T.MeshBasicMaterial color="#ffd369" />
  </T.Mesh>
</T.Group>
