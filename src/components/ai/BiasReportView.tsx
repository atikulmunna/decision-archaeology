import { AIDisclosureBanner } from './AIDisclosureBanner'
import { BiasReportCard } from './BiasReportCard'
import type { BiasEntry } from '@/lib/ai-schema'

interface Report {
  id: string
  summary: string | null
  findings: BiasEntry[]
  calibrationInsight: string | null
  flaggedFindings: string[]
  createdAt: Date
  decisionCount: number
}

export function BiasReportView({ report }: { report: Report }) {
  const date = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const strongCount = report.findings.filter((b) => b.severity === 'STRONG').length
  const moderateCount = report.findings.filter((b) => b.severity === 'MODERATE').length

  return (
    <div className="flex flex-col gap-6">
      <AIDisclosureBanner />

      {/* Report meta */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bias Analysis</h2>
            <p className="text-sm text-gray-400">{date} · {report.decisionCount} decisions analysed</p>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            {strongCount > 0 && (
              <div>
                <p className="text-xl font-bold text-red-600">{strongCount}</p>
                <p className="text-xs text-gray-400">Strong</p>
              </div>
            )}
            {moderateCount > 0 && (
              <div>
                <p className="text-xl font-bold text-orange-500">{moderateCount}</p>
                <p className="text-xs text-gray-400">Moderate</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <p className="mt-4 text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
            {report.summary}
          </p>
        )}
      </div>

      {/* Calibration insight */}
      {report.calibrationInsight && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">
            📊 Calibration insight
          </p>
          <p className="text-sm text-blue-800">{report.calibrationInsight}</p>
        </div>
      )}

      {/* Bias findings — sorted Strong → Moderate → Mild */}
      <div className="flex flex-col gap-4">
        {[...report.findings]
          .sort((a, b) => {
            const order = { STRONG: 0, MODERATE: 1, MILD: 2 }
            return order[a.severity] - order[b.severity]
          })
          .map((bias) => (
            <BiasReportCard
              key={bias.name}
              bias={bias}
              reportId={report.id}
              alreadyFlagged={report.flaggedFindings
                .some((f) => f.toLowerCase().includes(bias.name.toLowerCase()))}
            />
          ))}
      </div>
    </div>
  )
}
