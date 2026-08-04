<script lang="ts">
  import type { M3Action } from '../game/sim/m3-progression';
  import M3ProgressPanel from './M3ProgressPanel.svelte';
  import { playerHpFillRatio, type HudSnapshot } from './hud-model';

  let {
    snapshot,
    showDebug = false,
    onM3Action,
  }: {
    snapshot: HudSnapshot | null;
    showDebug?: boolean;
    onM3Action: (action: M3Action) => void;
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
      {#if snapshot.m3.currentGyeolId}
        <span class="current-gyeol-label">현재 결 · 화</span>
      {/if}
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
        {#if snapshot.m4?.boss}
          <p
            class="boss-state"
            class:boss-exposed={snapshot.m4.boss.phase === 'exposed'}
            class:boss-groggy={snapshot.m4.boss.phase === 'groggy'}
          >
            {snapshot.m4.boss.phase === 'armored'
              ? '단단한 심'
              : snapshot.m4.boss.phase === 'exposed'
                ? '약점 노출'
                : '그로기'}
            · {Math.ceil(snapshot.m4.boss.remainingMs / 1000)}초
          </p>
        {/if}
      </section>
    {/if}

    {#if snapshot.m4}
      <section class="quest-objective" aria-label="현재 의뢰">
        <span>의뢰 · 흑심 채굴장의 기사단장</span>
        <strong>{snapshot.m4?.objective}</strong>
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

    <M3ProgressPanel snapshot={snapshot.m3} onAction={onM3Action} />

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
    font-family: var(--rd-font-body);
  }

  .hud-panel {
    box-sizing: border-box;
    position: absolute;
    padding: var(--rd-panel-padding-block) var(--rd-panel-padding-inline);
    border: var(--rd-panel-border-width) solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-crystal-glow);
    border-radius: var(--rd-radius-sm);
    background: linear-gradient(135deg, rgb(24 35 40 / 92%), rgb(13 20 24 / 88%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 2px 0 var(--rd-crystal-glow);
    backdrop-filter: blur(var(--rd-space-sm));
  }

  .panel-kicker {
    display: block;
    color: var(--rd-muted-text);
    font: 600 var(--rd-type-label-size)/1.2 var(--rd-font-data);
    letter-spacing: 0.12em;
  }

  .panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--rd-space-md);
    margin-top: var(--rd-space-sm);
  }

  .panel-heading strong {
    font: 700 var(--rd-type-emphasized-size)/1.2 var(--rd-font-display);
  }

  .panel-heading b,
  .gold-row b,
  .debug-panel b {
    font: 600 var(--rd-type-label-size)/1.2 var(--rd-font-data);
  }

  .player-panel { top: var(--rd-panel-inset); left: var(--rd-panel-inset); width: var(--rd-panel-player-width); }

  .current-gyeol-label {
    display: block;
    margin-top: var(--rd-space-sm);
    color: var(--rd-fire-gyeol);
    font: 700 var(--rd-type-label-size)/1.2 var(--rd-font-display);
  }

  .target-panel {
    top: var(--rd-panel-inset);
    left: 50%;
    width: min(var(--rd-panel-target-width), calc(100vw - 300px));
    transform: translateX(-50%);
    border-left-color: color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-bottom-color: var(--rd-seal-vermilion);
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 0 -2px var(--rd-seal-vermilion);
    text-align: center;
  }

  .target-heading { justify-content: center; }

  .boss-state {
    margin: var(--rd-space-sm) 0 0;
    color: var(--rd-muted-text);
    font: 700 var(--rd-type-label-size)/1.2 var(--rd-font-data);
  }

  .boss-exposed { color: var(--rd-fire-gyeol); }
  .boss-groggy { color: var(--rd-crystal-glow); }

  .quest-objective {
    box-sizing: border-box;
    position: absolute;
    top: 92px;
    left: 50%;
    width: min(330px, calc(100vw - 300px));
    padding: var(--rd-space-sm) var(--rd-panel-padding-inline);
    transform: translateX(-50%);
    pointer-events: none;
    border: var(--rd-panel-border-width) solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-fire-gyeol);
    border-radius: var(--rd-radius-sm);
    background: linear-gradient(135deg, rgb(24 35 40 / 90%), rgb(13 20 24 / 86%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 28%), inset 2px 0 var(--rd-fire-gyeol);
    text-align: center;
  }

  .quest-objective span,
  .quest-objective strong {
    display: block;
  }

  .quest-objective span {
    color: var(--rd-muted-text);
    font: 600 var(--rd-type-label-size)/1.2 var(--rd-font-data);
    letter-spacing: 0.08em;
  }

  .quest-objective strong {
    margin-top: var(--rd-space-xs);
    font: 700 var(--rd-type-body-size)/1.3 var(--rd-font-display);
  }

  .resource-panel { right: var(--rd-panel-inset); bottom: var(--rd-panel-inset); width: var(--rd-panel-resource-width); }

  .gold-row {
    display: flex;
    justify-content: space-between;
    margin-top: var(--rd-space-sm);
    padding-bottom: var(--rd-space-sm);
    border-bottom: 1px solid color-mix(in srgb, var(--rd-paper-text) 12%, transparent);
  }

  .gold-row span { color: var(--rd-muted-text); font-size: var(--rd-type-body-size); }

  .eum-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--rd-space-sm); margin-top: var(--rd-space-sm); }

  .eum-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    padding: var(--rd-space-xs) var(--rd-space-sm);
    border: 1px solid color-mix(in srgb, var(--rd-crystal-glow) 30%, transparent);
    background: color-mix(in srgb, var(--rd-crystal-glow) 6%, transparent);
  }

  .eum-chip strong { color: var(--rd-crystal-glow); font: 700 var(--rd-type-emphasized-size) var(--rd-font-display); }
  .eum-chip span { font: 500 var(--rd-type-label-size) var(--rd-font-data); }

  .debug-panel { left: var(--rd-panel-inset); bottom: var(--rd-panel-inset); width: var(--rd-panel-debug-width); opacity: 0.78; }
  .debug-panel > div { display: flex; justify-content: space-between; margin-top: var(--rd-space-sm); font-size: var(--rd-type-label-size); }

  .hp-track { height: 6px; margin-top: var(--rd-space-sm); overflow: hidden; background: #263138; }
  .hp-fill { height: 100%; transition: width var(--rd-motion-micro) linear; }
  .player-hp-fill { background: linear-gradient(90deg, #4c9b7c, var(--rd-crystal-glow)); box-shadow: 0 0 14px var(--rd-crystal-glow); }
  .target-hp-fill { background: linear-gradient(90deg, #7c3038, var(--rd-danger)); box-shadow: 0 0 12px color-mix(in srgb, var(--rd-danger) 48%, transparent); }

  @media (max-width: 720px) {
    .player-panel { width: calc(100vw - var(--rd-panel-mobile-gutter)); }
    .target-panel { top: var(--rd-panel-mobile-target-top); width: calc(100vw - var(--rd-panel-mobile-gutter)); }
    .quest-objective { top: 188px; width: calc(100vw - var(--rd-panel-mobile-gutter)); }
    .resource-panel { width: calc(100vw - var(--rd-panel-mobile-gutter)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-fill { transition: none; }
  }
</style>
