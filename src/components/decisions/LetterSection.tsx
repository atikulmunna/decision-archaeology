'use client'

import { useEffect, useState } from 'react'
import { letterFingerprint } from '@/lib/letter-rules'
import { formatDay, type LetterPeek } from '@/lib/revisit-summary'

const sectionLabel = 'mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted'

/**
 * A letter to future you, in one of three states: sealed until its day, ready to open in the
 * revisit, or open (its text, checked in the browser against the fingerprint in the seal).
 */
export function LetterSection({ letter, fingerprint, revisitHref }: { letter: LetterPeek; fingerprint: string | null; revisitHref: string }) {
  const [matches, setMatches] = useState<boolean | null>(null)
  const openBody = letter.state === 'open' ? letter.body : null
  const sealed = letter.state === 'open' ? letter.sha256 : null

  useEffect(() => {
    if (openBody === null || sealed === null) return
    let cancelled = false
    void letterFingerprint(openBody).then((hash) => {
      if (!cancelled) setMatches(hash === sealed)
    })
    return () => {
      cancelled = true
    }
  }, [openBody, sealed])

  if (letter.state === 'none') return null

  return (
    <section>
      <h2 className={sectionLabel}>A letter to future you</h2>
      <div className="flex flex-col gap-2 rounded-sm border border-rule bg-surface p-4">
        {letter.state === 'sealed' && (
          <>
            <p className="font-display text-[17px] leading-relaxed text-ink">{`Sealed until ${formatDay(letter.opensAt)}`}</p>
            {fingerprint && <p className="break-all font-mono text-[11px] text-muted">{`Fingerprint ${fingerprint.slice(0, 12)}`}</p>}
          </>
        )}
        {letter.state === 'ready' && (
          <p className="text-sm leading-relaxed text-ink">
            Your letter is ready.{' '}
            <a href={revisitHref} className="underline underline-offset-2 hover:text-ink-2">
              Open it in your revisit.
            </a>
          </p>
        )}
        {letter.state === 'open' && (
          <>
            <p className="whitespace-pre-wrap break-words font-display text-[17px] leading-relaxed text-ink">{letter.body}</p>
            {matches !== null && (
              <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">{matches ? 'Matches its seal' : 'Does not match its seal'}</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
