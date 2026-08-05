<script lang="ts">
  import type { ConnectionState } from '../net/connection';

  let {
    state = null,
    authorityDemo = false,
    onReload,
  }: {
    state?: ConnectionState | null;
    authorityDemo?: boolean;
    onReload: () => void;
  } = $props();
</script>

{#if state?.kind === 'protocol_mismatch'}
  <aside class="connection-notice failure" aria-live="assertive">
    <strong>서버 연결 거부</strong>
    <span>{state.message}</span>
    <button type="button" onclick={onReload}>다시 불러오기</button>
  </aside>
{:else if state?.kind === 'failed'}
  <aside class="connection-notice failure" aria-live="assertive">
    <strong>연결 실패</strong>
    <span>{state.message}</span>
  </aside>
{:else if authorityDemo}
  <aside class="connection-notice info" aria-live="polite">
    <strong>서버 권위 이동 모드</strong>
    <span>전투·M3·M4 상호작용은 로컬 POC에서만 사용할 수 있습니다.</span>
    {#if state?.kind === 'reconnecting'}
      <small>{state.message} ({state.attempt}/10)</small>
    {:else if state?.kind === 'connecting' || state?.kind === 'joining'}
      <small>서버 권위 세션에 연결하고 있습니다.</small>
    {/if}
  </aside>
{/if}

<style>
  .connection-notice {
    box-sizing: border-box;
    position: absolute;
    z-index: 4;
    top: var(--rd-panel-inset);
    right: var(--rd-panel-inset);
    display: grid;
    gap: var(--rd-space-xs);
    width: min(340px, calc(100vw - var(--rd-panel-mobile-gutter)));
    padding: var(--rd-panel-padding-block) var(--rd-panel-padding-inline);
    pointer-events: auto;
    border: var(--rd-panel-border-width) solid currentColor;
    border-radius: var(--rd-radius-sm);
    color: var(--rd-paper-text);
    background: linear-gradient(135deg, rgb(24 35 40 / 96%), rgb(13 20 24 / 94%));
    box-shadow: 0 12px 32px rgb(0 0 0 / 38%), inset 2px 0 currentColor;
    font-family: var(--rd-font-body);
    transition: opacity var(--rd-motion-short) ease-out;
  }

  .connection-notice.info { border-color: var(--rd-info); }
  .connection-notice.failure { border-color: var(--rd-danger); }

  strong {
    color: inherit;
    font: 700 var(--rd-type-emphasized-size) / 1.2 var(--rd-font-display);
  }

  span,
  small {
    font-size: var(--rd-type-body-size);
    line-height: 1.4;
  }

  small { color: var(--rd-muted-text); }

  button {
    margin-top: var(--rd-space-xs);
    padding: var(--rd-space-sm);
    border: 1px solid var(--rd-danger);
    border-radius: var(--rd-radius-sm);
    color: var(--rd-paper-text);
    background: color-mix(in srgb, var(--rd-danger) 22%, var(--rd-metal-surface));
    font: 700 var(--rd-type-body-size) / 1.2 var(--rd-font-body);
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid var(--rd-paper-text);
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    .connection-notice {
      top: 120px;
      right: calc(var(--rd-panel-mobile-gutter) / 2);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .connection-notice { transition: none; }
  }
</style>
