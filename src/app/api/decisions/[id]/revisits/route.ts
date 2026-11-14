import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'
import { checkCheckInDay } from '@/lib/revisit'
import { isoDay } from '@/lib/utc-days'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const FinishSchema = z.object({ nextCheckIn: z.string().nullable() })
const BAD_DAY = 'Pick a day in the next two years.'

// POST /api/decisions/:id/revisits: finish a revisit. Records it, completes every pending check-in
// (a revisit done early counts for it), and schedules the next one unless the owner chose not again.
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id, isDraft: false }, select: { id: true } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = FinishSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: BAD_DAY }, { status: 400 })
  const now = new Date()
  let next: Date | null = null
  if (parsed.data.nextCheckIn !== null) {
    const day = checkCheckInDay(parsed.data.nextCheckIn, now)
    if (!day.ok) return NextResponse.json({ error: day.error }, { status: 400 })
    next = day.at
  }

  const [revisit] = await prisma.$transaction([
    prisma.revisit.create({ data: { decisionId: id, completedAt: now } }),
    prisma.checkInReminder.updateMany({ where: { decisionId: id, completedAt: null }, data: { completedAt: now } }),
    ...(next ? [prisma.checkInReminder.create({ data: { decisionId: id, scheduledFor: next } })] : []),
  ])
  return NextResponse.json({ revisitId: revisit.id, nextCheckIn: next ? isoDay(next) : null }, { status: 201 })
}
