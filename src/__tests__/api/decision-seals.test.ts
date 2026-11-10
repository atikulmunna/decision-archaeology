// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
  correctionFindFirst: vi.fn(),
  correctionUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  getMaxCatalogNumber: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'FREE' }) }))
vi.mock('@/lib/catalog-db', () => ({ getMaxCatalogNumber: mocks.getMaxCatalogNumber }))
vi.mock('@/lib/decisions', () => ({ getDecisions: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { create: mocks.create, update: mocks.update, findFirst: mocks.findFirst, count: mocks.count },
    correctionRequest: { findFirst: mocks.correctionFindFirst, update: mocks.correctionUpdate },
    user: { findUnique: mocks.userFindUnique },
  },
}))

import { POST } from '@/app/api/decisions/route'
import { PATCH } from '@/app/api/decisions/[id]/route'
import { PATCH as approveCorrection } from '@/app/api/decisions/[id]/corrections/[correctionId]/route'
import { buildSealPayload, computeSealHash } from '@/lib/seal'

const { create, update, findFirst, correctionFindFirst, correctionUpdate, userFindUnique, getMaxCatalogNumber } = mocks

const validCreateBody = {
  title: 'Take the platform team role',
  summary: 'Move from payments to the platform team at Halcyon.',
  context: 'The platform team is rebuilding the deploy pipeline and asked me to join.',
  alternatives: 'Stay on payments, join platform, or look outside the company.',
  chosenOption: 'Join the platform team for at least a year.',
  reasoning: 'Infrastructure is the gap in my experience and moving back stays easy.',
  predictedOutcome: 'I will be glad I moved within six months.',
  confidenceLevel: 6,
  domainTag: 'CAREER',
  customTags: ['halcyon', 'learning'],
}

type Data = Record<string, unknown>

const postRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions', { method: 'POST', body: JSON.stringify(body) })
const patchRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions/d1', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const correctionParams = (id: string, correctionId: string) => ({ params: Promise.resolve({ id, correctionId }) })
const echo = async ({ data }: { data: Data }) => ({ id: 'd1', ...data })

const baseRecord = {
  id: 'd1',
  userId: 'db_1',
  ...validCreateBody,
  domainTag: 'CAREER' as const,
  values: null,
  uncertainties: null,
  predictedTimeframe: null,
  attachments: [],
  supplementaryNotes: null,
  isImported: false,
  isLocked: false,
  lockedAt: null,
  draftStartedAt: null,
  updatedAt: new Date(),
}
const draftRecord = {
  ...baseRecord,
  isDraft: true,
  catalogNumber: null,
  createdAt: new Date(Date.now() - 60_000),
  sealHash: null,
  sealedAt: null,
}
const finalizedInWindow = {
  ...baseRecord,
  isDraft: false,
  catalogNumber: 3,
  createdAt: new Date(Date.now() - 60_000),
  sealHash: 'stale',
  sealedAt: new Date(Date.now() - 60_000),
}
const lockedRecord = { ...finalizedInWindow, createdAt: new Date(Date.now() - 60 * 60_000), isLocked: true }

beforeEach(() => {
  vi.restoreAllMocks()
  for (const fn of Object.values(mocks)) fn.mockReset()
})

describe('sealing on writes', () => {
  it('seals a finalized decision over exactly what it stores', async () => {
    getMaxCatalogNumber.mockResolvedValue(6)
    create.mockImplementation(echo)
    await POST(postRequest(validCreateBody))
    const data = create.mock.calls[0][0].data
    expect(data.catalogNumber).toBe(7)
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload(data)))
    expect(data.sealedAt).toEqual(data.createdAt)
  })

  it('seals the catalog number that a retry actually saves', async () => {
    getMaxCatalogNumber.mockResolvedValueOnce(6).mockResolvedValueOnce(7)
    create.mockRejectedValueOnce({ code: 'P2002' }).mockImplementation(echo)
    await POST(postRequest(validCreateBody))
    const saved = create.mock.calls[1][0].data
    expect(saved.catalogNumber).toBe(8)
    expect(saved.sealHash).toBe(await computeSealHash(buildSealPayload(saved)))
  })

  it('does not seal drafts', async () => {
    create.mockImplementation(echo)
    await POST(postRequest({ ...validCreateBody, saveAsDraft: true }))
    expect(create.mock.calls[0][0].data.sealHash).toBeUndefined()
  })

  it('seals a draft when it is finalized', async () => {
    findFirst.mockResolvedValue(draftRecord)
    update.mockImplementation(async ({ data }: { data: Data }) => ({ ...draftRecord, ...data }))
    getMaxCatalogNumber.mockResolvedValue(2)
    await PATCH(patchRequest({ ...validCreateBody, finalize: true }), params('d1'))
    const data = update.mock.calls[0][0].data
    expect(data.catalogNumber).toBe(3)
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload({ ...draftRecord, ...data })))
    expect(data.sealedAt).toEqual(data.createdAt)
  })

  it('keeps draft fields the finalize request leaves out inside the seal', async () => {
    const draftWithValues = { ...draftRecord, values: 'Growth over comfort, and keeping options open.' }
    findFirst.mockResolvedValue(draftWithValues)
    update.mockImplementation(async ({ data }: { data: Data }) => ({ ...draftWithValues, ...data }))
    getMaxCatalogNumber.mockResolvedValue(2)
    await PATCH(patchRequest({ ...validCreateBody, finalize: true }), params('d1'))
    const { sealHash, sealedAt, ...stored } = update.mock.calls[0][0].data
    expect(stored.values).toBeUndefined()
    const after = {
      ...draftWithValues,
      ...Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== undefined)),
    }
    expect(after.values).toBe('Growth over comfort, and keeping options open.')
    expect(sealHash).toBe(await computeSealHash(buildSealPayload(after)))
    expect(sealedAt).toBeInstanceOf(Date)
  })

  it('reseals the merged record after a core edit inside the window', async () => {
    findFirst.mockResolvedValue(finalizedInWindow)
    update.mockImplementation(async ({ data }: { data: Data }) => ({ ...finalizedInWindow, ...data }))
    await PATCH(patchRequest({ title: 'A sharper title for the move' }), params('d1'))
    const { sealHash, sealedAt, ...stored } = update.mock.calls[0][0].data
    // The record as Prisma stores it: fields this update sets, undefined ones left alone.
    const after = {
      ...finalizedInWindow,
      ...Object.fromEntries(Object.entries(stored).filter(([, value]) => value !== undefined)),
    }
    expect(after.title).toBe('A sharper title for the move')
    expect(sealHash).toBe(await computeSealHash(buildSealPayload(after)))
    expect(sealHash).not.toBe(finalizedInWindow.sealHash)
    expect(sealedAt).toBeInstanceOf(Date)
  })

  it('leaves the seal alone on notes updates', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    update.mockImplementation(echo)
    await PATCH(patchRequest({ supplementaryNotes: 'Later thoughts on the move.' }), params('d1'))
    expect(update.mock.calls[0][0].data).toEqual({ supplementaryNotes: 'Later thoughts on the move.' })
  })

  it('approving a correction never touches the decision or its seal', async () => {
    userFindUnique.mockResolvedValue({ id: 'db_1' })
    findFirst.mockResolvedValue(lockedRecord)
    correctionFindFirst.mockResolvedValue({
      id: 'c1',
      decisionId: 'd1',
      fieldName: 'reasoning',
      status: 'PENDING',
      originalText: 'Infrastructure is teh gap in my experience.',
      correctedText: 'Infrastructure is the gap in my experience.',
    })
    correctionUpdate.mockImplementation(async ({ data }: { data: Data }) => ({ id: 'c1', ...data }))
    const response = await approveCorrection(patchRequest({ status: 'APPROVED' }), correctionParams('d1', 'c1'))
    expect(response.status).toBe(200)
    expect(correctionUpdate).toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('writes nothing when hashing fails', async () => {
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no digest'))
    getMaxCatalogNumber.mockResolvedValue(0)
    await expect(POST(postRequest(validCreateBody))).rejects.toThrow('no digest')
    expect(create).not.toHaveBeenCalled()
  })
})
