/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../ConnectionNotice.svelte', import.meta.url), 'utf8');

describe('M5.1 connection notice contract', () => {
  it('provides accessible authority scope and reload copy', () => {
    expect(source).toContain('aria-live="assertive"');
    expect(source).toContain('다시 불러오기');
    expect(source).toContain('서버 권위 이동 모드');
    expect(source).toContain('전투·M3·M4 상호작용은 로컬 POC에서만 사용할 수 있습니다.');
  });

  it('uses semantic tokens and preserves interaction and reduced-motion behavior', () => {
    expect(source).toContain('var(--rd-info)');
    expect(source).toContain('var(--rd-danger)');
    expect(source).toContain('pointer-events: auto');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
