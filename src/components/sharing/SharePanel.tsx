'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Users } from 'lucide-react'

interface Collaborator {
  id: string
  shareId: string
  collaborator: { id: string; email: string; displayName: string | null; avatarUrl: string | null }
}

interface Props {
  decisionId: string
  initialShares: Collaborator[]
}

export function SharePanel({ decisionId, initialShares }: Props) {
  const [shares, setShares] = useState<Collaborator[]>(initialShares)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function invite() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/decisions/${decisionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to invite collaborator')
      } else {
        setSuccess(`Invite sent to ${email}`)
        setEmail('')
        // Refresh shares list
        const refreshed = await fetch(`/api/decisions/${decisionId}/share`).then((r) => r.json())
        setShares(refreshed)
      }
    } finally {
      setLoading(false)
    }
  }

  async function revoke(shareId: string) {
    await fetch(`/api/decisions/${decisionId}/share/${shareId}`, { method: 'DELETE' })
    setShares((prev) => prev.filter((s) => s.shareId !== shareId))
  }

  return (
    <div className="rounded-sm border border-rule bg-surface p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-2xl text-ink">
        <Users aria-hidden="true" size={18} strokeWidth={1.5} />
        Collaborators
      </h3>

      {/* Existing shares */}
      {shares.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {shares.map((s) => (
            <li key={s.shareId} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {s.collaborator.avatarUrl ? (
                  <Image
                    src={s.collaborator.avatarUrl}
                    className="h-7 w-7 rounded-full object-cover"
                    alt=""
                    width={28}
                    height={28}
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-sunken flex items-center justify-center text-xs font-bold text-signal-ink">
                    {(s.collaborator.displayName ?? s.collaborator.email)[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-ink-2">{s.collaborator.displayName ?? s.collaborator.email}</span>
              </div>
              <button
                onClick={() => revoke(s.shareId)}
                className="text-xs text-danger hover:text-ink transition-colors"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Invite form */}
      {shares.length < 5 && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
            placeholder="colleague@example.com"
            className="flex-1 rounded-sm border border-rule bg-sunken px-3 py-2 text-sm focus:border-ink"
          />
          <button
            onClick={invite}
            disabled={loading || !email.trim()}
            className="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : 'Invite'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {success && <p className="mt-2 text-xs text-signal-ink">{success}</p>}
      {shares.length >= 5 && (
        <p className="mt-2 text-xs text-muted">Maximum 5 collaborators reached.</p>
      )}
    </div>
  )
}
