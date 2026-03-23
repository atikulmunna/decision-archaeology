import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { OUTCOME_LABELS } from '@/lib/decisions'
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

  // Fan-out: notify active collaborators (best-effort, non-blocking)
  notifyCollaborators(
    id,
    record.title,
    dbUser.displayName ?? 'The owner',
    outcome.outcomeRating,
    outcome.whatHappened
  ).catch(console.error)

  return NextResponse.json(outcome, { status: 201 })
}

async function notifyCollaborators(
  decisionId: string,
  decisionTitle: string,
  ownerName: string,
  outcomeRating: keyof typeof OUTCOME_LABELS,
  whatHappened: string
) {
  if (!process.env.RESEND_API_KEY) return

  const shares = await prisma.collaboratorShare.findMany({
    where: { decisionId, isActive: true },
    include: { collaborator: { select: { email: true } } },
  })
  if (shares.length === 0) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const summary = whatHappened.length > 180 ? `${whatHappened.slice(0, 177)}...` : whatHappened

  await Promise.allSettled(
    shares.map((s) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Decision Archaeology <no-reply@resend.dev>',
        to: s.collaborator.email,
        subject: `${ownerName} added an outcome update`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#4f46e5">📊 New outcome logged</h2>
            <p><strong>${ownerName}</strong> just added an outcome update to a decision you're following:</p>
            <blockquote style="border-left:3px solid #4f46e5;padding-left:16px;color:#374151">
              <strong>${decisionTitle}</strong>
            </blockquote>
            <p style="margin:16px 0 8px 0">
              <strong>Outcome rating:</strong> ${OUTCOME_LABELS[outcomeRating]}
            </p>
            <p style="margin:0 0 16px 0;color:#374151">
              ${summary}
            </p>
            <a href="${appUrl}/shared/${s.id}"
               style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
              View outcome history →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px">Decision Archaeology</p>
          </div>
        `,
      })
    )
  )
}
