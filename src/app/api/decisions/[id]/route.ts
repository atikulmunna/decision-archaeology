import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { isDecisionLocked, normalizeDecisionLockState } from '@/lib/locks'
import {
  DraftDecisionSchema,
  FinalizeDecisionSchema,
  UpdateNotesSchema,
  UpdateDraftSchema,
} from '@/lib/validations/decision'
import { getOrCreateDbUser } from '@/lib/db-user'
import {
  authorizeDecisionPatch,
  buildFinalizeTimestamps,
  classifyDecisionPatch,
} from '@/lib/decision-patch'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// GET /api/decisions/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
    include: { outcomes: { orderBy: { createdAt: 'asc' } } },
  })

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(normalizeDecisionLockState(record))
}

// PATCH /api/decisions/:id: update notes (always) or draft fields (only if not locked)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body: unknown = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const intent = classifyDecisionPatch(body as Record<string, unknown>, record)
  const authorization = authorizeDecisionPatch(record, intent)
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  // Notes update: always allowed
  if (intent === 'notes') {
    const parsed = UpdateNotesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
    }
    const updated = await prisma.decisionRecord.update({
      where: { id },
      data: { supplementaryNotes: parsed.data.supplementaryNotes },
    })
    return NextResponse.json(updated)
  }

  if (intent === 'finalize') {
    const parsed = FinalizeDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const updated = await prisma.decisionRecord.update({
      where: { id },
      data: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        context: parsed.data.context,
        alternatives: parsed.data.alternatives,
        chosenOption: parsed.data.chosenOption,
        reasoning: parsed.data.reasoning,
        values: parsed.data.values,
        uncertainties: parsed.data.uncertainties,
        predictedOutcome: parsed.data.predictedOutcome,
        predictedTimeframe: parsed.data.predictedTimeframe
          ? new Date(parsed.data.predictedTimeframe)
          : null,
        confidenceLevel: parsed.data.confidenceLevel,
        domainTag: parsed.data.domainTag ?? null,
        customTags: parsed.data.customTags,
        isDraft: false,
        ...buildFinalizeTimestamps(record, new Date()),
      },
    })

    return NextResponse.json(updated)
  }

  if (intent === 'draft') {
    const parsed = DraftDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const updated = await prisma.decisionRecord.update({
      where: { id },
      data: {
        ...parsed.data,
        predictedTimeframe:
          parsed.data.predictedTimeframe === null
            ? null
            : parsed.data.predictedTimeframe
              ? new Date(parsed.data.predictedTimeframe)
              : undefined,
      },
    })

    return NextResponse.json(updated)
  }

  // Core field update: authorizeDecisionPatch already rejected locked records
  const parsed = UpdateDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 })
  }

  const updated = await prisma.decisionRecord.update({
    where: { id },
    data: {
      ...parsed.data,
      predictedTimeframe: parsed.data.predictedTimeframe
        ? new Date(parsed.data.predictedTimeframe)
        : undefined,
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/decisions/:id: only drafts can be deleted
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!record.isDraft) {
    return NextResponse.json({ error: 'Finalized decisions cannot be deleted.' }, { status: 403 })
  }

  if (isDecisionLocked(record)) {
    return NextResponse.json({ error: 'Locked records cannot be deleted.' }, { status: 403 })
  }

  await prisma.decisionRecord.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
