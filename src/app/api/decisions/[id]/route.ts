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
import {
  CATALOG_CONFLICT_MESSAGE,
  CatalogNumberConflictError,
  withCatalogNumberRetry,
} from '@/lib/catalog'
import { getMaxCatalogNumber } from '@/lib/catalog-db'
import { afterUpdate, SEALED_RELATIONS, sealFields } from '@/lib/seal'
import { resolveChallengeWrite } from '@/lib/devils-advocate'
import { checkLetter, letterFingerprint } from '@/lib/letter-rules'
import { isoDay, parseIsoDay } from '@/lib/utc-days'
import { staleForecastIssues, toForecastRows } from '@/lib/forecast-input'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// A conditional write found no matching row: the draft changed (or was finalized) after it was read.
const isRecordMissing = (error: unknown) => (error as { code?: unknown } | null)?.code === 'P2025'

// GET /api/decisions/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
    include: { outcomes: { orderBy: { createdAt: 'asc' } }, ...SEALED_RELATIONS },
  })

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // A draft shows its letter so the author can keep writing; once sealed, only the day and fingerprint travel.
  if (record.isDraft) {
    const draftLetter = await prisma.letter.findUnique({ where: { decisionId: id }, select: { body: true, opensAt: true } })
    return NextResponse.json({
      ...normalizeDecisionLockState(record),
      letter: draftLetter ? { body: draftLetter.body, opensOn: isoDay(draftLetter.opensAt) } : null,
    })
  }
  return NextResponse.json(normalizeDecisionLockState(record))
}

// PATCH /api/decisions/:id: update notes (always) or draft fields (only if not locked)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Forecasts and challenge questions are loaded so a seal taken without new ones in the body still covers them.
  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
    include: SEALED_RELATIONS,
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const storedForecasts = record.forecasts ?? []
  const storedQuestions = record.challengeQuestions ?? []
  const challengeStored = { outcome: record.challengeOutcome ?? null, questionCount: storedQuestions.length }
  // Answers land on the stored questions by position; only the challenge route ever writes questions.
  const answerWrite = (answers: Array<string | null> | null) =>
    answers
      ? { challengeQuestions: { updateMany: answers.map((answer, index) => ({ where: { position: storedQuestions[index].position }, data: { answer } })) } }
      : {}

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
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }
    const updated = await prisma.decisionRecord.update({
      where: { id },
      data: { supplementaryNotes: parsed.data.supplementaryNotes },
    })
    return NextResponse.json(updated)
  }

  const now = new Date()

  if (intent === 'finalize') {
    const parsed = FinalizeDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const challenge = resolveChallengeWrite(challengeStored, {
      answers: parsed.data.challengeAnswers,
      skipped: parsed.data.challengeSkipped,
      finalizing: true,
    })
    if (!challenge.ok) return NextResponse.json({ error: challenge.error }, { status: 400 })
    const sealedQuestions = challenge.answers
      ? storedQuestions.map((item, index) => ({ ...item, answer: challenge.answers![index] }))
      : storedQuestions

    // The letter sealed is the one sent, or else the one kept with the draft; blank means none.
    let letterInput = parsed.data.letter
    if (letterInput === undefined) {
      const kept = await prisma.letter.findUnique({ where: { decisionId: id }, select: { body: true, opensAt: true } })
      letterInput = kept ? { body: kept.body, opensOn: isoDay(kept.opensAt) } : null
    }
    const letterCheck = checkLetter(letterInput, now)
    if (!letterCheck.ok) return NextResponse.json({ error: letterCheck.error }, { status: 400 })
    const letter = letterCheck.letter ? { ...letterCheck.letter, sha256: await letterFingerprint(letterCheck.letter.body) } : null
    const letterWrite = letter ? { letter: { upsert: { create: letter, update: letter } } } : {}

    const finalizeData = {
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
      ...(challenge.outcome ? { challengeOutcome: challenge.outcome } : {}),
      ...buildFinalizeTimestamps(record, now),
    }
    const forecastRows = parsed.data.forecasts ? toForecastRows(parsed.data.forecasts) : null
    // Drafts may hold any date; a finalize that keeps the stored set still needs them after today.
    const staleIssues = forecastRows ? [] : staleForecastIssues(storedForecasts, now)
    if (staleIssues.length > 0) {
      return NextResponse.json({ error: 'Validation failed', issues: staleIssues }, { status: 400 })
    }
    const forecastWrite = forecastRows ? { forecasts: { deleteMany: {}, create: forecastRows } } : {}

    try {
      const updated = await withCatalogNumberRetry(
        async (catalogNumber) => {
          const seal = await sealFields(
            {
              ...afterUpdate(record, { ...finalizeData, catalogNumber }),
              forecasts: forecastRows ?? storedForecasts,
              challengeQuestions: sealedQuestions,
              letter: letter ? { opensAt: letter.opensAt, sha256: letter.sha256 } : null,
            },
            now
          )
          // Written only onto the draft as it was read, so a challenge that landed meanwhile is never sealed over.
          return prisma.decisionRecord.update({
            where: { id, isDraft: true, challengeOutcome: record.challengeOutcome ?? null },
            data: { ...finalizeData, catalogNumber, ...forecastWrite, ...answerWrite(challenge.answers), ...letterWrite, ...seal },
          })
        },
        () => getMaxCatalogNumber(dbUser.id)
      )
      // A draft letter is removed only once the decision has sealed without one, so a failed seal keeps it.
      if (!letter) await prisma.letter.deleteMany({ where: { decisionId: id } })
      return NextResponse.json(updated)
    } catch (error) {
      if (error instanceof CatalogNumberConflictError) {
        return NextResponse.json({ error: CATALOG_CONFLICT_MESSAGE }, { status: 409 })
      }
      if (isRecordMissing(error)) {
        return NextResponse.json({ error: 'This decision changed while sealing. Review it and try again.' }, { status: 409 })
      }
      throw error
    }
  }

  if (intent === 'draft') {
    const parsed = DraftDecisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { forecasts: draftForecasts, challengeAnswers, letter: draftLetter, ...draftFields } = parsed.data
    const challenge = resolveChallengeWrite(challengeStored, { answers: challengeAnswers, finalizing: false })
    if (!challenge.ok) return NextResponse.json({ error: challenge.error }, { status: 400 })
    // Drafts keep the letter as typed; the rules and the fingerprint apply at sealing.
    const draftLetterDay = draftLetter && draftLetter.body.trim() ? parseIsoDay(draftLetter.opensOn) : null
    // Gated on the decision still being a draft, so a late autosave can never remove a sealed letter.
    if (draftLetter !== undefined && !draftLetterDay) {
      await prisma.letter.deleteMany({ where: { decisionId: id, decision: { isDraft: true } } })
    }
    const draftLetterRow = draftLetter && draftLetterDay ? { body: draftLetter.body, opensAt: draftLetterDay, sha256: '' } : null
    // A late autosave never lands on a decision that was finalized after this request read it.
    const updated = await prisma.decisionRecord
      .update({
        where: { id, isDraft: true },
        data: {
        ...draftFields,
        predictedTimeframe:
          draftFields.predictedTimeframe === null
            ? null
            : draftFields.predictedTimeframe
              ? new Date(draftFields.predictedTimeframe)
              : undefined,
        ...(draftForecasts ? { forecasts: { deleteMany: {}, create: toForecastRows(draftForecasts) } } : {}),
        ...answerWrite(challenge.answers),
        ...(draftLetterRow ? { letter: { upsert: { create: draftLetterRow, update: draftLetterRow } } } : {}),
        },
      })
      .catch((error: unknown) => {
        if (isRecordMissing(error)) return null
        throw error
      })
    if (!updated) return NextResponse.json({ error: 'This decision is already finalized.' }, { status: 409 })

    return NextResponse.json(updated)
  }

  // Core field update: authorizeDecisionPatch already rejected locked records
  const parsed = UpdateDraftSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { forecasts: coreForecasts, ...coreFields } = parsed.data
  const coreData = {
    ...coreFields,
    predictedTimeframe: coreFields.predictedTimeframe
      ? new Date(coreFields.predictedTimeframe)
      : undefined,
  }
  const forecastRows = coreForecasts ? toForecastRows(coreForecasts) : null
  // Prisma skips undefined fields, so the seal covers the record as this update leaves it.
  const updated = await prisma.decisionRecord.update({
    where: { id },
    // Imported records are exempt from the time lock, so they never carry a seal.
    data: {
      ...coreData,
      ...(forecastRows ? { forecasts: { deleteMany: {}, create: forecastRows } } : {}),
      ...(record.isImported
        ? { sealHash: null, sealedAt: null }
        : await sealFields({ ...afterUpdate(record, coreData), forecasts: forecastRows ?? storedForecasts }, now)),
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

  // A note promoted into this draft stays: the foreign key unlinks it, and it is no longer where a decision started.
  await prisma.$transaction([
    prisma.fieldNote.updateMany({ where: { decisionId: id }, data: { promoted: false } }),
    prisma.decisionRecord.delete({ where: { id } }),
  ])
  return NextResponse.json({ success: true })
}
