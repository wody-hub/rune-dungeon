<script lang="ts">
  import { T } from '@threlte/core';
  import {
    BackSide,
    Color,
    type Group,
    type Mesh,
    type MeshBasicMaterial,
    type MeshStandardMaterial,
  } from 'three';
  import { visualTheme } from '../design/visual-theme';
  import { getRenderedPlayerPosition, type WorldState } from '../game/sim/world';
  import { glowPulse, transformationProgress, transientPulse } from './visual-state';

  let { world }: { world: WorldState } = $props();
  let group = $state<Group>();
  let bodyMaterial = $state<MeshStandardMaterial>();
  let coreMaterial = $state<MeshStandardMaterial>();
  let weaponMaterial = $state<MeshStandardMaterial>();
  let aura = $state<Mesh>();
  let auraMaterial = $state<MeshBasicMaterial>();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bodyBaseColor = new Color('#40545C');
  const impactColor = new Color(visualTheme.colors.paperText);
  let previousHp: number | null = null;
  let previousAttackElapsedMs = 0;
  let previousMode: typeof world.player.mode | null = null;
  let damageStartedAtMs: number | null = null;
  let attackStartedAtMs: number | null = null;
  let previousTransformationSequence = 0;
  let transformationStartedAtMs: number | null = null;

  export function update(nowMs: number, transformed: boolean, transformationSequence: number): void {
    if (!group) return;
    if (previousHp !== null && world.player.hp < previousHp) damageStartedAtMs = nowMs;
    if (
      world.player.mode === 'attacking' &&
      (previousMode !== 'attacking' || world.player.attackElapsedMs < previousAttackElapsedMs)
    ) {
      attackStartedAtMs = nowMs;
    }
    const position = getRenderedPlayerPosition(world);
    group.position.set(position.x, 0, position.z);
    const damagePulse = transientPulse(nowMs, damageStartedAtMs, reducedMotion);
    const attackPulse = transientPulse(nowMs, attackStartedAtMs, reducedMotion);
    if (transformationSequence > previousTransformationSequence) transformationStartedAtMs = nowMs;
    const transformation = transformationProgress(nowMs, transformationStartedAtMs, reducedMotion);
    const fireIntensity = transformed ? 0.38 + transformation * 0.52 : 0;
    bodyMaterial?.color.copy(bodyBaseColor).lerp(impactColor, damagePulse * 0.38);
    if (coreMaterial) coreMaterial.emissiveIntensity = glowPulse(nowMs, reducedMotion);
    if (weaponMaterial) {
      weaponMaterial.emissive.set(transformed ? visualTheme.colors.fireGyeol : visualTheme.colors.crystalGlow);
      weaponMaterial.emissiveIntensity = (transformed ? fireIntensity : 0.04) + attackPulse * 0.9;
    }
    if (aura) {
      aura.visible = transformed;
      aura.scale.setScalar(1 + transformation * 0.22);
    }
    if (auraMaterial) {
      auraMaterial.color.set(visualTheme.colors.fireGyeol);
      auraMaterial.opacity = transformed ? 0.2 + transformation * 0.25 : 0;
    }
    previousHp = world.player.hp;
    previousAttackElapsedMs = world.player.attackElapsedMs;
    previousMode = world.player.mode;
    previousTransformationSequence = transformationSequence;
  }
</script>

<T.Group bind:ref={group}>
  <T.Mesh bind:ref={aura} position.y={0.06} rotation.x={Math.PI / 2} visible={false}>
    <T.TorusGeometry args={[0.84, 0.025, 8, 32]} />
    <T.MeshBasicMaterial
      bind:ref={auraMaterial}
      color={visualTheme.colors.fireGyeol}
      transparent
      opacity={0}
      depthWrite={false}
    />
  </T.Mesh>
  <!-- Primitive geometry remains an explicitly temporary silhouette. -->
  <T.Mesh position.y={0.86} scale={[0.86, 1.04, 0.76]}>
    <T.CapsuleGeometry args={[0.4, 0.9, 8, 12]} />
    <T.MeshBasicMaterial color="#52666D" side={BackSide} />
  </T.Mesh>
  <T.Mesh position.y={0.86} scale={[0.82, 1, 0.72]}>
    <T.CapsuleGeometry args={[0.4, 0.9, 8, 12]} />
    <T.MeshStandardMaterial bind:ref={bodyMaterial} color="#40545C" metalness={0.42} roughness={0.52} />
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
      <T.MeshStandardMaterial
        bind:ref={weaponMaterial}
        color="#41565E"
        emissive={visualTheme.colors.crystalGlow}
        emissiveIntensity={0.04}
        metalness={0.82}
        roughness={0.28}
      />
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
