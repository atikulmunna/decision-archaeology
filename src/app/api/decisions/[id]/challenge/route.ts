import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateDbUser } from '@/lib/db-user'
import { generateStructured } from '@/lib/ai'
import {
  CHALLENGE_DAILY_CAP,
  CHALLENGE_TIMEOUT_MS,
  ChallengeSchema,
  buildChallengeMessages,
  cleanQuestion,
} from '@/lib/devils-advocate'

export const dynamic = 'force-dynamic'
// One routed call with a 20 second deadline, plus the database work around it.
export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

const DAY_MS = 24 * 60 * 60 * 1000
const REQUIRED = ['title', 'summary', 'context', 'alternatives', 'chosenOption', 'reasoning'] as const

type QuestionRow = { position: number; question: string }
const asQuestions = (rows: QuestionRow[]) => rows.map((row) => ({ position: row.position, question: row.question }))

// POST /api/decisions/:id/challenge: the Devil's Advocate asks two or three questions about a draft.
// Only this route writes questions, so a seal can never vouch for questions the browser made up.
export async function POST(_req: NextRequest, { params }: Params) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { id } = await params
  const record = await prisma.decisionRecord.findFirst({
    where: { id, userId: dbUser.id },
    include: { forecasts: { orderBy: { position: 'asc' } }, challengeQuestions: { orderBy: { position: 'asc' } } },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!record.isDraft) return NextResponse.json({ error: 'This decision is already sealed.' }, { status: 409 })
  if (REQUIRED.some((field) => !record[field]?.trim())) {
    return NextResponse.json({ error: 'Finish your reasoning first.' }, { status: 422 })
  }

  // Asked once per draft: a reload or a second press gets the same questions and costs nothing.
  if (record.challengeOutcome === 'ASKED') {
    return NextResponse.json({ questions: asQuestions(record.challengeQuestions), model: record.challengeModel })
  }

  // Every call that reaches the AI counts, kept apart from drafts so deleting one gives nothing back.
  const attempts = await prisma.challengeAttempt.count({
    where: { userId: dbUser.id, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
  })
  if (attempts >= CHALLENGE_DAILY_CAP) {
    return NextResponse.json(
      { error: "You have used today's 20 challenges. Seal without questions, or try again tomorrow." },
      { status: 429 }
    )
  }
  await prisma.challengeAttempt.create({ data: { userId: dbUser.id } })

  let reply: { data: { questions: Array<{ question: string }> }; model: string }
  try {
    reply = await generateStructured({
      messages: buildChallengeMessages(record),
      schema: ChallengeSchema,
      schemaName: 'devils_advocate',
      costTier: 'medium',
      maxTokens: 1000,
      timeoutMs: CHALLENGE_TIMEOUT_MS,
    })
  } catch (error) {
    console.error("Devil's Advocate failed:", error instanceof Error ? error.message : error)
    // Only a draft records a failure, so a decision sealed meanwhile keeps its outcome and its seal.
    await prisma.decisionRecord.updateMany({
      where: { id, isDraft: true, OR: [{ challengeOutcome: null }, { challengeOutcome: 'UNAVAILABLE' }] },
      data: { challengeOutcome: 'UNAVAILABLE' },
    })
    return NextResponse.json({ error: 'The AI could not be reached. Try again, or seal without questions.' }, { status: 503 })
  }

  const rows = reply.data.questions.map((item, position) => ({ decisionId: id, position, question: cleanQuestion(item.question) }))
  // Claim the draft before writing: the conditional update locks the row, so a finalize or a second
  // request that got there first wins, and questions are never written onto a sealed decision.
  const stored = await prisma.$transaction(async (tx) => {
    const claimed = await tx.decisionRecord.updateMany({
      where: { id, isDraft: true, OR: [{ challengeOutcome: null }, { challengeOutcome: 'UNAVAILABLE' }] },
      data: { challengeOutcome: 'ASKED', challengeModel: reply.model },
    })
    if (claimed.count === 0) return false
    await tx.challengeQuestion.createMany({ data: rows })
    return true
  })
  if (!stored) {
    const current = await prisma.decisionRecord.findFirst({
      where: { id, userId: dbUser.id },
      include: { challengeQuestions: { orderBy: { position: 'asc' } } },
    })
    if (current?.isDraft && current.challengeOutcome === 'ASKED') {
      return NextResponse.json({ questions: asQuestions(current.challengeQuestions), model: current.challengeModel })
    }
    return NextResponse.json({ error: 'This decision is already sealed.' }, { status: 409 })
  }

  return NextResponse.json({ questions: asQuestions(rows), model: reply.model }, { status: 201 })
}
