/**
 * One-off: seals existing finalized decisions that predate seals, marking them
 * retroactive. Dry run by default; writes only with --write.
 * Run with `npm run seal:backfill` (add `-- --write` to seal).
 */
import { formatCatalogNumber } from '@/lib/catalog'
import { getPrisma } from '@/lib/prisma'
import { backfillSeals, type SealBackfillClient } from '@/lib/seal-backfill'

async function main() {
  const write = process.argv.includes('--write')
  const prisma = getPrisma()
  const client: SealBackfillClient = {
    decisionRecord: {
      findMany: (args) => prisma.decisionRecord.findMany(args),
      update: (args) => prisma.decisionRecord.update(args),
    },
  }

  try {
    const { candidates, sealed } = await backfillSeals(client, { write })
    for (const candidate of candidates) {
      console.log(candidate.catalogNumber === null ? candidate.id : formatCatalogNumber(candidate.catalogNumber))
    }
    console.log(
      write
        ? `Sealed ${sealed} record${sealed === 1 ? '' : 's'}.`
        : `Dry run: ${candidates.length} record${candidates.length === 1 ? '' : 's'} would be sealed. Rerun with --write to seal them.`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
