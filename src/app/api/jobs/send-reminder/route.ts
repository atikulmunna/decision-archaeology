import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Receiver } from '@upstash/qstash'
import { logError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify the request genuinely came from QStash (production)
  if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
    const signature = req.headers.get('upstash-signature') ?? ''
    const body = await req.text()
    const isValid = await receiver.verify({ signature, body }).catch(() => false)
    if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const payload = JSON.parse(body) as { reminderId: string; decisionId: string }
    return handleReminder(payload.reminderId, payload.decisionId)
  }

  // Local dev: no signature verification
  const payload = await req.json()
  return handleReminder(payload.reminderId, payload.decisionId)
}

async function handleReminder(reminderId: string, decisionId: string) {
  const reminder = await prisma.checkInReminder.findUnique({ where: { id: reminderId } })
  if (!reminder || reminder.sentAt) return NextResponse.json({ skipped: true })

  const record = await prisma.decisionRecord.findUnique({
    where: { id: decisionId },
    include: { user: true },
  })
  if (!record) return NextResponse.json({ error: 'Decision not found' }, { status: 404 })

  // Send email via Resend
  if (process.env.RESEND_API_KEY && record.user.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Decision Archaeology <no-reply@decisionarchaeology.com>',
        to: record.user.email,
        subject: `Check-in reminder: "${record.title}"`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#4f46e5">⏰ Time to check in</h2>
            <p>You set a reminder for your decision:</p>
            <blockquote style="border-left:3px solid #4f46e5;padding-left:16px;color:#374151">
              <strong>${record.title}</strong>
            </blockquote>
            <p>Head back to Decision Archaeology to log what actually happened.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://decisionarchaeology.com'}/decisions/${record.id}"
               style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
              Log outcome →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px">
              Decision Archaeology · You can manage reminders in your account settings.
            </p>
          </div>
        `,
      })
    } catch (err) {
      await logError('[Resend] Email send failed', err, { reminderId, decisionId })
    }
  }

  await prisma.checkInReminder.update({
    where: { id: reminderId },
    data: { sentAt: new Date() },
  })

  return NextResponse.json({ sent: true })
}
