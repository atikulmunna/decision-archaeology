import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkInRequestEmail } from '@/lib/email/messages'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; shareId: string }> }

// POST /api/decisions/:id/share/:shareId/checkin: collaborator requests outcome update from owner
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
        ...checkInRequestEmail({
          collaboratorName: dbUser.displayName ?? 'A collaborator',
          title: share.decision.title,
          url: `${appUrl}/decisions/${id}`,
        }),
      })
    } catch (err) {
      console.error('[Resend] Check-in request email failed:', err)
    }
  }

  return NextResponse.json({ requested: true })
}
