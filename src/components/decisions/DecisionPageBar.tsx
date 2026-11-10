import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { buttonClasses } from '@/components/ui/Button'

/** The bar above a decision: a link back to the archive and, for an owner's record, export links. */
export function DecisionPageBar({ backHref, exportId }: { backHref: string; exportId?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        prefetch
        href={backHref}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" size={12} strokeWidth={1.5} />
        Archive
      </Link>
      {exportId && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/decisions/${exportId}/export?format=json`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Download aria-hidden="true" size={12} strokeWidth={1.5} />
            JSON
          </a>
          <a
            href={`/api/decisions/${exportId}/export?format=markdown`}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Download aria-hidden="true" size={12} strokeWidth={1.5} />
            Markdown
          </a>
        </div>
      )}
    </div>
  )
}
