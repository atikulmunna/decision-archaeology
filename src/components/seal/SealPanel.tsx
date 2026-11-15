'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/Button'
import { getDecisionLockDeadline } from '@/lib/locks'
import { buildSealPayload, computeSealHash, isRetroactiveSeal, sealFileName, type SealRecord } from '@/lib/seal'

export type { SealRecord } from '@/lib/seal'

const label = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const hashText = 'break-all font-mono text-xs text-ink-2'

function utcDay(date: Date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function utcTime(date: Date) {
  return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function canHash() {
  return typeof globalThis.crypto?.subtle?.digest === 'function'
}

const noSubscription = () => () => {}
// The server can always hash, so the first render assumes so; an insecure page learns otherwise after hydration.
const assumeHashing = () => true

/**
 * The seal under a decision's header: what it is, a Verify button that hashes the
 * record in the browser, the exact payload to check by hand, and on the demo a
 * toggle that changes one word so the seal can be seen to fail.
 */
export function SealPanel({
  record,
  approvedCorrections = 0,
  tampered = false,
  onTamperedChange,
}: {
  record: SealRecord
  approvedCorrections?: number
  tampered?: boolean
  onTamperedChange?: (next: boolean) => void
}) {
  const payload = useMemo(() => buildSealPayload(record), [record])
  // A result belongs to the payload it was computed for, so any change to the record clears it.
  const [result, setResult] = useState<{ payload: string; computed: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [showPayload, setShowPayload] = useState(false)
  // Copy and hash outcomes also belong to the payload they were for; each copy attempt is numbered
  // so a repeated failure mounts a fresh alert and is announced again.
  const [copied, setCopied] = useState<{ payload: string; ok: boolean; attempt: number } | null>(null)
  const [hashFailedFor, setHashFailedFor] = useState<string | null>(null)
  const hashAvailable = useSyncExternalStore(noSubscription, canHash, assumeHashing)

  if (!record.sealHash) {
    return (
      <section aria-label="Seal" className="rounded-sm border border-rule bg-surface p-4">
        <p className={`${label} text-muted`}>
          {record.isImported
            ? 'Imported, not sealed. Imported records are exempt from the time lock.'
            : 'Not sealed. This decision was recorded before seals existed.'}
        </p>
      </section>
    )
  }

  const deadline = getDecisionLockDeadline({ createdAt: new Date(record.createdAt) })
  const description = !record.isLocked
    ? `Provisional: this fingerprint becomes final when the edit window closes at ${utcTime(deadline)} UTC.`
    : isRetroactiveSeal(record) && record.sealedAt
      ? `Sealed retroactively on ${utcDay(record.sealedAt)}. It covers the content as it was then, not the wording at finalization.`
      : `A SHA-256 fingerprint of everything that locked, taken when this decision was sealed on ${utcDay(deadline)} at ${utcTime(deadline)} UTC.`

  const current = result && result.payload === payload ? result : null
  const matches = current?.computed === record.sealHash
  const fileName = sealFileName(record.catalogNumber)
  const copyOutcome = copied && copied.payload === payload ? copied : null
  const hashFailed = hashFailedFor === payload

  async function verify() {
    setVerifying(true)
    setHashFailedFor(null)
    try {
      setResult({ payload, computed: await computeSealHash(payload) })
    } catch {
      setHashFailedFor(payload)
    } finally {
      setVerifying(false)
    }
  }

  async function copy() {
    const attempt = (copied?.attempt ?? 0) + 1
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('No clipboard')
      await navigator.clipboard.writeText(payload)
      setCopied({ payload, ok: true, attempt })
    } catch {
      setCopied({ payload, ok: false, attempt })
    }
  }

  function togglePayload() {
    setShowPayload((open) => !open)
    setCopied(null)
  }

  function download() {
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    // Some browsers start the save after click() returns, so keep the URL alive for a while.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <section aria-label="Seal" className="flex flex-col gap-3 rounded-sm border border-rule bg-surface p-4">
      <h2 className={`${label} text-ink`}>The seal</h2>
      <p className="text-sm leading-relaxed text-ink-2">{description}</p>
      <p className={hashText}>{record.sealHash}</p>

      {approvedCorrections > 0 && (
        <p className="text-sm text-ink-2">
          {/* A retroactive seal came after some corrections, so they are not dated against it. */}
          {`${approvedCorrections} approved typo correction${approvedCorrections === 1 ? '' : 's'}${isRetroactiveSeal(record) ? '' : ' since sealing'}. The seal covers the original text.`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={verify} loading={verifying} disabled={!hashAvailable}>
          Verify seal
        </Button>
        <Button size="sm" variant="secondary" onClick={togglePayload} aria-expanded={showPayload}>
          {showPayload ? 'Hide what is sealed' : 'Show what is sealed'}
        </Button>
      </div>
      {!hashAvailable && <p className="text-sm text-muted">This browser cannot compute SHA-256.</p>}
      {hashFailed && (
        <p role="alert" className="text-sm text-danger">
          Could not compute the fingerprint in this browser.
        </p>
      )}

      {onTamperedChange && (
        <label className={`${label} inline-flex items-center gap-2 text-ink-2`}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            checked={tampered}
            onChange={(event) => onTamperedChange(event.target.checked)}
          />
          {tampered ? 'Changing a word (demo, only in your browser)' : 'Try changing a word (demo)'}
        </label>
      )}

      {/* The verdict region is always on the page, so screen readers announce the result when it arrives.
          The fingerprints sit outside it, so the announcement is not 128 hex characters. Before a result,
          the wrapper takes back the gap it occupies. */}
      <div className={current ? `flex flex-col gap-1 border-l-[3px] pl-3 ${matches ? 'border-signal-ink' : 'border-danger'}` : '-mt-3'}>
        <div role="status" className="flex flex-col gap-1">
          {current && (
            <>
              <p className={`${label} ${matches ? 'text-signal-ink' : 'text-danger'}`}>
                {matches ? 'Seal verified' : 'Does not match'}
              </p>
              <p className="text-sm text-ink-2">
                {matches
                  ? 'Your browser hashed this record and got the same fingerprint stored at sealing. Nothing that locked has changed.'
                  : tampered
                    ? 'One word changed in your browser, and the fingerprint is completely different. That is how a seal shows any edit after sealing.'
                    : "This record's fingerprint differs from the one stored at sealing, so something that locked has changed."}
              </p>
            </>
          )}
        </div>
        {current && (
          <>
            <p className={`${label} mt-1 text-muted`}>Stored</p>
            <p className={hashText}>{record.sealHash}</p>
            <p className={`${label} mt-1 text-muted`}>Computed now</p>
            <p className={`${hashText} ${matches ? '' : 'text-danger'}`}>{current.computed}</p>
          </>
        )}
      </div>

      {showPayload && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-2">
            {tampered
              ? 'One word is changed in your browser, so this is not the text that was sealed. Turn the change off to see it.'
              : 'The exact text that was hashed. Copy it or download it and check it yourself without trusting this page.'}
          </p>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-sunken p-3 font-mono text-[11px] text-ink">
            {payload}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={copy}>
              {copyOutcome?.ok ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="secondary" onClick={download}>
              Download
            </Button>
            <span className={`${label} text-muted`}>Hash the file exactly as downloaded: sha256sum {fileName}</span>
          </div>
          {copyOutcome && !copyOutcome.ok && (
            <p key={copyOutcome.attempt} role="alert" className="text-sm text-danger">
              Could not copy. Select the text above instead.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
