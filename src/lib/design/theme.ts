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

/** The preference saved in the cookie, read in the browser; anything unreadable means "system". */
export function readThemeCookie(cookie: string): ThemePreference {
  const match = cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`))
  if (!match) return 'system'
  try {
    return parseThemePreference(decodeURIComponent(match[1]))
  } catch {
    return 'system'
  }
}

/**
 * Runs in <head> before first paint. Explicit cookie choices win; otherwise the OS preference
 * is applied. The OS is always listened to, and followed whenever the cookie says "system",
 * so switching back to System in the same page load follows it again.
 */
export const THEME_INIT_SCRIPT = `(function () {
  function readPreference() {
    var match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
    if (!match) return 'system';
    try { return decodeURIComponent(match[1]); } catch (error) { return 'system'; }
  }
  try {
    var pref = readPreference();
    var root = document.documentElement;
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    root.dataset.theme = pref === 'light' || pref === 'dark' ? pref : media.matches ? 'dark' : 'light';
    media.addEventListener('change', function (event) {
      var value = readPreference();
      if (value !== 'light' && value !== 'dark') root.dataset.theme = event.matches ? 'dark' : 'light';
    });
  } catch (error) {}
})();`
