'use client'

import { useState, useRef, useEffect } from 'react'

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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">💬 Discussion</h3>
        {isCollaborator && (
          <button
            onClick={requestCheckin}
            disabled={requesting || requested}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          >
            {requested ? '✓ Requested' : requesting ? '…' : '🔔 Request update'}
          </button>
        )}
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the discussion!</p>
        )}
        {comments.map((c) => {
          const isMe = c.author?.id === currentUserId
          return (
            <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="h-7 w-7 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                {(c.author?.displayName ?? '?')[0].toUpperCase()}
              </div>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <p>{c.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {c.author?.displayName ?? 'Unknown'} · {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
          placeholder="Add a comment… (Enter to send)"
          rows={2}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={postComment}
          disabled={posting || !content.trim()}
          className="rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors self-end py-2"
        >
          {posting ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
