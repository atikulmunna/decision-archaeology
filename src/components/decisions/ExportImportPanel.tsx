'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Eyebrow } from '@/components/ui/Eyebrow'

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
    <section className="flex flex-col gap-3 border-t border-rule pt-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Eyebrow>Export and import</Eyebrow>
          <p className="mt-1 text-sm text-ink-2">
            Export your archive as JSON or Markdown. Power users can also import historical decisions from a JSON or CSV
            template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?format=json" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Export JSON
          </a>
          <a href="/api/export?format=markdown" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            Export Markdown
          </a>
          <a href="/api/import/template?format=json" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
            JSON template
          </a>
          <a href="/api/import/template?format=csv" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
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
        <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
          Bulk import is currently enabled for Power users only
        </p>
      )}

      {status && <Callout tone="success">{status}</Callout>}
      {error && <Callout tone="danger">{error}</Callout>}
    </section>
  )
}
