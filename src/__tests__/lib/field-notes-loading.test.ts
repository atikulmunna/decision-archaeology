import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ noteFindMany: vi.fn(), decisionFindMany: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: { fieldNote: { findMany: mocks.noteFindMany }, decisionRecord: { findMany: mocks.decisionFindMany } },
}))

import { listDecisionOptions, listNotes } from '@/lib/field-notes-db'

const row = (i: number, linked = false) => ({
  id: `n${i}`,
  userId: 'db_1',
  decisionId: linked ? 'd7' : null,
  body: `Note ${i}`,
  mood: 2,
  energy: null,
  promoted: false,
  createdAt: new Date(Date.parse('2026-11-01T00:00:00.000Z') - i * 3600 * 1000),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  decision: linked ? { id: 'd7', catalogNumber: 7, title: 'Accept the senior role at Northwind?' } : null,
})
const href = (id: string) => `/decisions/${id}`

describe('listNotes', () => {
  it('loads a page of notes newest first with their linked decision, resolving links on the server', async () => {
    mocks.noteFindMany.mockResolvedValueOnce([row(1, true), row(2)])
    const before = new Date('2026-11-02T00:00:00.000Z')
    const { notes, olderCursor } = await listNotes('db_1', { before, decisionHref: href })
    expect(mocks.noteFindMany).toHaveBeenCalledWith({
      where: { userId: 'db_1', createdAt: { lt: before } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { decision: { select: { id: true, catalogNumber: true, title: true } } },
    })
    expect(notes[0]).toEqual({
      id: 'n1',
      body: 'Note 1',
      mood: 2,
      energy: null,
      promoted: false,
      createdAt: row(1).createdAt,
      decision: { id: 'd7', label: 'DA-0007', title: 'Accept the senior role at Northwind?', href: '/decisions/d7' },
    })
    expect(notes[1].decision).toBeNull()
    expect(olderCursor).toBeNull()
  })

  it('offers an older page only when this one is full', async () => {
    const full = Array.from({ length: 30 }, (_, i) => row(i))
    mocks.noteFindMany.mockResolvedValueOnce(full)
    const { olderCursor } = await listNotes('db_1', { before: null, decisionHref: href })
    expect(mocks.noteFindMany.mock.calls.at(-1)![0].where).toEqual({ userId: 'db_1' })
    expect(olderCursor).toBe(full[29].createdAt.toISOString())
  })
})

describe('listDecisionOptions', () => {
  it("lists the owner's sealed decisions newest first with readable labels", async () => {
    mocks.decisionFindMany.mockResolvedValueOnce([
      { id: 'd7', catalogNumber: 7, title: 'Accept the senior role at Northwind?' },
      { id: 'd9', catalogNumber: null, title: 'Imported one' },
    ])
    expect(await listDecisionOptions('db_1')).toEqual([
      { id: 'd7', label: 'DA-0007 · Accept the senior role at Northwind?' },
      { id: 'd9', label: 'Uncatalogued · Imported one' },
    ])
    expect(mocks.decisionFindMany).toHaveBeenCalledWith({
      where: { userId: 'db_1', isDraft: false },
      select: { id: true, catalogNumber: true, title: true },
      orderBy: { createdAt: 'desc' },
    })
  })
})
