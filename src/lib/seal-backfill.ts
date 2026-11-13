import { SEALED_RELATIONS, sealFields, type SealableDecision } from '@/lib/seal'

/** The slice of the Prisma client the backfill needs, so it can be tested without a database. */
export type SealBackfillClient = {
  decisionRecord: {
    findMany(args: {
      where: { isDraft: false; isImported: false; sealHash: null }
      include: typeof SEALED_RELATIONS
    }): Promise<Array<SealableDecision & { id: string }>>
    update(args: { where: { id: string }; data: { sealHash: string; sealedAt: Date } }): Promise<unknown>
  }
}

/**
 * Seals finalized, non-imported records that have no seal yet, over their current
 * content. sealedAt is now, after their lock deadline, so the seal reads as retroactive.
 * A dry run (write: false) only lists what it would seal.
 */
export async function backfillSeals(
  client: SealBackfillClient,
  opts: { write: boolean; now?: Date }
): Promise<{ candidates: Array<{ id: string; catalogNumber: number | null }>; sealed: number }> {
  // Forecasts and challenge questions are part of v2 and v3 payloads, so they are loaded too.
  const records = await client.decisionRecord.findMany({
    where: { isDraft: false, isImported: false, sealHash: null },
    include: SEALED_RELATIONS,
  })
  const candidates = records.map((record) => ({ id: record.id, catalogNumber: record.catalogNumber }))
  if (!opts.write) return { candidates, sealed: 0 }

  const now = opts.now ?? new Date()
  let sealed = 0
  for (const record of records) {
    try {
      await client.decisionRecord.update({ where: { id: record.id }, data: await sealFields(record, now) })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`Stopped after sealing ${sealed} of ${records.length} records: ${reason}`)
    }
    sealed += 1
  }
  return { candidates, sealed }
}
