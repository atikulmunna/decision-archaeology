import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { isDecisionLocked } from '@/lib/locks'
import {
  CorrectionRequestSchema,
  getCorrectableFieldValue,
  getLatestApprovedCorrection,
  isLikelyTypoCorrection,
} from '@/lib/corrections'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id, isDraft: false },
    include: { corrections: { orderBy: { createdAt: 'desc' } } },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!isDecisionLocked(record)) {
    return NextResponse.json(
      { error: 'Correction requests are only available after a decision is locked.' },
      { status: 409 }
    )
  }

  const body = await req.json()
  const parsed = CorrectionRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const originalText = getCorrectableFieldValue(record, parsed.data.fieldName)
  if (!originalText) {
    return NextResponse.json({ error: 'That field cannot be corrected.' }, { status: 422 })
  }

  if (!isLikelyTypoCorrection(originalText, parsed.data.correctedText)) {
    return NextResponse.json(
      {
        error:
          'Correction requests are limited to small spelling or punctuation fixes and cannot change the meaning of the original record.',
      },
      { status: 422 }
    )
  }

  const latestApproved = getLatestApprovedCorrection(record.corrections, parsed.data.fieldName)
  if (latestApproved?.correctedText.trim() === parsed.data.correctedText.trim()) {
    return NextResponse.json(
      { error: 'That correction has already been approved for this field.' },
      { status: 409 }
    )
  }

  const correction = await prisma.correctionRequest.create({
    data: {
      decisionId: id,
      fieldName: parsed.data.fieldName,
      originalText,
      correctedText: parsed.data.correctedText,
      reason: parsed.data.reason,
      status: 'PENDING',
    },
  })

  return NextResponse.json(correction, { status: 201 })
}
