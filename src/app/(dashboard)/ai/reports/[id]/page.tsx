import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { BiasReportView } from '@/components/ai/BiasReportView'
import { Callout } from '@/components/ui/Callout'
import type { BiasEntry } from '@/lib/ai-schema'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function BackLink() {
  return (
    <Link
      href="/ai/reports"
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" size={12} strokeWidth={1.5} />
      Reports
    </Link>
  )
}

export default async function ReportDetailPage({ params }: Params) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const report = await prisma.biasReport.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!report) notFound()

  if (report.status === 'PENDING' || report.status === 'RUNNING') {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <div className="flex flex-col items-center gap-3 rounded-sm border border-rule bg-surface px-6 py-12 text-center">
          <LoaderCircle aria-hidden="true" size={24} strokeWidth={1.5} className="text-muted motion-safe:animate-spin" />
          <p className="font-display text-2xl text-ink">Generating your report</p>
          <p className="text-sm text-muted">
            The AI is analyzing your decisions. This takes 30 to 90 seconds. Refresh to check progress.
          </p>
        </div>
      </div>
    )
  }

  if (report.status === 'FAILED') {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <Callout tone="danger" title="Report generation failed">
          {report.errorMessage ?? 'Unknown error. Please try again.'}
        </Callout>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <BiasReportView
        report={{
          id: report.id,
          summary: report.summary,
          findings: (report.findings as BiasEntry[]) ?? [],
          calibrationInsight: report.calibrationInsight,
          flaggedFindings: (report.flaggedFindings as string[]) ?? [],
          createdAt: report.createdAt,
          decisionCount: report.decisionCount,
          modelsUsed: report.modelsUsed,
        }}
      />
    </div>
  )
}
