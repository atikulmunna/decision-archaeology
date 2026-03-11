import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CreateDecisionSchema } from '@/lib/validations/decision'

export const dynamic = 'force-dynamic'

// POST /api/decisions — create new decision record
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
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
  const parsed = CreateDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const data = parsed.data
  const record = await prisma.decisionRecord.create({
    data: {
      userId: dbUser.id,
      title: data.title,
      summary: data.summary,
      context: data.context,
      alternatives: data.alternatives,
      chosenOption: data.chosenOption,
      reasoning: data.reasoning,
      values: data.values,
      uncertainties: data.uncertainties,
      predictedOutcome: data.predictedOutcome,
      predictedTimeframe: data.predictedTimeframe ? new Date(data.predictedTimeframe) : null,
      confidenceLevel: data.confidenceLevel,
      domainTag: data.domainTag ?? null,
      customTags: data.customTags,
      isDraft: false,
    },
  })

  return NextResponse.json(record, { status: 201 })
}

// GET /api/decisions — list user's records (paginated)
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const skip = (page - 1) * limit

  const [records, total] = await Promise.all([
    prisma.decisionRecord.findMany({
      where: { userId: dbUser.id, isDraft: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { outcomes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.decisionRecord.count({ where: { userId: dbUser.id, isDraft: false } }),
  ])

  return NextResponse.json({ records, total, page, limit })
}
