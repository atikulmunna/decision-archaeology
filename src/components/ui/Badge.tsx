import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'signal' | 'ink' | 'outline' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-ink-2',
  signal: 'bg-signal text-on-signal',
  ink: 'bg-ink text-paper',
  outline: 'border border-ink text-ink',
  danger: 'border border-danger text-danger',
}

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] wrap-anywhere ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
