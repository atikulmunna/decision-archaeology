import { formatCatalogNumber } from '@/lib/catalog'
import { shortSealHash } from '@/lib/seal'

/**
 * The wax-seal roundel shown beside a sealed decision's title. No hooks, so it
 * renders from server and client components alike.
 */
export function SealBadge({
  hash,
  catalogNumber,
  retroactive = false,
  stamp = false,
  className = '',
}: {
  hash: string
  catalogNumber: number | null
  retroactive?: boolean
  stamp?: boolean
  className?: string
}) {
  const number = catalogNumber === null ? '' : `${formatCatalogNumber(catalogNumber)} · `
  const ring = retroactive ? `SEALED RETROACTIVELY · ${number}` : `SEALED · ${number}SHA-256 ·`
  const label = `${retroactive ? 'Sealed retroactively' : 'Sealed'}, fingerprint ${shortSealHash(hash)}`
  // One badge per record on a page, so an id derived from the hash is unique without useId.
  const ringId = `seal-ring-${hash.slice(0, 12)}`

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 104 104"
      className={`h-[104px] w-[104px] shrink-0 -rotate-8 ${stamp ? 'motion-safe:animate-seal-stamp' : ''} ${className}`}
    >
      <defs>
        <path id={ringId} d="M52,52 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
      </defs>
      <circle cx="52" cy="52" r="49" strokeWidth="1.5" className="fill-signal stroke-ink" />
      <circle cx="52" cy="52" r="30" strokeWidth="1" className="fill-none stroke-on-signal" />
      <text fontSize="8.5" className="fill-on-signal font-mono">
        <textPath href={`#${ringId}`} textLength="236" lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>
      <text x="52" y="49" textAnchor="middle" fontSize="9" className="fill-on-signal font-mono">
        {hash.slice(0, 4)}
      </text>
      <text x="52" y="61" textAnchor="middle" fontSize="9" className="fill-on-signal font-mono">
        {hash.slice(-4)}
      </text>
    </svg>
  )
}
