import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Client } from '@upstash/qstash'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const ReminderSchema = z.object({
  scheduledFor: z.string().datetime({ message: 'Invalid date — use ISO 8601 format' }),
})

function getQStash() {
  if (!process.env.QSTASH_TOKEN) return null
  return new Client({ token: process.env.QSTASH_TOKEN })
}

// GET /api/decisions/:id/reminders
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const reminders = await prisma.checkInReminder.findMany({
    where: { decisionId: id },
    orderBy: { scheduledFor: 'asc' },
  })

  return NextResponse.json(reminders)
}

// POST /api/decisions/:id/reminders
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = ReminderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const scheduledFor = new Date(parsed.data.scheduledFor)
  if (scheduledFor <= new Date()) {
    return NextResponse.json({ error: 'Reminder must be in the future' }, { status: 400 })
  }

  const reminder = await prisma.checkInReminder.create({
    data: { decisionId: id, scheduledFor },
  })

  // Schedule QStash job (best-effort — fails silently if not configured)
  const qstash = getQStash()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (qstash) {
    try {
      const delaySeconds = Math.floor((scheduledFor.getTime() - Date.now()) / 1000)
      await qstash.publishJSON({
        url: `${appUrl}/api/jobs/send-reminder`,
        delay: delaySeconds,
        body: { reminderId: reminder.id, decisionId: id, userId: dbUser.id },
      })
    } catch (err) {
      console.error('[QStash] Failed to schedule reminder:', err)
      // Don't fail the request — reminder is saved in DB, QStash is best-effort
    }
  }

  return NextResponse.json(reminder, { status: 201 })
}
