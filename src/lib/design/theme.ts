import type { ThemeName } from '@/lib/design/tokens'

export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_COOKIE = 'da-theme'

/** A missing or unrecognized cookie value means "follow the operating system". */
export function parseThemePreference(value: string | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ThemeName {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

const CYCLE: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }

export function nextThemePreference(preference: ThemePreference): ThemePreference {
  return CYCLE[preference]
}

/**
 * Runs in <head> before first paint. Explicit cookie choices win; otherwise the
 * OS preference is applied and followed while the preference stays "system".
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
    var pref = match ? decodeURIComponent(match[1]) : 'system';
    var root = document.documentElement;
    if (pref === 'light' || pref === 'dark') { root.dataset.theme = pref; return; }
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    root.dataset.theme = media.matches ? 'dark' : 'light';
    media.addEventListener('change', function (event) {
      var current = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
      var value = current ? decodeURIComponent(current[1]) : 'system';
      if (value !== 'light' && value !== 'dark') root.dataset.theme = event.matches ? 'dark' : 'light';
    });
  } catch (error) {}
})();`
