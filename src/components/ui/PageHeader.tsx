import type { ReactNode } from 'react'
import { Eyebrow } from './Eyebrow'

export function PageHeader({
  title,
  eyebrow,
  meta,
  actions,
}: {
  title: ReactNode
  eyebrow?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 border-b-[1.5px] border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="min-w-0 break-words font-display text-[32px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[40px]">
          {title}
        </h1>
        {meta && <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
