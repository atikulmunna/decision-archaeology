// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const db = {
    fieldNote: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    decisionRecord: { findFirst: vi.fn(), create: vi.fn() },
  }
  return { userId: 'user_1' as string | null, db }
})

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: mocks.userId }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: { ...mocks.db, $transaction: async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db) },
}))

import { POST as createNote } from '@/app/api/notes/route'
import { DELETE as deleteNote, PATCH as editNote } from '@/app/api/notes/[id]/route'
import { POST as promoteNote } from '@/app/api/notes/[id]/promote/route'

const { db } = mocks
const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) })
const params = (id = 'n1') => ({ params: Promise.resolve({ id }) })
// Create and edit return the linked decision, so the page can draw its chip without another request.
const LINKED = { decision: { select: { id: true, catalogNumber: true, title: true } } }
const note = { id: 'n1', userId: 'db_1', decisionId: null, body: 'Noticed something', mood: null, energy: null, promoted: false }

beforeEach(() => {
  mocks.userId = 'user_1'
  for (const group of Object.values(db)) for (const fn of Object.values(group)) fn.mockReset()
  db.fieldNote.create.mockImplementation(async ({ data }) => ({ id: 'n1', ...data }))
  db.fieldNote.update.mockImplementation(async ({ data }) => ({ ...note, ...data }))
  db.fieldNote.findFirst.mockResolvedValue(note)
  db.decisionRecord.findFirst.mockResolvedValue({ id: 'd1', userId: 'db_1' })
  db.decisionRecord.create.mockResolvedValue({ id: 'draft9' })
})

describe('POST /api/notes', () => {
  it('saves a trimmed note with its mood, energy and link', async () => {
    const res = await createNote(json('/api/notes', 'POST', { body: '  Noticed something  ', mood: 2, energy: 4, decisionId: 'd1' }))
    expect(res.status).toBe(201)
    expect(db.fieldNote.create).toHaveBeenCalledWith({
      data: { userId: 'db_1', body: 'Noticed something', mood: 2, energy: 4, decisionId: 'd1' },
      include: LINKED,
    })
    expect(db.decisionRecord.findFirst).toHaveBeenCalledWith({ where: { id: 'd1', userId: 'db_1' }, select: { id: true } })
  })

  it('rejects empty, overlong and out-of-range notes', async () => {
    for (const body of [{ body: '   ' }, { body: 'x'.repeat(1001) }, { body: 'ok', mood: 0 }, { body: 'ok', mood: 6 }, { body: 'ok', energy: 2.5 }]) {
      expect((await createNote(json('/api/notes', 'POST', body))).status).toBe(400)
    }
    expect(db.fieldNote.create).not.toHaveBeenCalled()
  })

  it("will not link to another user's decision, without revealing it", async () => {
    db.decisionRecord.findFirst.mockResolvedValue(null)
    const res = await createNote(json('/api/notes', 'POST', { body: 'ok', decisionId: 'theirs' }))
    expect(res.status).toBe(404)
    expect(await res.text()).not.toContain('theirs')
    expect(db.fieldNote.create).not.toHaveBeenCalled()
  })

  it('requires a signed-in user', async () => {
    mocks.userId = null
    expect((await createNote(json('/api/notes', 'POST', { body: 'ok' }))).status).toBe(401)
  })
})

describe('PATCH and DELETE /api/notes/[id]', () => {
  it('edits text and mood, and unlinking clears the promoted mark', async () => {
    expect((await editNote(json('/api/notes/n1', 'PATCH', { body: ' New text ', mood: 3 }), params())).status).toBe(200)
    expect(db.fieldNote.update).toHaveBeenLastCalledWith({ where: { id: 'n1' }, data: { body: 'New text', mood: 3 }, include: LINKED })
    await editNote(json('/api/notes/n1', 'PATCH', { decisionId: null }), params())
    expect(db.fieldNote.update).toHaveBeenLastCalledWith({ where: { id: 'n1' }, data: { decisionId: null, promoted: false }, include: LINKED })
    expect(db.fieldNote.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'db_1' } })
  })

  it("refuses another user's note and decision, and an empty change", async () => {
    db.decisionRecord.findFirst.mockResolvedValueOnce(null)
    expect((await editNote(json('/api/notes/n1', 'PATCH', { decisionId: 'theirs' }), params())).status).toBe(404)
    expect((await editNote(json('/api/notes/n1', 'PATCH', {}), params())).status).toBe(400)
    db.fieldNote.findFirst.mockResolvedValue(null)
    expect((await editNote(json('/api/notes/n9', 'PATCH', { body: 'x' }), params('n9'))).status).toBe(404)
    expect((await deleteNote(json('/api/notes/n9', 'DELETE'), params('n9'))).status).toBe(404)
    expect(db.fieldNote.update).not.toHaveBeenCalled()
    expect(db.fieldNote.delete).not.toHaveBeenCalled()
  })

  it('deletes a note', async () => {
    const res = await deleteNote(json('/api/notes/n1', 'DELETE'), params())
    expect([res.status, await res.json()]).toEqual([200, { deleted: true }])
    expect(db.fieldNote.delete).toHaveBeenCalledWith({ where: { id: 'n1' } })
  })
})

describe('POST /api/notes/[id]/promote', () => {
  it('creates a draft from a free-standing note and links the note to it', async () => {
    db.fieldNote.findFirst.mockResolvedValue({ ...note, body: '\n\nFirst real line\nmore detail' })
    const res = await promoteNote(json('/api/notes/n1/promote', 'POST'), params())
    expect([res.status, await res.json()]).toEqual([201, { draftId: 'draft9' }])
    expect(db.decisionRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'db_1',
        isDraft: true,
        title: 'First real line',
        summary: '',
        context: '\n\nFirst real line\nmore detail',
        alternatives: '',
        chosenOption: '',
        reasoning: '',
        customTags: [],
      },
      select: { id: true },
    })
    expect(db.fieldNote.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { decisionId: 'draft9', promoted: true } })
  })

  it('refuses a note that is already linked, and notes of other users', async () => {
    db.fieldNote.findFirst.mockResolvedValueOnce({ ...note, decisionId: 'd1' })
    const linked = await promoteNote(json('/api/notes/n1/promote', 'POST'), params())
    expect([linked.status, await linked.json()]).toEqual([409, { error: 'This note is already linked to a decision.' }])
    db.fieldNote.findFirst.mockResolvedValueOnce(null)
    expect((await promoteNote(json('/api/notes/n9/promote', 'POST'), params('n9'))).status).toBe(404)
    expect(db.decisionRecord.create).not.toHaveBeenCalled()
  })
})
