import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const FeedbackSchema = z.object({
  biasName: z.string().min(1),
  reason: z.string().optional(),
})

// POST /api/ai/reports/:id/feedback — flag a bias finding as inaccurate
export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const report = await prisma.biasReport.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const existing = (report.flaggedFindings as string[]) ?? []
  const flagEntry = parsed.data.reason
    ? `${parsed.data.biasName}: ${parsed.data.reason}`
    : parsed.data.biasName

  if (!existing.includes(flagEntry)) {
    await prisma.biasReport.update({
      where: { id },
      data: { flaggedFindings: [...existing, flagEntry] },
    })
  }

  return NextResponse.json({ flagged: true, biasName: parsed.data.biasName })
}
