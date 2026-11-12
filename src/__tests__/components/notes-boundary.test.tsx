import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const captured = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/field-notes-db', () => ({
  listNotes: async (_userId: string, options: { decisionHref: (id: string) => string }) => ({
    notes: [
      {
        id: 'n1',
        body: 'x',
        mood: null,
        energy: null,
        promoted: false,
        createdAt: new Date(),
        decision: { id: 'd7', label: 'DA-0007', title: 't', href: options.decisionHref('d7') },
      },
    ],
    olderCursor: null,
  }),
  listDecisionOptions: async () => [],
}))
// The client half of the page: capture exactly what the server half hands across.
vi.mock('@/components/notes/NotesFeed', () => ({
  NotesFeed: (props: Record<string, unknown>) => {
    captured.props.push(props)
    return null
  },
}))

import DemoNotesPage from '@/app/(demo)/demo/notes/page'
import NotesPage from '@/app/(dashboard)/notes/page'

function findFunctions(value: unknown, path = 'props'): string[] {
  if (typeof value === 'function') return [path]
  if (value === null || typeof value !== 'object' || value instanceof Date) return []
  return Object.entries(value).flatMap(([key, inner]) => findFunctions(inner, `${path}.${key}`))
}

describe('Notes pages server and client boundary', () => {
  it('hand the client feed only plain data', async () => {
    renderToStaticMarkup(await NotesPage({ searchParams: Promise.resolve({}) }))
    renderToStaticMarkup(await DemoNotesPage({ searchParams: Promise.resolve({}) }))
    expect(captured.props).toHaveLength(2)
    for (const props of captured.props) expect(findFunctions(props)).toEqual([])
  })
})
