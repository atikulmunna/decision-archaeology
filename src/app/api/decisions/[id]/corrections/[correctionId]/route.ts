import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { CorrectionStatusSchema } from '@/lib/corrections'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string; correctionId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, correctionId } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id, isDraft: false },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const correction = await prisma.correctionRequest.findFirst({
    where: { id: correctionId, decisionId: id },
  })
  if (!correction) return NextResponse.json({ error: 'Correction request not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CorrectionStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const updated = await prisma.correctionRequest.update({
    where: { id: correctionId },
    data: { status: parsed.data.status },
  })

  return NextResponse.json(updated)
}
