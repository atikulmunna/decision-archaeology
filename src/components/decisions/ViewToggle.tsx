'use client'

import { useRef, type KeyboardEvent } from 'react'
import type { DetailView } from '@/lib/detail-view'

const OPTIONS: Array<{ value: DetailView; label: string }> = [
  { value: 'then', label: 'Then' },
  { value: 'now', label: 'Now' },
]

/** The Then / Now switch: a tab list, with the arrow keys moving between the two views. */
export function ViewToggle({ view, onChange }: { view: DetailView; onChange: (next: DetailView) => void }) {
  const tabs = useRef<Record<DetailView, HTMLButtonElement | null>>({ then: null, now: null })

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next: DetailView = view === 'then' ? 'now' : 'then'
    onChange(next)
    tabs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Decision view"
      onKeyDown={onKeyDown}
      className="inline-flex self-start rounded-sm border-[1.5px] border-ink"
    >
      {OPTIONS.map(({ value, label }) => {
        const selected = view === value
        return (
          <button
            key={value}
            ref={(element) => {
              tabs.current[value] = element
            }}
            type="button"
            role="tab"
            id={`decision-tab-${value}`}
            aria-selected={selected}
            aria-controls={`decision-view-${value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(value)}
            className={`px-4 py-1.5 font-mono text-xs uppercase tracking-[0.09em] transition-colors duration-150 ${
              selected ? 'bg-primary text-on-primary' : 'text-ink hover:bg-sunken'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
