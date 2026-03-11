import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const OutcomeSchema = z.object({
  whatHappened: z.string().min(10, 'Please describe what happened (min 10 characters)'),
  outcomeRating: z.enum([
    'MUCH_BETTER',
    'SLIGHTLY_BETTER',
    'AS_EXPECTED',
    'SLIGHTLY_WORSE',
    'MUCH_WORSE',
    'TOO_EARLY_TO_TELL',
  ]),
  lessonsLearned: z.string().optional(),
})

// GET /api/decisions/:id/outcomes
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const outcomes = await prisma.outcomeUpdate.findMany({
    where: { decisionId: id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(outcomes)
}

// POST /api/decisions/:id/outcomes
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = OutcomeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const outcome = await prisma.outcomeUpdate.create({
    data: {
      decisionId: id,
      whatHappened: parsed.data.whatHappened,
      outcomeRating: parsed.data.outcomeRating,
      lessonsLearned: parsed.data.lessonsLearned,
    },
  })

  return NextResponse.json(outcome, { status: 201 })
}
