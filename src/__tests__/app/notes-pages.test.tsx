import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({ listNotes: vi.fn(), listDecisionOptions: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/field-notes-db', () => ({ listNotes: mocks.listNotes, listDecisionOptions: mocks.listDecisionOptions }))

import DemoNotesPage from '@/app/(demo)/demo/notes/page'
import NotesPage from '@/app/(dashboard)/notes/page'
import { APP_NAV_LINKS, DEMO_NAV_LINKS } from '@/lib/routes'

describe('Field Notes pages', () => {
  it("shows Rowan's journal read-only", async () => {
    const markup = renderToStaticMarkup(await DemoNotesPage({ searchParams: Promise.resolve({}) }))
    expect(markup.match(/<li/g)?.length).toBe(20)
    expect(markup).toContain('Three weeks in. The team argues about tradeoffs exactly like in the interviews.')
    expect(markup).toContain('href="/demo/decisions/demo-0007"')
    expect(markup).not.toContain('<textarea')
    expect(markup).not.toContain('<button')
  })

  it('gives the owner the capture and their decisions, and pages by date', async () => {
    mocks.listNotes.mockResolvedValue({ notes: [], olderCursor: null })
    mocks.listDecisionOptions.mockResolvedValue([{ id: 'd7', label: 'DA-0007 · Accept the senior role at Northwind?' }])
    const markup = renderToStaticMarkup(await NotesPage({ searchParams: Promise.resolve({ before: '2026-10-01T00:00:00.000Z' }) }))
    expect(markup).toContain('What are you noticing?')
    expect(markup).toContain('DA-0007 · Accept the senior role at Northwind?')
    expect(mocks.listNotes).toHaveBeenCalledWith('db_1', expect.objectContaining({ before: new Date('2026-10-01T00:00:00.000Z') }))
    await NotesPage({ searchParams: Promise.resolve({ before: 'not a date' }) })
    expect(mocks.listNotes).toHaveBeenLastCalledWith('db_1', expect.objectContaining({ before: null }))
  })

  it('puts Notes between Archive and Calibration in both navs', () => {
    expect(APP_NAV_LINKS.map((link) => link.label)).toEqual(['Archive', 'Notes', 'Calibration', 'Reports'])
    expect(APP_NAV_LINKS[1].href).toBe('/notes')
    expect(DEMO_NAV_LINKS.map((link) => link.label)).toEqual(['Archive', 'Notes', 'Calibration', 'Reports'])
    expect(DEMO_NAV_LINKS[1].href).toBe('/demo/notes')
  })
})
