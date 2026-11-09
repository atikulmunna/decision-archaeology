import type { ReactNode } from 'react'

type CardElement = 'div' | 'section' | 'article' | 'li'

export function Card({
  as: Element = 'div',
  className = '',
  children,
}: {
  as?: CardElement
  className?: string
  children: ReactNode
}) {
  return <Element className={`min-w-0 rounded-sm border border-rule bg-surface ${className}`}>{children}</Element>
}
