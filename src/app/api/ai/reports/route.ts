import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Client } from '@upstash/qstash'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

function getQStash() {
  if (!process.env.QSTASH_TOKEN) return null
  return new Client({ token: process.env.QSTASH_TOKEN })
}

// GET /api/ai/reports — list user's reports
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const reports = await prisma.biasReport.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, createdAt: true, status: true,
      summary: true, decisionCount: true,
    },
  })

  return NextResponse.json(reports)
}

// POST /api/ai/reports — trigger report generation
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check minimum decision count
  const decisionCount = await prisma.decisionRecord.count({
    where: { userId: dbUser.id, isDraft: false },
  })
  if (decisionCount < 10) {
    return NextResponse.json(
      { error: 'At least 10 decisions are required to generate a bias report.' },
      { status: 422 }
    )
  }

  // Prevent duplicate in-progress report
  const inProgress = await prisma.biasReport.findFirst({
    where: { userId: dbUser.id, status: 'PENDING' },
  })
  if (inProgress) {
    return NextResponse.json(
      { error: 'A report is already being generated.', reportId: inProgress.id },
      { status: 409 }
    )
  }

  // Create a pending report record
  const report = await prisma.biasReport.create({
    data: { userId: dbUser.id, status: 'PENDING', decisionCount },
  })

  // Queue the job
  const qstash = getQStash()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (qstash) {
    try {
      await qstash.publishJSON({
        url: `${appUrl}/api/jobs/generate-report`,
        body: { reportId: report.id, userId: dbUser.id },
      })
    } catch (err) {
      console.error('[QStash] Failed to queue report generation:', err)
    }
  } else {
    // In dev without QStash: call synchronously
    await fetch(`${appUrl}/api/jobs/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id, userId: dbUser.id }),
    }).catch(console.error)
  }

  return NextResponse.json({ reportId: report.id, status: 'PENDING' }, { status: 202 })
}
