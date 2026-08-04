<script lang="ts">
  import { M3_IDS, type M3Action, type M3Stage } from '../game/sim/m3-progression';
  import type { M3HudSnapshot } from './hud-model';

  let {
    snapshot,
    onAction,
  }: {
    snapshot: M3HudSnapshot;
    onAction: (action: M3Action) => void;
  } = $props();

  let action = $derived(actionFor(snapshot.stage));
  let isCompletedCheckpoint = $derived(snapshot.currentGyeolId === M3_IDS.letter);

  const steps: Record<
    M3Stage,
    { title: string; detail: string; action: M3Action | null }
  > = {
    defeat_slime: {
      title: '첫 전투',
      detail: '먹물 슬라임을 처치해 보급함을 깨우세요.',
      action: null,
    },
    collect_cache: {
      title: '각인 보급함',
      detail: '깨어난 보급함에서 첫 각인 재료를 회수하세요.',
      action: 'collect_m3_supply_cache',
    },
    craft_jahyeong: {
      title: '자형 조합',
      detail: '음 · ㅎ과 음 · ㅘ을 조합하세요.',
      action: 'craft_m3_jahyeong_hwa',
    },
    inscribe_letter: {
      title: '결 각인',
      detail: '자형: 화에 의미를 새기세요.',
      action: 'inscribe_m3_letter_hwa',
    },
    equip_letter: {
      title: '현재 결',
      detail: '완성한 결: 화를 장착하세요.',
      action: 'equip_m3_letter_hwa',
    },
    transform: {
      title: '화 변신',
      detail: '현재 결과 인의 힘을 전투폼으로 드러내세요.',
      action: 'toggle_m3_transformation',
    },
    transformed: {
      title: '화 변신 활성',
      detail: '임시 전투폼의 오라와 무기광이 강화되었습니다.',
      action: 'toggle_m3_transformation',
    },
  };

  function stepFor(stage: M3Stage) {
    return steps[stage];
  }

  function actionFor(stage: M3Stage): M3Action | null {
    return stepFor(stage).action;
  }

  function actionLabel(action: M3Action): string {
    if (action === 'collect_m3_supply_cache') return '보급함 회수';
    if (action === 'craft_m3_jahyeong_hwa') return '자형: 화 조합';
    if (action === 'inscribe_m3_letter_hwa') return '결: 화 각인';
    if (action === 'equip_m3_letter_hwa') return '현재 결에 장착';
    return snapshot.transformed ? '변신 해제' : '화 변신';
  }
</script>

<section
  class="m3-progress-panel"
  aria-label={isCompletedCheckpoint ? '현재 결과 화 변신' : 'M3 첫 각인 진행'}
>
  {#if !isCompletedCheckpoint}
    {#key snapshot.inscriptionSequence}
      {#if snapshot.inscriptionSequence > 0}
        <div class="inscription-flash" aria-hidden="true">印</div>
      {/if}
    {/key}
    {#key snapshot.acquisitionSequence}
      {#if snapshot.acquisitionSequence > 0}
        <div class="acquisition-chips" aria-hidden="true">
          <span>음 · ㅎ</span><span>음 · ㅘ</span><span>돌: 새김</span>
        </div>
      {/if}
    {/key}
  {/if}

  <span class="panel-kicker">{isCompletedCheckpoint ? '현재 결' : 'M3 · 첫 각인'}</span>
  <h2>{stepFor(snapshot.stage).title}</h2>
  <p>{stepFor(snapshot.stage).detail}</p>
  {#if !isCompletedCheckpoint}
    <div class="requirements" aria-label="제작 재료">
      <span>음 · ㅎ {snapshot.hwaInitial}/1</span>
      <span>음 · ㅘ {snapshot.hwaMedial}/1</span>
      <span>돌: 새김 {snapshot.stone}/1</span>
      <span>골드 {snapshot.gold}/20</span>
    </div>
  {/if}
  {#if snapshot.currentGyeolId}
    <p class="current-gyeol">현재 결 · 화</p>
  {/if}
  <p class="status" aria-live="polite">{snapshot.statusMessage}</p>
  {#if action}
    <button
      type="button"
      onclick={() => onAction(action)}
    >{actionLabel(action)}</button>
  {/if}
</section>

<style>
  .m3-progress-panel {
    box-sizing: border-box;
    position: absolute;
    z-index: 2;
    left: 50%;
    bottom: var(--rd-panel-inset);
    width: min(360px, calc(100vw - var(--rd-panel-mobile-gutter)));
    padding: var(--rd-panel-padding-block) var(--rd-panel-padding-inline);
    transform: translateX(-50%);
    pointer-events: auto;
    overflow: hidden;
    border: var(--rd-panel-border-width) solid color-mix(in srgb, var(--rd-paper-text) 15%, transparent);
    border-left-color: var(--rd-crystal-glow);
    border-radius: var(--rd-radius-sm);
    background: linear-gradient(135deg, rgb(24 35 40 / 96%), rgb(13 20 24 / 93%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 34%), inset 2px 0 var(--rd-crystal-glow);
  }

  .panel-kicker {
    display: block;
    color: var(--rd-muted-text);
    font: 600 var(--rd-type-label-size) / 1.2 var(--rd-font-data);
    letter-spacing: 0.12em;
  }

  h2 {
    margin: var(--rd-space-xs) 0 0;
    font: 700 var(--rd-type-panel-title-size) / 1.2 var(--rd-font-display);
  }

  p {
    margin: var(--rd-space-xs) 0 0;
    font-size: var(--rd-type-body-size);
  }

  .requirements {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--rd-space-xs);
    margin-top: var(--rd-space-sm);
    color: var(--rd-muted-text);
    font: 500 var(--rd-type-label-size) / 1.2 var(--rd-font-data);
  }

  .current-gyeol {
    color: var(--rd-fire-gyeol);
    font-family: var(--rd-font-display);
  }

  .status {
    min-height: 1.2em;
    color: var(--rd-paper-text);
  }

  button {
    width: 100%;
    margin-top: var(--rd-space-sm);
    padding: var(--rd-space-sm);
    border: 1px solid color-mix(in srgb, var(--rd-fire-gyeol) 60%, transparent);
    border-radius: var(--rd-radius-sm);
    color: var(--rd-ink-950);
    background: var(--rd-fire-gyeol);
    font: 700 var(--rd-type-emphasized-size) / 1.2 var(--rd-font-body);
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid var(--rd-paper-text);
    outline-offset: 2px;
  }

  .acquisition-chips,
  .inscription-flash {
    position: absolute;
    pointer-events: none;
  }

  .acquisition-chips {
    top: var(--rd-space-sm);
    right: var(--rd-space-sm);
    display: flex;
    gap: var(--rd-space-xs);
    color: var(--rd-crystal-glow);
    font: 600 var(--rd-type-label-size) / 1 var(--rd-font-data);
    animation: m3-acquire var(--rd-motion-short) ease-out both;
  }

  .inscription-flash {
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--rd-seal-vermilion);
    font: 700 var(--rd-type-display-size) / 1 var(--rd-font-display);
    animation: m3-inscribe var(--rd-motion-transformation) ease-out both;
  }

  @keyframes m3-acquire {
    to {
      transform: translate(24px, 48px);
      opacity: 0;
    }
  }

  @keyframes m3-inscribe {
    0% {
      opacity: 0;
      transform: scale(0.72);
    }

    20% {
      opacity: 1;
    }

    100% {
      color: var(--rd-fire-gyeol);
      opacity: 0;
      transform: scale(1.28);
    }
  }

  @media (max-width: 720px) {
    .m3-progress-panel {
      bottom: 176px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .acquisition-chips,
    .inscription-flash {
      display: none;
    }
  }
</style>
