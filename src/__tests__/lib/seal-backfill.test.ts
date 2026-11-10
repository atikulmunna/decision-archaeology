import { describe, expect, it, vi } from 'vitest'
import { backfillSeals, type SealBackfillClient } from '@/lib/seal-backfill'
import { buildSealPayload, computeSealHash, isRetroactiveSeal, type SealableDecision } from '@/lib/seal'

function makeRecord(id: string, catalogNumber: number | null): SealableDecision & { id: string } {
  return {
    id,
    catalogNumber,
    createdAt: new Date('2026-03-01T09:00:00.000Z'),
    title: `Decision ${id}`,
    summary: 'Summary of the decision.',
    context: 'Context of the decision.',
    alternatives: 'The alternatives considered.',
    chosenOption: 'The option chosen.',
    reasoning: 'Why this option won.',
    values: null,
    uncertainties: null,
    predictedOutcome: 'What I expect.',
    predictedTimeframe: null,
    confidenceLevel: 6,
    domainTag: 'CAREER',
    customTags: [],
  }
}

const recordA = makeRecord('a', 1)
const recordB = makeRecord('b', null)

function fakeClient(records: Array<SealableDecision & { id: string }>) {
  return {
    decisionRecord: {
      findMany: vi.fn(async () => records),
      update: vi.fn(async () => ({})),
    },
  } satisfies SealBackfillClient
}

describe('backfillSeals', () => {
  it('lists candidates without writing in a dry run', async () => {
    const client = fakeClient([recordA, recordB])
    expect(await backfillSeals(client, { write: false })).toEqual({
      candidates: [
        { id: 'a', catalogNumber: 1 },
        { id: 'b', catalogNumber: null },
      ],
      sealed: 0,
    })
    expect(client.decisionRecord.findMany).toHaveBeenCalledWith({
      where: { isDraft: false, isImported: false, sealHash: null },
    })
    expect(client.decisionRecord.update).not.toHaveBeenCalled()
  })

  it('seals each candidate retroactively with --write', async () => {
    const now = new Date('2026-11-11T09:00:00.000Z')
    const client = fakeClient([recordA])
    expect((await backfillSeals(client, { write: true, now })).sealed).toBe(1)
    expect(client.decisionRecord.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { sealHash: await computeSealHash(buildSealPayload(recordA)), sealedAt: now },
    })
    expect(isRetroactiveSeal({ createdAt: recordA.createdAt, sealedAt: now })).toBe(true)
  })

  it('reports how many records it sealed before a failure', async () => {
    const client = fakeClient([recordA, recordB])
    client.decisionRecord.update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('connection lost'))
    await expect(backfillSeals(client, { write: true })).rejects.toThrow(
      'Stopped after sealing 1 of 2 records: connection lost'
    )
  })

  it('changes nothing when every record is already sealed', async () => {
    const client = fakeClient([])
    expect(await backfillSeals(client, { write: true })).toEqual({ candidates: [], sealed: 0 })
    expect(client.decisionRecord.update).not.toHaveBeenCalled()
  })
})
