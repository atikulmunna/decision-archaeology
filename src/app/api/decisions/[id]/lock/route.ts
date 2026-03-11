import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// POST /api/decisions/:id/lock — permanently lock the core fields
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (record.isLocked) {
    return NextResponse.json({ error: 'Record is already locked.' }, { status: 409 })
  }

  const updated = await prisma.decisionRecord.update({
    where: { id },
    data: { isLocked: true, lockedAt: new Date() },
  })

  return NextResponse.json(updated)
}
