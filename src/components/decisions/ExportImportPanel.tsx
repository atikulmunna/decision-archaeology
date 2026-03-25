'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type Props = {
  canImport: boolean
}

export function ExportImportPanel({ canImport }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleImport(file: File) {
    setError(null)
    setStatus('Uploading import file...')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(null)
      setError(payload.error ?? 'Import failed.')
      return
    }

    setStatus(`Imported ${payload.imported} decision${payload.imported === 1 ? '' : 's'}.`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Export & Import
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Export your archive as JSON or Markdown. Power users can also import historical decisions from a JSON or CSV template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/export?format=json"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export JSON
          </a>
          <a
            href="/api/export?format=markdown"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export Markdown
          </a>
          <a
            href="/api/import/template?format=json"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            JSON template
          </a>
          <a
            href="/api/import/template?format=csv"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            CSV template
          </a>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void handleImport(file)
              event.currentTarget.value = ''
            }}
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!canImport || isPending}
            onClick={() => inputRef.current?.click()}
          >
            Import file
          </Button>
        </div>
      </div>

      {!canImport && (
        <p className="mt-3 text-sm text-amber-700">
          Bulk import is currently enabled for Power users only.
        </p>
      )}

      {status && <p className="mt-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
