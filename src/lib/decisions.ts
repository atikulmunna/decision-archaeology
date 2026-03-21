import { prisma } from '@/lib/prisma'
import { normalizeDecisionLockState } from '@/lib/locks'
import { DomainTag, OutcomeRating } from '@prisma/client'

export type DecisionFilters = {
  q?: string
  domain?: DomainTag
  dateFrom?: string
  dateTo?: string
  hasOutcome?: boolean
  page?: number
  limit?: number
}

export async function getDecisions(userId: string, filters: DecisionFilters = {}) {
  const { q, domain, dateFrom, dateTo, hasOutcome, page = 1, limit = 20 } = filters
  const skip = (page - 1) * limit

  // Build base where clause
  const where: Record<string, unknown> = {
    userId,
    isDraft: false,
    ...(domain ? { domainTag: domain } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(hasOutcome === true ? { outcomes: { some: {} } } : {}),
    ...(hasOutcome === false ? { outcomes: { none: {} } } : {}),
  }

  // Full-text search via raw Prisma query
  if (q && q.trim()) {
    const sanitized = q
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean)
      .join(' & ')

    if (sanitized) {
      const [records, total] = await Promise.all([
        prisma.$queryRaw<
          Array<{ id: string; relevance: number }>
        >`
          SELECT id, ts_rank(
            to_tsvector('english', title || ' ' || summary || ' ' || context || ' ' || reasoning),
            to_tsquery('english', ${sanitized})
          ) AS relevance
          FROM decision_records
          WHERE user_id = ${userId}
            AND is_draft = false
            AND to_tsvector('english', title || ' ' || summary || ' ' || context || ' ' || reasoning)
                @@ to_tsquery('english', ${sanitized})
          ORDER BY relevance DESC
          LIMIT ${limit} OFFSET ${skip}
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM decision_records
          WHERE user_id = ${userId}
            AND is_draft = false
            AND to_tsvector('english', title || ' ' || summary || ' ' || context || ' ' || reasoning)
                @@ to_tsquery('english', ${sanitized})
        `,
      ])

      const ids = records.map((r) => r.id)
      const fullRecords = await prisma.decisionRecord.findMany({
        where: { id: { in: ids } },
        include: { outcomes: { orderBy: { createdAt: 'desc' }, take: 1 } },
      })
      // Re-sort by relevance order
      const sorted = ids.map((id) => fullRecords.find((r) => r.id === id)!).filter(Boolean)

      return {
        records: sorted.map((record) => normalizeDecisionLockState(record)),
        total: Number(total[0]?.count ?? 0),
        page,
        limit,
      }
    }
  }

  const [records, total] = await Promise.all([
    prisma.decisionRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { outcomes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.decisionRecord.count({ where }),
  ])

  return {
    records: records.map((record) => normalizeDecisionLockState(record)),
    total,
    page,
    limit,
  }
}

export async function getDraftDecisions(userId: string, limit = 5) {
  const records = await prisma.decisionRecord.findMany({
    where: { userId, isDraft: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  return records.map((record) => normalizeDecisionLockState(record))
}

export async function getDecision(userId: string, id: string) {
  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId, isDraft: false },
    include: {
      outcomes: { orderBy: { createdAt: 'asc' } },
      corrections: { orderBy: { createdAt: 'desc' } },
    },
  })

  return record ? normalizeDecisionLockState(record) : null
}

export const OUTCOME_LABELS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'Much better than expected',
  SLIGHTLY_BETTER: 'Slightly better than expected',
  AS_EXPECTED: 'As expected',
  SLIGHTLY_WORSE: 'Slightly worse than expected',
  MUCH_WORSE: 'Much worse than expected',
  TOO_EARLY_TO_TELL: 'Too early to tell',
}

export const OUTCOME_COLORS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'bg-emerald-100 text-emerald-700',
  SLIGHTLY_BETTER: 'bg-green-100 text-green-700',
  AS_EXPECTED: 'bg-blue-100 text-blue-700',
  SLIGHTLY_WORSE: 'bg-amber-100 text-amber-700',
  MUCH_WORSE: 'bg-red-100 text-red-700',
  TOO_EARLY_TO_TELL: 'bg-gray-100 text-gray-600',
}
