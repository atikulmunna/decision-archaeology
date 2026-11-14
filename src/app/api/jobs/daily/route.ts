import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { formatCatalogNumber } from '@/lib/catalog'
import { checkInEmail, letterReadyEmail } from '@/lib/email/messages'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH = 200
type Tally = { sent: number; failed: number }
type Due = { id: string; decisionId: string; decision: { title: string; catalogNumber: number | null; user: { email: string } } }

const DECISION = { select: { title: true, catalogNumber: true, user: { select: { email: true } } } } as const

// GET /api/jobs/daily: Vercel cron, once a day. Announces letters whose day has passed and check-ins
// that are due. Each item is claimed before sending, so overlapping runs never send twice, and a
// failed send is released for tomorrow's run.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = { letters: { sent: 0, failed: 0 }, checkIns: { sent: 0, failed: 0 } }
  const apiKey = process.env.RESEND_API_KEY
  // Without email, letters still open in the app on their day; nothing is marked, so they go out once email works.
  if (!apiKey) return NextResponse.json(result)

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'Decision Archaeology <no-reply@decisionarchaeology.com>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://decisionarchaeology.com'
  const now = new Date()

  async function deliver(
    items: Due[],
    tally: Tally,
    claim: (id: string) => Promise<{ count: number }>,
    release: (id: string) => Promise<unknown>,
    build: (message: { title: string; catalog: string; revisitUrl: string }) => { subject: string; html: string; text: string }
  ) {
    for (const item of items) {
      if ((await claim(item.id)).count === 0) continue
      try {
        const catalog = item.decision.catalogNumber === null ? 'your decision' : formatCatalogNumber(item.decision.catalogNumber)
        const email = build({ title: item.decision.title, catalog, revisitUrl: `${appUrl}/decisions/${item.decisionId}/revisit` })
        const { error } = await resend.emails.send({ from, to: item.decision.user.email, ...email })
        if (error) throw new Error(error.message)
        tally.sent += 1
      } catch {
        await release(item.id)
        tally.failed += 1
      }
    }
  }

  const letters = await prisma.letter.findMany({
    where: { opensAt: { lte: now }, emailedAt: null, decision: { isDraft: false } },
    select: { id: true, decisionId: true, decision: DECISION },
    orderBy: { opensAt: 'asc' },
    take: BATCH,
  })
  await deliver(
    letters,
    result.letters,
    (id) => prisma.letter.updateMany({ where: { id, emailedAt: null }, data: { emailedAt: now } }),
    (id) => prisma.letter.updateMany({ where: { id }, data: { emailedAt: null } }),
    letterReadyEmail
  )

  const checkIns = await prisma.checkInReminder.findMany({
    where: { scheduledFor: { lte: now }, sentAt: null, completedAt: null, decision: { isDraft: false } },
    select: { id: true, decisionId: true, decision: DECISION },
    orderBy: { scheduledFor: 'asc' },
    take: BATCH,
  })
  await deliver(
    checkIns,
    result.checkIns,
    (id) => prisma.checkInReminder.updateMany({ where: { id, sentAt: null }, data: { sentAt: now } }),
    (id) => prisma.checkInReminder.updateMany({ where: { id }, data: { sentAt: null } }),
    checkInEmail
  )

  return NextResponse.json(result)
}
