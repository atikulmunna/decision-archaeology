import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { DomainTag } from '@prisma/client'
import { getDecisions } from '@/lib/decisions'
import { CreateDecisionSchema, DraftDecisionSchema } from '@/lib/validations/decision'
import { getOrCreateDbUser } from '@/lib/db-user'
import {
  CATALOG_CONFLICT_MESSAGE,
  CatalogNumberConflictError,
  withCatalogNumberRetry,
} from '@/lib/catalog'
import { getMaxCatalogNumber } from '@/lib/catalog-db'
import { asCreated, sealFields } from '@/lib/seal'
import { toForecastRows } from '@/lib/forecast-input'
import { atFreeRecordLimit, FREE_LIMIT_MESSAGE } from '@/lib/record-limit'

export const dynamic = 'force-dynamic'

// POST /api/decisions: create new decision record
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (await atFreeRecordLimit(dbUser)) {
    return NextResponse.json({ error: FREE_LIMIT_MESSAGE }, { status: 403 })
  }

  const body = await req.json()
  const saveAsDraft = body?.saveAsDraft === true

  const parsed = saveAsDraft
    ? DraftDecisionSchema.safeParse(body)
    : CreateDecisionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data
  const createData = {
    userId: dbUser.id,
    title: data.title ?? '',
    summary: data.summary ?? '',
    context: data.context ?? '',
    alternatives: data.alternatives ?? '',
    chosenOption: data.chosenOption ?? '',
    reasoning: data.reasoning ?? '',
    values: data.values,
    uncertainties: data.uncertainties,
    predictedOutcome: data.predictedOutcome,
    predictedTimeframe: data.predictedTimeframe ? new Date(data.predictedTimeframe) : null,
    confidenceLevel: data.confidenceLevel,
    domainTag: data.domainTag ?? null,
    customTags: data.customTags ?? [],
    isDraft: saveAsDraft,
  }

  // Forecasts are created in the same write as the decision, and the seal covers them.
  const forecastRows = data.forecasts ? toForecastRows(data.forecasts) : []
  const forecastWrite = data.forecasts ? { forecasts: { create: forecastRows } } : {}

  if (saveAsDraft) {
    const draft = await prisma.decisionRecord.create({ data: { ...createData, ...forecastWrite } })
    return NextResponse.json(draft, { status: 200 })
  }

  // The finalization time is set here, not by the database default, so the seal covers the stored value.
  const now = new Date()
  try {
    const record = await withCatalogNumberRetry(
      async (catalogNumber) => {
        const finalized = { ...createData, catalogNumber, createdAt: now }
        const seal = await sealFields({ ...asCreated(finalized), forecasts: forecastRows }, now)
        return prisma.decisionRecord.create({ data: { ...finalized, ...forecastWrite, ...seal } })
      },
      () => getMaxCatalogNumber(dbUser.id)
    )
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof CatalogNumberConflictError) {
      return NextResponse.json({ error: CATALOG_CONFLICT_MESSAGE }, { status: 409 })
    }
    throw error
  }
}

// GET /api/decisions: list user's records (paginated)
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const minConfidence = searchParams.get('minConfidence')
  const maxConfidence = searchParams.get('maxConfidence')

  const result = await getDecisions(dbUser.id, {
    q: searchParams.get('q') ?? undefined,
    domain: (searchParams.get('domain') ?? undefined) as DomainTag | undefined,
    outcome: (searchParams.get('outcome') ?? undefined) as
      | 'pending'
      | 'has'
      | 'positive'
      | 'negative'
      | 'expected'
      | 'too_early'
      | undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    minConfidence: minConfidence ? Math.max(1, Math.min(10, parseInt(minConfidence))) : undefined,
    maxConfidence: maxConfidence ? Math.max(1, Math.min(10, parseInt(maxConfidence))) : undefined,
    tag: searchParams.get('tag') ?? undefined,
    page,
    limit,
  })

  return NextResponse.json(result)
}
