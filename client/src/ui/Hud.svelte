<script lang="ts">
  import { playerHpFillRatio, type HudSnapshot } from './hud-model';

  let {
    snapshot,
    showDebug = false,
  }: {
    snapshot: HudSnapshot | null;
    showDebug?: boolean;
  } = $props();

  const modeLabel = {
    idle: '대기',
    moving: '이동',
    attacking: '공격',
  } as const;
</script>

<div class="hud" aria-live="polite">
  {#if snapshot}
    <section class="hud-panel player-panel" aria-label="플레이어 상태">
      <span class="panel-kicker">PLAYER · 방랑자</span>
      <div class="panel-heading">
        <strong>생명</strong>
        <b>{snapshot.playerHp} / {snapshot.playerMaxHp}</b>
      </div>
      <div class="hp-track player-hp-track" aria-hidden="true">
        <div
          class="hp-fill player-hp-fill"
          style:width={`${playerHpFillRatio(snapshot.playerHp, snapshot.playerMaxHp) * 100}%`}
        ></div>
      </div>
    </section>

    {#if snapshot.target}
      <section class="hud-panel target-panel" aria-label="선택 대상">
        <span class="panel-kicker">TARGET</span>
        <div class="panel-heading target-heading">
          <strong>{snapshot.target.name}</strong>
          <b>{snapshot.target.hp} / {snapshot.target.maxHp}</b>
        </div>
        <div class="hp-track" aria-hidden="true">
          <div
            class="hp-fill target-hp-fill"
            style:width={`${Math.max(0, snapshot.target.hp / snapshot.target.maxHp) * 100}%`}
          ></div>
        </div>
      </section>
    {/if}

    <section class="hud-panel resource-panel" aria-label="보유 자원">
      <span class="panel-kicker">ACQUIRED · 보유 자원</span>
      <div class="gold-row"><span>골드</span><b>{snapshot.gold}</b></div>
      <div class="eum-grid">
        {#each snapshot.eum as stack (stack.symbol)}
          <div class="eum-chip">
            <strong>{stack.symbol}</strong>
            <span>×{stack.quantity}</span>
          </div>
        {/each}
      </div>
    </section>

    {#if showDebug}
      <aside class="hud-panel debug-panel" aria-label="개발 정보">
        <span class="panel-kicker">DEBUG</span>
        <div><span>상태</span><b>{modeLabel[snapshot.playerMode]}</b></div>
        <div><span>자동공격</span><b>{snapshot.autoAttackEnabled ? 'ON' : 'OFF'}</b></div>
      </aside>
    {/if}
  {/if}
</div>

<style>
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: var(--rd-paper-text);
    font-family: "SUIT Variable", sans-serif;
  }

  .hud-panel {
    position: absolute;
    padding: 13px 15px;
    border: 1px solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-crystal-glow);
    border-radius: 2px;
    background: linear-gradient(135deg, rgb(24 35 40 / 92%), rgb(13 20 24 / 88%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 2px 0 var(--rd-crystal-glow);
    backdrop-filter: blur(8px);
  }

  .panel-kicker {
    display: block;
    color: var(--rd-muted-text);
    font: 600 10px/1.2 "IBM Plex Mono", monospace;
    letter-spacing: 0.12em;
  }

  .panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px;
    margin-top: 7px;
  }

  .panel-heading strong {
    font: 700 15px/1.2 "Gowun Batang", serif;
  }

  .panel-heading b,
  .gold-row b,
  .debug-panel b {
    font: 600 11px/1.2 "IBM Plex Mono", monospace;
  }

  .player-panel { top: 16px; left: 16px; width: 230px; }

  .target-panel {
    top: 16px;
    left: 50%;
    width: min(330px, calc(100vw - 300px));
    transform: translateX(-50%);
    border-left-color: color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-bottom-color: var(--rd-seal-vermilion);
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 0 -2px var(--rd-seal-vermilion);
    text-align: center;
  }

  .target-heading { justify-content: center; }

  .resource-panel { right: 16px; bottom: 16px; width: 250px; }

  .gold-row {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    padding-bottom: 9px;
    border-bottom: 1px solid color-mix(in srgb, var(--rd-paper-text) 12%, transparent);
  }

  .gold-row span { color: var(--rd-muted-text); font-size: 12px; }

  .eum-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 9px; }

  .eum-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--rd-crystal-glow) 30%, transparent);
    background: color-mix(in srgb, var(--rd-crystal-glow) 6%, transparent);
  }

  .eum-chip strong { color: var(--rd-crystal-glow); font: 700 14px "Gowun Batang", serif; }
  .eum-chip span { font: 500 9px "IBM Plex Mono", monospace; }

  .debug-panel { left: 16px; bottom: 16px; width: 180px; opacity: 0.78; }
  .debug-panel > div { display: flex; justify-content: space-between; margin-top: 7px; font-size: 11px; }

  .hp-track { height: 6px; margin-top: 9px; overflow: hidden; background: #263138; }
  .hp-fill { height: 100%; transition: width 100ms linear; }
  .player-hp-fill { background: linear-gradient(90deg, #4c9b7c, var(--rd-crystal-glow)); box-shadow: 0 0 14px var(--rd-crystal-glow); }
  .target-hp-fill { background: linear-gradient(90deg, #7c3038, var(--rd-danger)); box-shadow: 0 0 12px color-mix(in srgb, var(--rd-danger) 48%, transparent); }

  @media (max-width: 720px) {
    .player-panel { width: calc(100vw - 32px); }
    .target-panel { top: 112px; width: calc(100vw - 32px); }
    .resource-panel { width: calc(100vw - 32px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-fill { transition: none; }
  }
</style>
