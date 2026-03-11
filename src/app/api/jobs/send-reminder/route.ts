import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Receiver } from '@upstash/qstash'

export const dynamic = 'force-dynamic'

// Called by QStash at the scheduled time
export async function POST(req: NextRequest) {
  // Verify the request genuinely came from QStash
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
    const signature = req.headers.get('upstash-signature') ?? ''
    const body = await req.text()
    const isValid = await receiver.verify({ signature, body }).catch(() => false)
    if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const payload = JSON.parse(body) as { reminderId: string; decisionId: string; userId: string }
    return handleReminder(payload.reminderId, payload.decisionId)
  }

  // Dev mode: no signature verification
  const payload = await req.json()
  return handleReminder(payload.reminderId, payload.decisionId)
}

async function handleReminder(reminderId: string, decisionId: string) {
  const reminder = await prisma.checkInReminder.findUnique({ where: { id: reminderId } })
  if (!reminder || reminder.sentAt) {
    return NextResponse.json({ skipped: true })
  }

  const record = await prisma.decisionRecord.findUnique({
    where: { id: decisionId },
    include: { user: true },
  })
  if (!record) return NextResponse.json({ error: 'Decision not found' }, { status: 404 })

  // Send email (stub — fully implemented in Phase 10 with templates)
  if (process.env.SENDGRID_API_KEY && record.user.email) {
    try {
      const sgMail = (await import('@sendgrid/mail')).default
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      await sgMail.send({
        to: record.user.email,
        from: process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@decisionarchaeology.com',
        subject: `Check-in reminder: "${record.user.displayName ? `${record.user.displayName}'s` : 'Your'} decision"`,
        text: `Hi,\n\nThis is your check-in reminder for the decision: "${record.title}".\n\nHead back to Decision Archaeology to log how it played out.\n\n— Decision Archaeology`,
      })
    } catch (err) {
      console.error('[SendGrid] Email send failed:', err)
    }
  }

  // Mark as sent
  await prisma.checkInReminder.update({
    where: { id: reminderId },
    data: { sentAt: new Date() },
  })

  return NextResponse.json({ sent: true })
}
