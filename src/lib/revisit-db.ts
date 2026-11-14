import 'server-only'
import { prisma } from '@/lib/prisma'
import { formatCatalogNumber } from '@/lib/catalog'
import { peekLetter } from '@/lib/letters'
import { isDueForRevisit } from '@/lib/revisit'
import type { RevisitSummary } from '@/lib/revisit-summary'

const DUE_LIST_MAX = 5

/** The letter, due state, last revisit and next check-in for one of the owner's sealed decisions. */
export async function getRevisitSummary(userId: string, decisionId: string, now: Date, revisitHref: string): Promise<RevisitSummary> {
  const [letter, lastRevisit, pending] = await Promise.all([
    peekLetter(userId, decisionId, now),
    prisma.revisit.findFirst({
      where: { decisionId, decision: { userId } },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
    prisma.checkInReminder.findFirst({
      where: { decisionId, completedAt: null, decision: { userId } },
      orderBy: { scheduledFor: 'asc' },
      select: { scheduledFor: true },
    }),
  ])
  const lastRevisitedAt = lastRevisit?.completedAt ?? null
  const nextCheckIn = pending?.scheduledFor ?? null
  const letterOpensAt = letter.state === 'none' ? null : letter.opensAt
  return {
    letter,
    due: isDueForRevisit({ letterOpensAt, lastRevisitAt: lastRevisitedAt, pendingCheckIn: nextCheckIn }, now),
    lastRevisitedAt,
    nextCheckIn,
    revisitHref,
  }
}

/** Up to five of the owner's sealed decisions that are due for a revisit, newest first, with hrefs resolved here. */
export async function listDueForRevisit(
  userId: string,
  now: Date,
  revisitHref: (id: string) => string
): Promise<Array<{ id: string; label: string; title: string; href: string }>> {
  const candidates = await prisma.decisionRecord.findMany({
    where: {
      userId,
      isDraft: false,
      OR: [{ letter: { opensAt: { lte: now } } }, { checkInReminders: { some: { completedAt: null, scheduledFor: { lte: now } } } }],
    },
    select: {
      id: true,
      catalogNumber: true,
      title: true,
      letter: { select: { opensAt: true } },
      revisits: { orderBy: { completedAt: 'desc' }, take: 1, select: { completedAt: true } },
      checkInReminders: { where: { completedAt: null }, orderBy: { scheduledFor: 'asc' }, take: 1, select: { scheduledFor: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return candidates
    .filter((record) =>
      isDueForRevisit(
        {
          letterOpensAt: record.letter?.opensAt ?? null,
          lastRevisitAt: record.revisits[0]?.completedAt ?? null,
          pendingCheckIn: record.checkInReminders[0]?.scheduledFor ?? null,
        },
        now
      )
    )
    .slice(0, DUE_LIST_MAX)
    .map((record) => ({
      id: record.id,
      label: record.catalogNumber === null ? 'Uncatalogued' : formatCatalogNumber(record.catalogNumber),
      title: record.title,
      href: revisitHref(record.id),
    }))
}
