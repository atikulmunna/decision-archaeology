import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'
import { checkCheckInDay } from '@/lib/revisit'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const CheckInSchema = z.object({ day: z.string() })

/** The owner's sealed decision, or the response to return instead. */
async function ownSealedDecision(id: string): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { userId } = await auth()
  if (!userId) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id, isDraft: false }, select: { id: true } })
  if (!record) return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  return { ok: true }
}

// GET /api/decisions/:id/reminders: the decision's check-ins, newest first
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const owner = await ownSealedDecision(id)
  if (!owner.ok) return owner.response
  const checkIns = await prisma.checkInReminder.findMany({ where: { decisionId: id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(checkIns)
}

// POST /api/decisions/:id/reminders: schedule a check-in. It replaces the pending one, so there is never
// more than one; the daily job emails it when it is due.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const owner = await ownSealedDecision(id)
  if (!owner.ok) return owner.response

  const parsed = CheckInSchema.safeParse(await req.json().catch(() => null))
  const now = new Date()
  const day = parsed.success ? checkCheckInDay(parsed.data.day, now) : null
  if (!day || !day.ok) {
    return NextResponse.json({ error: day && !day.ok ? day.error : 'Pick a day in the next two years.' }, { status: 400 })
  }

  const [, checkIn] = await prisma.$transaction([
    prisma.checkInReminder.updateMany({ where: { decisionId: id, completedAt: null }, data: { completedAt: now } }),
    prisma.checkInReminder.create({ data: { decisionId: id, scheduledFor: day.at } }),
  ])
  return NextResponse.json({ id: checkIn.id, scheduledFor: checkIn.scheduledFor }, { status: 201 })
}
