'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

const DOMAIN_OPTIONS = ['CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER']

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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Search */}
      <input
        type="search"
        defaultValue={q}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search decisions..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="flex flex-wrap gap-2">
        {/* Domain filter */}
        <select
          value={domain}
          onChange={(e) => updateParam('domain', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All domains</option>
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        {/* Outcome status filter */}
        <select
          value={outcome}
          onChange={(e) => updateParam('outcome', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending outcome</option>
          <option value="has">Has outcome</option>
        </select>

        {/* Clear filters */}
        {(q || domain || outcome) && (
          <button
            onClick={() => {
              startTransition(() => router.replace(pathname))
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
