import type { ReportListItem } from '@/components/ai/ReportsListView'
import type { ReportViewData } from '@/components/ai/BiasReportView'
import reportJson from './report.json'
import { DemoReportFileSchema } from './report-file'

export const DEMO_REPORT_ID = 'demo-report-1'

// Parsed once at load: a broken committed file fails the test suite, not a visitor's request.
const file = DemoReportFileSchema.parse(reportJson)
const generatedAt = new Date(file.generatedAt)

export function getDemoReports(): ReportListItem[] {
  return [
    {
      id: DEMO_REPORT_ID,
      createdAt: generatedAt,
      status: 'COMPLETE',
      summary: file.summary,
      decisionCount: file.decisionCount,
    },
  ]
}

export function getDemoReport(id: string): (ReportViewData & { generatedAt: Date }) | null {
  if (id !== DEMO_REPORT_ID) return null
  return {
    id: DEMO_REPORT_ID,
    summary: file.summary,
    findings: file.findings,
    calibrationInsight: file.calibrationInsight,
    flaggedFindings: [],
    createdAt: generatedAt,
    decisionCount: file.decisionCount,
    modelsUsed: file.modelsUsed,
    generatedAt,
  }
}

export function demoReportProvenance(): string {
  const date = generatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `Generated from this demo archive by the live pipeline on ${date}.`
}
