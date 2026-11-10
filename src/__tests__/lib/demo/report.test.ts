import { describe, expect, it } from 'vitest'
import reportJson from '@/lib/demo/report.json'
import { DEMO_REPORT_ID, demoReportProvenance, getDemoReport, getDemoReports } from '@/lib/demo/report'
import { DemoReportFileSchema, unknownAffectedDecisions } from '@/lib/demo/report-file'
import { DEMO_SEEDS } from '@/lib/demo/seed'

describe('the committed demo report', () => {
  it('parses and names only seeded decisions', () => {
    const file = DemoReportFileSchema.parse(reportJson)
    expect(file.decisionCount).toBe(24)
    expect(unknownAffectedDecisions(file, DEMO_SEEDS.map((seed) => seed.title))).toEqual([])
  })

  it('loads into the report view shape with its routed models', () => {
    const report = getDemoReport(DEMO_REPORT_ID)!
    expect(report.modelsUsed.length).toBeGreaterThan(0)
    expect(report.findings.length).toBeGreaterThan(0)
    expect(report.flaggedFindings).toEqual([])
    expect(report.createdAt.toISOString()).toBe(new Date(reportJson.generatedAt).toISOString())
  })

  it('lists one completed demo report and rejects unknown ids', () => {
    expect(getDemoReports()).toEqual([
      expect.objectContaining({ id: DEMO_REPORT_ID, status: 'COMPLETE', decisionCount: 24 }),
    ])
    expect(getDemoReport('clx0abc123def456')).toBeNull()
  })

  it('states how and when the report was generated', () => {
    expect(demoReportProvenance()).toMatch(
      /^Generated from this demo archive by the live pipeline on [A-Z][a-z]+ \d{1,2}, \d{4}\.$/
    )
  })
})
