<script lang="ts">
  import {
    getMonsterDefinition,
    isMonsterActive,
    type WorldState,
  } from '../game/sim/world';
  import type { BossPhase } from '../game/sim/boss-state';
  import MonsterEntity from './MonsterEntity.svelte';
  import type { MonsterGesture } from './monster-input';

  let {
    world,
    onMonsterGesture,
  }: {
    world: WorldState;
    onMonsterGesture: (monsterId: string, gesture: MonsterGesture) => void;
  } = $props();

  const monsters = $derived([...world.monsters.values()]);
  let entities = $state<
    Array<{
      update: (
        selected: boolean,
        active: boolean,
        nowMs: number,
        bossPhase?: BossPhase,
      ) => void;
    } | undefined>
  >([]);

  export function update(nowMs: number): void {
    for (let index = 0; index < monsters.length; index += 1) {
      const monster = monsters[index];
      entities[index]?.update(
        world.player.combatTargetId === monster.entityId,
        isMonsterActive(world, monster),
        nowMs,
        world.m4?.boss.phase,
      );
    }
  }
</script>

{#each monsters as monster, index (monster.entityId)}
  <MonsterEntity
    bind:this={entities[index]}
    {monster}
    definition={getMonsterDefinition(world, monster)}
    onGesture={(gesture) => onMonsterGesture(monster.entityId, gesture)}
  />
{/each}
