import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; shareId: string }> }

// DELETE /api/decisions/:id/share/:shareId — revoke share (owner only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, shareId } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const share = await prisma.collaboratorShare.findFirst({
    where: { id: shareId, decisionId: id, ownerId: dbUser.id },
  })
  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.collaboratorShare.update({
    where: { id: shareId },
    data: { isActive: false },
  })

  return NextResponse.json({ revoked: true })
}
