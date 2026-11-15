import { beforeAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommentThread } from '@/components/sharing/CommentThread'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const comment = (id: string, authorId: string, name: string) => ({
  id,
  content: `Comment ${id}`,
  createdAt: '2026-11-09T12:00:00.000Z',
  author: { id: authorId, displayName: name, avatarUrl: null },
})

describe('CommentThread', () => {
  it('keeps the meta line on your own bubble readable against the primary fill', () => {
    render(
      <CommentThread
        decisionId="d1"
        shareId="s1"
        currentUserId="me"
        isCollaborator={false}
        initialComments={[comment('c1', 'me', 'Munna'), comment('c2', 'them', 'Rafi')]}
      />
    )
    const mine = screen.getByText(/^Munna ·/)
    expect(mine.className).toMatch(/text-on-primary/)
    expect(mine.className).not.toMatch(/text-signal-ink/)
    expect(screen.getByText(/^Rafi ·/).className).toMatch(/text-muted/)
  })

  it('dates each comment in UTC, so the server and every browser print the same thing', () => {
    const originalTz = process.env.TZ
    // Noon UTC is already midnight of the next day in New Zealand.
    process.env.TZ = 'Pacific/Auckland'
    try {
      render(
        <CommentThread
          decisionId="d1"
          shareId="s1"
          currentUserId="me"
          isCollaborator={false}
          initialComments={[comment('c2', 'them', 'Rafi')]}
        />
      )
      expect(screen.getByText('Rafi · Nov 9, 12:00 PM UTC')).toBeInTheDocument()
    } finally {
      process.env.TZ = originalTz
    }
  })
})
