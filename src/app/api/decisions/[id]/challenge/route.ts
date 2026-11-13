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
const isUniqueViolation = (error: unknown) => (error as { code?: unknown } | null)?.code === 'P2002'

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
    await prisma.decisionRecord.updateMany({
      where: { id, OR: [{ challengeOutcome: null }, { challengeOutcome: 'UNAVAILABLE' }] },
      data: { challengeOutcome: 'UNAVAILABLE' },
    })
    return NextResponse.json({ error: 'The AI could not be reached. Try again, or seal without questions.' }, { status: 503 })
  }

  const rows = reply.data.questions.map((item, position) => ({ decisionId: id, position, question: cleanQuestion(item.question) }))
  try {
    await prisma.$transaction([
      prisma.challengeQuestion.createMany({ data: rows }),
      prisma.decisionRecord.update({ where: { id }, data: { challengeOutcome: 'ASKED', challengeModel: reply.model } }),
    ])
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    // A second request for the same draft won the race: hand back what it stored.
    const stored = await prisma.challengeQuestion.findMany({ where: { decisionId: id }, orderBy: { position: 'asc' } })
    const owner = await prisma.decisionRecord.findFirst({ where: { id, userId: dbUser.id }, select: { challengeModel: true } })
    return NextResponse.json({ questions: asQuestions(stored), model: owner?.challengeModel ?? null })
  }

  return NextResponse.json({ questions: asQuestions(rows), model: reply.model }, { status: 201 })
}
