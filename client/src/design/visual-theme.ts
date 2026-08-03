export const visualTheme = {
  colors: {
    ink950: '#0D1418',
    metalSurface: '#182328',
    paperText: '#DDD4BD',
    mutedText: '#9F9A89',
    crystalGlow: '#68D5D0',
    sealVermilion: '#E05A42',
    fireGyeol: '#FFAD42',
    danger: '#CF505C',
    success: '#74C995',
    info: '#72AEE8',
  },
  motion: {
    glowPeriodMs: 2_400,
    microMs: 100,
    shortMs: 200,
  },
} as const;

export type VisualTheme = typeof visualTheme;

const cssVariables: ReadonlyArray<readonly [string, keyof VisualTheme['colors']]> = [
  ['--rd-ink-950', 'ink950'],
  ['--rd-metal-surface', 'metalSurface'],
  ['--rd-paper-text', 'paperText'],
  ['--rd-muted-text', 'mutedText'],
  ['--rd-crystal-glow', 'crystalGlow'],
  ['--rd-seal-vermilion', 'sealVermilion'],
  ['--rd-fire-gyeol', 'fireGyeol'],
  ['--rd-danger', 'danger'],
  ['--rd-success', 'success'],
  ['--rd-info', 'info'],
];

export function themeCssVariables(theme: VisualTheme = visualTheme): string {
  return cssVariables
    .map(([variable, color]) => `${variable}:${theme.colors[color]}`)
    .join(';');
}
