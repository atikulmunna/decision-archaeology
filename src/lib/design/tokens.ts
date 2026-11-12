/**
 * Field Archive design tokens: the single source of color truth.
 * `src/app/globals.css` mirrors these values as CSS variables (a test keeps
 * them in sync) and exposes them as Tailwind utilities such as `bg-paper`.
 */

export const THEMES = ['light', 'dark'] as const
export type ThemeName = (typeof THEMES)[number]

export const TOKEN_NAMES = [
  'paper',
  'surface',
  'sunken',
  'ink',
  'ink-2',
  'muted',
  'rule',
  'signal',
  'on-signal',
  'primary',
  'on-primary',
  'signal-ink',
  'highlight',
  'danger',
  // Strata Timeline: alternating band tones and one sediment tone per domain lane.
  'band-a',
  'band-b',
  'stratum-career',
  'stratum-finance',
  'stratum-health',
  'stratum-relationships',
  'stratum-creative',
  'stratum-other',
] as const
export type TokenName = (typeof TOKEN_NAMES)[number]

export const tokens: Record<ThemeName, Record<TokenName, string>> = {
  light: {
    paper: '#F2F2F0',
    surface: '#FFFFFF',
    sunken: '#E8E8E4',
    ink: '#121212',
    'ink-2': '#3A3A38',
    muted: '#666662',
    rule: '#DEDEDA',
    signal: '#D6F55B',
    'on-signal': '#121212',
    primary: '#121212',
    'on-primary': '#D6F55B',
    'signal-ink': '#3D6B12',
    highlight: '#E3F99A',
    danger: '#B42318',
    'band-a': '#ECEBE7',
    'band-b': '#E3E2DD',
    'stratum-career': '#4F6378',
    'stratum-finance': '#5E6B2F',
    'stratum-health': '#9A4F33',
    'stratum-relationships': '#8E5262',
    'stratum-creative': '#85661A',
    'stratum-other': '#6B675E',
  },
  dark: {
    paper: '#0D0D0D',
    surface: '#161616',
    sunken: '#202020',
    ink: '#ECECEA',
    'ink-2': '#BDBDBA',
    muted: '#8A8A86',
    rule: '#262626',
    signal: '#D6F55B',
    'on-signal': '#121212',
    primary: '#D6F55B',
    'on-primary': '#0D0D0D',
    'signal-ink': '#D6F55B',
    highlight: '#3B4612',
    danger: '#F97066',
    'band-a': '#1A1A1A',
    'band-b': '#232323',
    'stratum-career': '#8FA3BC',
    'stratum-finance': '#A5B36A',
    'stratum-health': '#D98B6C',
    'stratum-relationships': '#CF8EA0',
    'stratum-creative': '#D4AE52',
    'stratum-other': '#AAA59A',
  },
}

/** Every foreground/background pair the UI renders text with; each must reach 4.5:1. */
export const CONTRAST_PAIRS: ReadonlyArray<readonly [fg: TokenName, bg: TokenName]> = [
  ...(['ink', 'ink-2', 'muted', 'signal-ink', 'danger'] as const).flatMap((fg) =>
    (['paper', 'surface'] as const).map((bg) => [fg, bg] as const)
  ),
  ['on-primary', 'primary'],
  ['on-signal', 'signal'],
  ['ink', 'highlight'],
  ['ink-2', 'sunken'],
  ['surface', 'danger'],
  ['paper', 'ink'],
  // Compositions rendered inside Callouts, chips and comment bubbles.
  ['ink-2', 'highlight'],
  ['muted', 'sunken'],
  ['danger', 'sunken'],
  ['signal-ink', 'sunken'],
]

/** Every stratum tone on each band tone: graphics, so each must reach 3:1 (WCAG non-text contrast). */
export const GRAPHIC_PAIRS: ReadonlyArray<readonly [fg: TokenName, bg: TokenName]> = (
  ['stratum-career', 'stratum-finance', 'stratum-health', 'stratum-relationships', 'stratum-creative', 'stratum-other'] as const
).flatMap((fg) => (['band-a', 'band-b'] as const).map((bg) => [fg, bg] as const))
