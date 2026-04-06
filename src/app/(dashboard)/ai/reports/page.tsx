import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { GenerateReportButton } from '@/components/ai/GenerateReportButton'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bias Reports — Decision Archaeology' }

export default async function ReportsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const reports = await prisma.biasReport.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, status: true, summary: true, decisionCount: true },
  })

  const decisionCount = await prisma.decisionRecord.count({
    where: { userId: dbUser.id, isDraft: false },
  })

  const STATUS_BADGE: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    RUNNING: 'bg-blue-100 text-blue-700',
    COMPLETE: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bias Reports</h1>
          <p className="text-sm text-gray-400">AI-powered pattern analysis of your decision archive</p>
        </div>
        {decisionCount >= 10 && (
          <GenerateReportButton />
        )}
      </div>

      {decisionCount < 10 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          You need at least <strong>10 decisions</strong> to generate a bias report. You have {decisionCount} so far.
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl">🧠</span>
          <p className="mt-3 font-semibold text-gray-700">No reports yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Reports are auto-generated every 10 decisions, or you can trigger one manually.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/ai/reports/${report.id}`}
              className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                  {' · '}{report.decisionCount} decisions
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[report.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                </span>
              </div>
              {report.summary && (
                <p className="text-sm text-gray-700 line-clamp-2">{report.summary}</p>
              )}
              {report.status === 'PENDING' || report.status === 'RUNNING' ? (
                <p className="mt-2 text-xs text-indigo-500 animate-pulse">Processing…</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
