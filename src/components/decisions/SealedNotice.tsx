import { SealBadge } from '@/components/seal/SealBadge'

/** The capture flow's moment of sealing: the roundel stamps in once the edit window closes. */
export function SealedNotice({ hash, catalogNumber }: { hash: string | null; catalogNumber: number | null }) {
  return (
    <div className="flex items-center gap-5 rounded-sm border border-rule bg-surface p-4">
      {hash && <SealBadge hash={hash} catalogNumber={catalogNumber} stamp />}
      <p className="text-sm leading-relaxed text-ink-2">Sealed. Supplementary notes and outcomes can still be added.</p>
    </div>
  )
}
