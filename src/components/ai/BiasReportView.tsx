import { AIDisclosureBanner } from './AIDisclosureBanner'
import { BiasReportCard } from './BiasReportCard'
import { Callout } from '@/components/ui/Callout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stat } from '@/components/ui/Stat'
import type { BiasEntry } from '@/lib/ai-schema'

/** The report as the view renders it, from a saved BiasReport row or the demo report file. */
export type ReportViewData = {
  id: string
  summary: string | null
  findings: BiasEntry[]
  calibrationInsight: string | null
  flaggedFindings: string[]
  createdAt: Date
  decisionCount: number
  modelsUsed: string[]
}

const SEVERITY_ORDER: Record<BiasEntry['severity'], number> = { STRONG: 0, MODERATE: 1, MILD: 2 }

export function BiasReportView({
  report,
  readOnly = false,
  provenance,
}: {
  report: ReportViewData
  readOnly?: boolean
  provenance?: string
}) {
  const date = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const findings = [...report.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const strongCount = findings.filter((b) => b.severity === 'STRONG').length
  const moderateCount = findings.filter((b) => b.severity === 'MODERATE').length

  return (
    <article className="flex flex-col gap-8">
      <PageHeader
        eyebrow="AI pattern report"
        title="Bias analysis"
        meta={`${date} · ${report.decisionCount} decisions analyzed`}
      />

      {report.modelsUsed.length > 0 && (
        <p className="-mt-4 font-mono text-[11px] tracking-[0.04em] text-muted">
          Analyzed by {report.modelsUsed.join(', ')} via OpenRouter Auto Router
        </p>
      )}

      {provenance && (
        <p className="-mt-6 font-mono text-[11px] tracking-[0.04em] text-muted">{provenance}</p>
      )}

      <AIDisclosureBanner readOnly={readOnly} />

      <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
        {report.summary && (
          <p className="font-display text-[24px] leading-snug text-ink">{report.summary}</p>
        )}
        <div className="flex gap-8">
          <Stat label="Strong" value={strongCount} />
          <Stat label="Moderate" value={moderateCount} />
        </div>
      </div>

      {report.calibrationInsight && (
        <Callout title="Calibration insight">{report.calibrationInsight}</Callout>
      )}

      <ol className="flex flex-col gap-8">
        {findings.map((bias, index) => (
          <BiasReportCard
            key={bias.name}
            bias={bias}
            index={index}
            reportId={report.id}
            readOnly={readOnly}
            alreadyFlagged={report.flaggedFindings.some((f) => f.toLowerCase().includes(bias.name.toLowerCase()))}
          />
        ))}
      </ol>
    </article>
  )
}
