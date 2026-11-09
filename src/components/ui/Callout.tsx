import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<CalloutTone, { classes: string; Icon: LucideIcon }> = {
  info: { classes: 'border-rule bg-surface text-ink-2', Icon: Info },
  success: { classes: 'border-ink bg-highlight text-ink', Icon: CircleCheck },
  warning: { classes: 'border-ink bg-sunken text-ink', Icon: TriangleAlert },
  danger: { classes: 'border-danger bg-surface text-danger', Icon: CircleAlert },
}

export function Callout({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: CalloutTone
  title?: string
  children?: ReactNode
  className?: string
}) {
  const { classes, Icon } = tones[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-sm border px-4 py-3 text-sm ${classes} ${className}`}>
      <Icon aria-hidden="true" size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
      </div>
    </div>
  )
}
