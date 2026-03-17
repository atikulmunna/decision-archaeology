import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const InviteSchema = z.object({
  email: z.string().email(),
})

// GET /api/decisions/:id/share — list active shares
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const decision = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!decision) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const shares = await prisma.collaboratorShare.findMany({
    where: { decisionId: id, isActive: true },
    include: { collaborator: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
    orderBy: { sharedAt: 'asc' },
  })

  return NextResponse.json(shares)
}

// POST /api/decisions/:id/share — invite collaborator
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const decision = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!decision) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // Max 5 collaborators per decision
  const activeCount = await prisma.collaboratorShare.count({
    where: { decisionId: id, isActive: true },
  })
  if (activeCount >= 5) {
    return NextResponse.json({ error: 'Maximum 5 collaborators per decision.' }, { status: 422 })
  }

  // Find or check if collaborator exists
  const collaborator = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!collaborator) {
    return NextResponse.json(
      { error: 'No account found for that email. They must sign up first.' },
      { status: 404 }
    )
  }
  if (collaborator.id === dbUser.id) {
    return NextResponse.json({ error: 'Cannot share with yourself.' }, { status: 400 })
  }

  // Idempotent — reactivate if previously revoked
  const existing = await prisma.collaboratorShare.findUnique({
    where: { decisionId_collaboratorId: { decisionId: id, collaboratorId: collaborator.id } },
  })

  let share
  if (existing) {
    share = await prisma.collaboratorShare.update({
      where: { id: existing.id },
      data: { isActive: true },
    })
  } else {
    share = await prisma.collaboratorShare.create({
      data: { decisionId: id, ownerId: dbUser.id, collaboratorId: collaborator.id },
    })
  }

  // Send invite email via Resend
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (process.env.RESEND_API_KEY && collaborator.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Decision Archaeology <no-reply@resend.dev>',
        to: collaborator.email,
        subject: `${dbUser.displayName ?? 'Someone'} shared a decision with you`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#4f46e5">📋 You've been invited to review a decision</h2>
            <p><strong>${dbUser.displayName ?? 'A Decision Archaeology user'}</strong> has shared their decision record with you:</p>
            <blockquote style="border-left:3px solid #4f46e5;padding-left:16px;color:#374151">
              <strong>${decision.title}</strong>
            </blockquote>
            <p>You can view the decision, leave comments, and track outcomes.</p>
            <a href="${appUrl}/shared/${share.id}"
               style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
              View decision →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px">Decision Archaeology</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[Resend] Invite email failed:', err)
    }
  }

  return NextResponse.json(share, { status: 201 })
}
