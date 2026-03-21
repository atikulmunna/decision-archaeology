'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import type { AttachmentSummary } from '@/lib/attachments'
import { ATTACHMENT_LIMITS } from '@/lib/attachments'

type Props = {
  decisionId?: string
  initialAttachments?: AttachmentSummary[]
  onRequireDecisionId?: () => Promise<string | null>
  readOnly?: boolean
}

export function AttachmentManager({
  decisionId,
  initialAttachments = [],
  onRequireDecisionId,
  readOnly = false,
}: Props) {
  const inputId = useId()
  const [attachments, setAttachments] = useState<AttachmentSummary[]>(initialAttachments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedDecisionId, setLoadedDecisionId] = useState<string | null>(null)

  const remainingSlots = useMemo(
    () => Math.max(0, ATTACHMENT_LIMITS.maxAttachments - attachments.length),
    [attachments.length]
  )

  useEffect(() => {
    if (!decisionId || decisionId === loadedDecisionId) return

    let cancelled = false

    async function loadAttachments() {
      const res = await fetch(`/api/decisions/${decisionId}/attachments`)
      if (!res.ok || cancelled) return

      const data = await res.json()
      setAttachments(data.attachments ?? [])
      setLoadedDecisionId(decisionId ?? null)
    }

    void loadAttachments()

    return () => {
      cancelled = true
    }
  }, [decisionId, loadedDecisionId])

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || readOnly) return

    setError(null)
    setLoading(true)

    try {
      let targetDecisionId = decisionId
      if (!targetDecisionId && onRequireDecisionId) {
        targetDecisionId = (await onRequireDecisionId()) ?? undefined
      }

      if (!targetDecisionId) {
        setError('Start a draft before uploading attachments.')
        return
      }

      const files = Array.from(fileList).slice(0, remainingSlots)
      for (const file of files) {
        const formData = new FormData()
        formData.set('file', file)

        const res = await fetch(`/api/decisions/${targetDecisionId}/attachments`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? 'Attachment upload failed.')
          break
        }

        setAttachments((current) => [...current, data.attachment])
        setLoadedDecisionId(targetDecisionId)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(key: string) {
    if (!decisionId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/decisions/${decisionId}/attachments?key=${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to remove attachment.')
        return
      }

      setAttachments((current) => current.filter((attachment) => attachment.key !== key))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">Attachments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add up to {ATTACHMENT_LIMITS.maxAttachments} PDFs or images, {ATTACHMENT_LIMITS.maxBytes / (1024 * 1024)}MB each.
          </p>
        </div>
        {!readOnly && (
          <label
            htmlFor={inputId}
            className={`cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 ${loading || remainingSlots === 0 ? 'pointer-events-none opacity-50' : ''}`}
          >
            {loading ? 'Uploading…' : 'Add files'}
          </label>
        )}
      </div>

      {!readOnly && (
        <input
          id={inputId}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files)
            event.currentTarget.value = ''
          }}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {attachments.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-400">
          No attachments yet.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {attachment.name}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => void handleRemove(attachment.key)}
                  className="text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <p className="mt-3 text-xs text-gray-400">
          {remainingSlots} of {ATTACHMENT_LIMITS.maxAttachments} attachment slots remaining.
        </p>
      )}
    </div>
  )
}
