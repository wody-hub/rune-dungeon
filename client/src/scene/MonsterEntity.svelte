<script lang="ts">
  import { T } from '@threlte/core';
  import type { IntersectionEvent } from '@threlte/extras';
  import { BackSide, Color, type Group, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import type { MonsterState } from '../game/sim/entities/monster';
  import type { MonsterGesture } from './monster-input';
  import { glowPulse, monsterVisualState, transientPulse } from './visual-state';

  let {
    monster,
    onGesture,
  }: {
    monster: MonsterState;
    onGesture: (gesture: MonsterGesture) => void;
  } = $props();

  let group = $state<Group>();
  let bodyMaterial = $state<MeshStandardMaterial>();
  let coreMaterial = $state<MeshStandardMaterial>();
  let selectionRing = $state<Mesh>();
  let selectionRingMaterial = $state<MeshBasicMaterial>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const impactColor = new Color(visualTheme.colors.paperText);
  let previousHp: number | null = null;
  let damageStartedAtMs: number | null = null;

  export function update(selected: boolean, nowMs: number): void {
    if (!group) return;
    if (previousHp !== null && monster.hp < previousHp) damageStartedAtMs = nowMs;
    group.position.set(monster.pos.x, 0, monster.pos.z);
    group.visible = monster.alive;
    const visual = monsterVisualState(selected);
    const damagePulse = transientPulse(nowMs, damageStartedAtMs, reducedMotion);
    bodyMaterial?.color.set(visual.body).lerp(impactColor, damagePulse * 0.48);
    if (coreMaterial) {
      coreMaterial.color.set(visual.core);
      coreMaterial.emissive.set(visual.core);
      coreMaterial.emissiveIntensity =
        glowPulse(nowMs, reducedMotion) + visual.coreBoost + damagePulse * 0.72;
    }
    if (selectionRing) selectionRing.visible = monster.alive && visual.ringVisible;
    if (selectionRingMaterial) selectionRingMaterial.color.set(visual.ring);
    previousHp = monster.hp;
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh position.y={0.55} scale={[0.95, 0.7, 0.95]}>
    <T.SphereGeometry args={[0.65, 20, 14]} />
    <T.MeshBasicMaterial color="#46585F" side={BackSide} />
  </T.Mesh>
  <T.Mesh
    position.y={0.55}
    scale={[0.9, 0.65, 0.9]}
    onclick={(event: IntersectionEvent<MouseEvent>) => {
      if (!monster.alive) return;
      event.stopPropagation();
      onGesture('select');
    }}
    ondblclick={(event: IntersectionEvent<MouseEvent>) => {
      if (!monster.alive) return;
      event.stopPropagation();
      onGesture('start_auto_attack');
    }}
  >
    <T.SphereGeometry args={[0.65, 20, 14]} />
    <T.MeshStandardMaterial bind:ref={bodyMaterial} color="#344349" metalness={0.22} roughness={0.72} />
  </T.Mesh>
  <T.Mesh position={[0.16, 0.59, 0.48]} scale={[0.16, 0.2, 0.1]}>
    <T.OctahedronGeometry args={[0.5, 0]} />
    <T.MeshStandardMaterial
      bind:ref={coreMaterial}
      color={visualTheme.colors.crystalGlow}
      emissive={visualTheme.colors.crystalGlow}
      emissiveIntensity={0.35}
    />
  </T.Mesh>
  <T.Mesh position={[-0.16, 0.67, 0.55]} scale={[0.035, 0.08, 0.025]}>
    <T.SphereGeometry args={[1, 8, 6]} />
    <T.MeshBasicMaterial color={visualTheme.colors.paperText} />
  </T.Mesh>
  <T.Mesh position={[0.02, 0.67, 0.58]} scale={[0.035, 0.08, 0.025]}>
    <T.SphereGeometry args={[1, 8, 6]} />
    <T.MeshBasicMaterial color={visualTheme.colors.paperText} />
  </T.Mesh>
  <T.Mesh bind:ref={selectionRing} position.y={0.04} rotation.x={Math.PI / 2} visible={false}>
    <T.TorusGeometry args={[0.78, 0.035, 8, 32]} />
    <T.MeshBasicMaterial bind:ref={selectionRingMaterial} color={visualTheme.colors.sealVermilion} />
  </T.Mesh>
</T.Group>
