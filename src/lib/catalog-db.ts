import { prisma } from '@/lib/prisma'

/** Highest catalog number the user holds, or null when none are numbered yet (drafts only). */
export async function getMaxCatalogNumber(userId: string): Promise<number | null> {
  const result = await prisma.decisionRecord.aggregate({
    where: { userId },
    _max: { catalogNumber: true },
  })
  return result._max.catalogNumber ?? null
}
