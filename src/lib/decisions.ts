import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeDecisionLockState } from '@/lib/locks'
import { DomainTag, Prisma } from '@prisma/client'

export type DecisionFilters = {
  q?: string
  domain?: DomainTag
  dateFrom?: string
  dateTo?: string
  outcome?: 'pending' | 'has' | 'positive' | 'negative' | 'expected' | 'too_early'
  minConfidence?: number
  maxConfidence?: number
  tag?: string
  page?: number
  limit?: number
}

export async function getDecisions(userId: string, filters: DecisionFilters = {}) {
  const {
    q,
    domain,
    dateFrom,
    dateTo,
    outcome,
    minConfidence,
    maxConfidence,
    tag,
    page = 1,
    limit = 20,
  } = filters
  const skip = (page - 1) * limit

  const conditions: Prisma.Sql[] = [
    Prisma.sql`user_id = ${userId}`,
    Prisma.sql`is_draft = false`,
  ]

  if (domain) conditions.push(Prisma.sql`domain_tag = ${domain}`)
  if (dateFrom) conditions.push(Prisma.sql`created_at >= ${new Date(dateFrom)}`)
  if (dateTo) conditions.push(Prisma.sql`created_at <= ${new Date(dateTo)}`)
  if (typeof minConfidence === 'number') {
    conditions.push(Prisma.sql`confidence_level >= ${minConfidence}`)
  }
  if (typeof maxConfidence === 'number') {
    conditions.push(Prisma.sql`confidence_level <= ${maxConfidence}`)
  }
  if (tag?.trim()) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM unnest(custom_tags) AS tag_value
        WHERE LOWER(tag_value) = LOWER(${tag.trim()})
      )`
    )
  }

  const latestOutcomeSubquery = Prisma.sql`(
    SELECT outcome_rating
    FROM outcome_updates
    WHERE decision_id = decision_records.id
    ORDER BY created_at DESC
    LIMIT 1
  )`

  if (outcome === 'pending') {
    conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM outcome_updates WHERE decision_id = decision_records.id)`)
  } else if (outcome === 'has') {
    conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM outcome_updates WHERE decision_id = decision_records.id)`)
  } else if (outcome === 'positive') {
    conditions.push(Prisma.sql`${latestOutcomeSubquery} IN ('MUCH_BETTER', 'SLIGHTLY_BETTER')`)
  } else if (outcome === 'negative') {
    conditions.push(Prisma.sql`${latestOutcomeSubquery} IN ('SLIGHTLY_WORSE', 'MUCH_WORSE')`)
  } else if (outcome === 'expected') {
    conditions.push(Prisma.sql`${latestOutcomeSubquery} = 'AS_EXPECTED'`)
  } else if (outcome === 'too_early') {
    conditions.push(Prisma.sql`${latestOutcomeSubquery} = 'TOO_EARLY_TO_TELL'`)
  }

  const searchDocument = Prisma.sql`
    coalesce(title, '') || ' ' ||
    coalesce(summary, '') || ' ' ||
    coalesce(context, '') || ' ' ||
    coalesce(alternatives, '') || ' ' ||
    coalesce(chosen_option, '') || ' ' ||
    coalesce(reasoning, '') || ' ' ||
    coalesce(values, '') || ' ' ||
    coalesce(uncertainties, '') || ' ' ||
    coalesce(predicted_outcome, '') || ' ' ||
    coalesce(supplementary_notes, '') || ' ' ||
    coalesce(array_to_string(custom_tags, ' '), '')
  `

  const sanitizedQuery = q
    ?.trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .join(' & ')

  if (sanitizedQuery) {
    conditions.push(
      Prisma.sql`to_tsvector('english', ${searchDocument}) @@ to_tsquery('english', ${sanitizedQuery})`
    )
  }

  const whereClause = Prisma.join(conditions, ' AND ')

  try {
    const [records, total] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM decision_records
        WHERE ${whereClause}
        ORDER BY
          ${sanitizedQuery
            ? Prisma.sql`ts_rank(
                to_tsvector('english', ${searchDocument}),
                to_tsquery('english', ${sanitizedQuery})
              ) DESC,`
            : Prisma.empty}
          created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM decision_records
        WHERE ${whereClause}
      `),
    ])

    const ids = records.map((record) => record.id)
    if (ids.length === 0) {
      return { records: [], total: Number(total[0]?.count ?? 0), page, limit }
    }

    const fullRecords = await prisma.decisionRecord.findMany({
      where: { id: { in: ids } },
      include: { outcomes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })

    const sorted = ids.map((id) => fullRecords.find((record) => record.id === id)!).filter(Boolean)

    return {
      records: sorted.map((record) => normalizeDecisionLockState(record)),
      total: Number(total[0]?.count ?? 0),
      page,
      limit,
    }
  } catch (error) {
    console.error('[decisions] Advanced archive query failed, falling back to Prisma query:', error)

    const fallbackWhere: Prisma.DecisionRecordWhereInput = {
      userId,
      isDraft: false,
      domainTag: domain,
      createdAt: {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      },
      confidenceLevel: {
        gte: typeof minConfidence === 'number' ? minConfidence : undefined,
        lte: typeof maxConfidence === 'number' ? maxConfidence : undefined,
      },
      customTags: tag?.trim() ? { has: tag.trim() } : undefined,
      OR: q?.trim()
        ? [
            { title: { contains: q.trim(), mode: 'insensitive' } },
            { summary: { contains: q.trim(), mode: 'insensitive' } },
            { context: { contains: q.trim(), mode: 'insensitive' } },
            { alternatives: { contains: q.trim(), mode: 'insensitive' } },
            { chosenOption: { contains: q.trim(), mode: 'insensitive' } },
            { reasoning: { contains: q.trim(), mode: 'insensitive' } },
            { values: { contains: q.trim(), mode: 'insensitive' } },
            { uncertainties: { contains: q.trim(), mode: 'insensitive' } },
            { predictedOutcome: { contains: q.trim(), mode: 'insensitive' } },
            { supplementaryNotes: { contains: q.trim(), mode: 'insensitive' } },
          ]
        : undefined,
    }

    const [records, total] = await Promise.all([
      prisma.decisionRecord.findMany({
        where: fallbackWhere,
        include: { outcomes: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.decisionRecord.count({ where: fallbackWhere }),
    ])

    const filtered = records.filter((record) => {
      const latestOutcome = record.outcomes[0]?.outcomeRating

      if (outcome === 'pending') return !latestOutcome
      if (outcome === 'has') return Boolean(latestOutcome)
      if (outcome === 'positive') return latestOutcome === 'MUCH_BETTER' || latestOutcome === 'SLIGHTLY_BETTER'
      if (outcome === 'negative') return latestOutcome === 'SLIGHTLY_WORSE' || latestOutcome === 'MUCH_WORSE'
      if (outcome === 'expected') return latestOutcome === 'AS_EXPECTED'
      if (outcome === 'too_early') return latestOutcome === 'TOO_EARLY_TO_TELL'

      return true
    })

    return {
      records: filtered.map((record) => normalizeDecisionLockState(record)),
      total,
      page,
      limit,
    }
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
