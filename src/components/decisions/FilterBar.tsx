'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Search } from 'lucide-react'

const control = 'rounded-sm border border-rule bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-ink'

const DOMAIN_OPTIONS = ['CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER']
const OUTCOME_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending outcome' },
  { value: 'has', label: 'Has outcome' },
  { value: 'positive', label: 'Positive outcome' },
  { value: 'negative', label: 'Negative outcome' },
  { value: 'expected', label: 'As expected' },
  { value: 'too_early', label: 'Too early to tell' },
]

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset page on filter change
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParam('q', value)
  }, 500)

  const q = searchParams.get('q') ?? ''
  const domain = searchParams.get('domain') ?? ''
  const outcome = searchParams.get('outcome') ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const minConfidence = searchParams.get('minConfidence') ?? ''
  const tag = searchParams.get('tag') ?? ''

  return (
    <div className="flex flex-col gap-3 border-b border-rule pb-4">
      {/* Search */}
      <div className="relative">
        <Search aria-hidden="true" size={14} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          defaultValue={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search reasoning, outcomes, tags"
          aria-label="Search decisions"
          className={`${control} w-full py-2 pl-9`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by domain"
          value={domain}
          onChange={(e) => updateParam('domain', e.target.value)}
          className={control}
        >
          <option value="">All domains</option>
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by outcome"
          value={outcome}
          onChange={(e) => updateParam('outcome', e.target.value)}
          className={control}
        >
          {OUTCOME_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam('dateFrom', e.target.value)}
          className={control}
          aria-label="Filter from date"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateParam('dateTo', e.target.value)}
          className={control}
          aria-label="Filter to date"
        />

        <input
          type="number"
          min="1"
          max="10"
          value={minConfidence}
          onChange={(e) => updateParam('minConfidence', e.target.value)}
          placeholder="Min confidence"
          aria-label="Minimum confidence"
          className={`${control} w-36`}
        />

        <input
          type="text"
          value={tag}
          onChange={(e) => updateParam('tag', e.target.value)}
          placeholder="Tag"
          aria-label="Filter by tag"
          className={`${control} w-36`}
        />

        {(q || domain || outcome || dateFrom || dateTo || minConfidence || tag) && (
          <button
            onClick={() => {
              // Clearing filters keeps the archive view and the zoomed year (the strata stay the strata).
              const kept = new URLSearchParams()
              for (const key of ['view', 'year']) {
                const value = searchParams.get(key)
                if (value) kept.set(key, value)
              }
              const query = kept.toString()
              startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname))
            }}
            className="rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted hover:bg-sunken hover:text-ink"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
