<script lang="ts">
  import { playerHpFillRatio, type HudSnapshot } from './hud-model';

  let { snapshot }: { snapshot: HudSnapshot | null } = $props();

  const modeLabel = {
    idle: '대기',
    moving: '이동',
    attacking: '공격',
  } as const;
</script>

<div class="hud" aria-live="polite">
  {#if snapshot}
    <section class="hud-panel player-panel">
      <div><span>상태</span><strong>{modeLabel[snapshot.playerMode]}</strong></div>
      <div>
        <span>HP</span>
        <strong>{snapshot.playerHp} / {snapshot.playerMaxHp}</strong>
      </div>
      <div class="player-hp-track">
        <div
          class="player-hp-fill"
          style:width={`${playerHpFillRatio(snapshot.playerHp, snapshot.playerMaxHp) * 100}%`}
        ></div>
      </div>
      <div>
        <span>자동공격</span>
        <strong>{snapshot.autoAttackEnabled ? 'ON' : 'OFF'}</strong>
      </div>
      <div><span>골드</span><strong>{snapshot.gold}</strong></div>
      <div class="eum-row">
        <span>음</span>
        <strong>
          {snapshot.eum.length
            ? snapshot.eum.map(({ symbol, quantity }) => `${symbol}×${quantity}`).join(' · ')
            : '없음'}
        </strong>
      </div>
    </section>

    {#if snapshot.target}
      <section class="hud-panel target-panel">
        <strong>{snapshot.target.name}</strong>
        <span>{snapshot.target.hp} / {snapshot.target.maxHp}</span>
        <div class="hp-track">
          <div
            class="hp-fill"
            style:width={`${Math.max(0, snapshot.target.hp / snapshot.target.maxHp) * 100}%`}
          ></div>
        </div>
      </section>
    {/if}
  {/if}
</div>
