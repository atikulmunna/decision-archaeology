'use client'

import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  nextThemePreference,
  resolveTheme,
  THEME_COOKIE,
  type ThemePreference,
} from '@/lib/design/theme'

const LABELS: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const

export function ThemeToggle({ initialPreference }: { initialPreference: ThemePreference }) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference)
  const Icon = ICONS[preference]

  function cycle() {
    const next = nextThemePreference(preference)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = resolveTheme(next, prefersDark)
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    setPreference(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[preference]}`}
      title={`Theme: ${LABELS[preference]}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
    </button>
  )
}
