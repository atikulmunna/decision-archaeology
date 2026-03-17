import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; shareId: string }> }

// POST /api/decisions/:id/share/:shareId/checkin — collaborator requests outcome update from owner
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const share = await prisma.collaboratorShare.findFirst({
    where: { id: shareId, decisionId: id, collaboratorId: dbUser.id, isActive: true },
    include: { decision: true, owner: true },
  })
  if (!share) return NextResponse.json({ error: 'Not found or not a collaborator' }, { status: 404 })

  // Send check-in request email to owner
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (process.env.RESEND_API_KEY && share.owner.email) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Decision Archaeology <no-reply@resend.dev>',
        to: share.owner.email,
        subject: `${dbUser.displayName ?? 'A collaborator'} is asking for an update`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#4f46e5">🔔 Outcome update requested</h2>
            <p><strong>${dbUser.displayName ?? 'One of your collaborators'}</strong> is curious about what happened with:</p>
            <blockquote style="border-left:3px solid #4f46e5;padding-left:16px;color:#374151">
              <strong>${share.decision.title}</strong>
            </blockquote>
            <p>Log an outcome update to keep them in the loop.</p>
            <a href="${appUrl}/decisions/${id}"
               style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:8px">
              Log outcome →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:32px">Decision Archaeology</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[Resend] Check-in request email failed:', err)
    }
  }

  return NextResponse.json({ requested: true })
}
