import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'
import { openLetter } from '@/lib/letters'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// GET /api/decisions/:id/letter: opens the owner's letter on or after its day; before it, only the day.
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id, isDraft: false }, select: { id: true } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(await openLetter(dbUser.id, id, new Date()))
}
