import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runBiasAnalysisPipeline } from '@/lib/ai-pipeline'
import { readVerifiedJobBody } from '@/lib/jobs'
import { logError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const result = await readVerifiedJobBody<{ reportId: string; userId: string }>(req)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return runJob(result.payload.reportId, result.payload.userId)
}

async function runJob(reportId: string, userId: string) {
  // Mark as running
  await prisma.biasReport.update({
    where: { id: reportId },
    data: { status: 'RUNNING' },
  })

  try {
    // Fetch all decisions with outcomes
    const decisions = await prisma.decisionRecord.findMany({
      where: { userId, isDraft: false },
      include: { outcomes: true },
      orderBy: { createdAt: 'asc' },
    })

    // Build previously-flagged bias context to inject as false-positive hints
    const previousReports = await prisma.biasReport.findMany({
      where: { userId, status: 'COMPLETE' },
      select: { flaggedFindings: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
    const flaggedBiases = previousReports
      .flatMap((r) => (r.flaggedFindings as string[]) ?? [])
      .filter(Boolean)

    // Run the 5-pass pipeline
    const result = await runBiasAnalysisPipeline(decisions)

    // Filter out biases the user has previously flagged as false positives
    const filteredBiases = result.biases.filter(
      (bias) => !flaggedBiases.some((f) => f.toLowerCase().includes(bias.name.toLowerCase()))
    )

    // Save completed report
    await prisma.biasReport.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETE',
        summary: result.summary,
        findings: filteredBiases as object[],
        calibrationInsight: result.calibrationInsight,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, reportId })
  } catch (err) {
    await logError('[generate-report] Pipeline failed', err, { reportId, userId })
    await prisma.biasReport.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      },
    })
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 })
  }
}
