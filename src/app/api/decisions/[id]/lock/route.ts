import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecisionLockDeadline, isDecisionLocked } from '@/lib/locks'

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

  if (!isDecisionLocked(record)) {
    return NextResponse.json({ error: 'Record is still within the 5-minute edit window.' }, { status: 409 })
  }

  const updated = await prisma.decisionRecord.update({
    where: { id },
    data: { isLocked: true, lockedAt: record.lockedAt ?? getDecisionLockDeadline(record) },
  })

  return NextResponse.json(updated)
}
