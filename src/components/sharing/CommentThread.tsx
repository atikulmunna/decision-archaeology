'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, MessagesSquare } from 'lucide-react'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; displayName: string | null; avatarUrl: string | null } | null
}

interface Props {
  decisionId: string
  shareId: string
  initialComments: Comment[]
  currentUserId: string
  isCollaborator: boolean  // if false = owner viewing
}

export function CommentThread({ decisionId, shareId, initialComments, currentUserId, isCollaborator }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function postComment() {
    if (!content.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/decisions/${decisionId}/share/${shareId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments((prev) => [...prev, data])
        setContent('')
      }
    } finally {
      setPosting(false)
    }
  }

  async function requestCheckin() {
    setRequesting(true)
    try {
      await fetch(`/api/decisions/${decisionId}/share/${shareId}/checkin`, { method: 'POST' })
      setRequested(true)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="rounded-sm border border-rule bg-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-2xl text-ink">
          <MessagesSquare aria-hidden="true" size={18} strokeWidth={1.5} />
          Discussion
        </h3>
        {isCollaborator && (
          <button
            onClick={requestCheckin}
            disabled={requesting || requested}
            className="inline-flex items-center gap-1.5 rounded-sm border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-ink-2 transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {requested ? 'Requested' : requesting ? 'Requesting...' : (
              <>
                <Bell aria-hidden="true" size={12} strokeWidth={1.5} />
                Request update
              </>
            )}
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-muted text-center py-4">No comments yet. Start the discussion!</p>
        )}
        {comments.map((c) => {
          const isMe = c.author?.id === currentUserId
          return (
            <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="h-7 w-7 shrink-0 rounded-full bg-sunken flex items-center justify-center text-xs font-bold text-signal-ink">
                {(c.author?.displayName ?? '?')[0].toUpperCase()}
              </div>
              <div className={`max-w-[80%] rounded-sm px-3 py-2 text-sm ${isMe ? 'bg-primary text-on-primary' : 'bg-sunken text-ink'}`}>
                <p>{c.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-signal-ink' : 'text-muted'}`}>
                  {c.author?.displayName ?? 'Unknown'} · {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-rule pt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
          placeholder="Add a comment… (Enter to send)"
          rows={2}
          className="flex-1 rounded-sm border border-rule bg-sunken px-3 py-2 text-sm resize-none focus:border-ink"
        />
        <button
          onClick={postComment}
          disabled={posting || !content.trim()}
          className="rounded-sm bg-primary px-3 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50 transition-colors self-end py-2"
        >
          {posting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
