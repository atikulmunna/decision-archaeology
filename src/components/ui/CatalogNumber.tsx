import { formatCatalogNumber } from '@/lib/catalog'

export function CatalogNumber({ value, className = '' }: { value: number | null; className?: string }) {
  if (value === null) return null
  return (
    <span className={`font-mono text-[11px] uppercase tracking-[0.09em] text-muted ${className}`}>
      {formatCatalogNumber(value)}
    </span>
  )
}
