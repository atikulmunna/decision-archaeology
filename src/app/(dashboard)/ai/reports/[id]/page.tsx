import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { BiasReportView } from '@/components/ai/BiasReportView'
import Link from 'next/link'
import type { BiasEntry } from '@/lib/ai-schema'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

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
      <div className="flex flex-col gap-4">
        <Link href="/ai/reports" className="text-sm text-gray-400 hover:text-indigo-600">
          ← Reports
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="text-4xl animate-spin inline-block">⚙️</div>
          <p className="mt-4 font-semibold text-gray-700">Generating your report…</p>
          <p className="mt-1 text-sm text-gray-400">
            The AI is analysing your decisions. This takes 30–90 seconds. Refresh to check progress.
          </p>
        </div>
      </div>
    )
  }

  if (report.status === 'FAILED') {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/ai/reports" className="text-sm text-gray-400 hover:text-indigo-600">
          ← Reports
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">Report generation failed</p>
          <p className="mt-1 text-sm text-red-500">
            {(report as { errorMessage?: string }).errorMessage ?? 'Unknown error. Please try again.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/ai/reports" className="text-sm text-gray-400 hover:text-indigo-600">
        ← Reports
      </Link>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <BiasReportView
          report={{
            id: report.id,
            summary: report.summary,
            findings: (report.findings as BiasEntry[]) ?? [],
            calibrationInsight: report.calibrationInsight,
            flaggedFindings: (report.flaggedFindings as string[]) ?? [],
            createdAt: report.createdAt,
            decisionCount: report.decisionCount,
          }}
        />
      </div>
    </div>
  )
}
