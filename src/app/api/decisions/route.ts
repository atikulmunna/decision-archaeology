import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { DomainTag } from '@prisma/client'
import { getDecisions } from '@/lib/decisions'
import { CreateDecisionSchema, DraftDecisionSchema } from '@/lib/validations/decision'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

// POST /api/decisions — create new decision record
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Free tier: max 20 records
  if (dbUser.tier === 'FREE') {
    const count = await prisma.decisionRecord.count({ where: { userId: dbUser.id, isDraft: false } })
    if (count >= 20) {
      return NextResponse.json(
        { error: 'Free tier limit reached. Upgrade to Pro for unlimited records.' },
        { status: 403 }
      )
    }
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
  const record = await prisma.decisionRecord.create({
    data: {
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
    },
  })

  return NextResponse.json(record, { status: saveAsDraft ? 200 : 201 })
}

// GET /api/decisions — list user's records (paginated)
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
