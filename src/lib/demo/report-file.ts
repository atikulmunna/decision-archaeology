import { z } from 'zod'
import { runBiasAnalysisPipeline, type Generate } from '@/lib/ai-pipeline'
import { BiasSchema, type BiasReportOutput } from '@/lib/ai-schema'
import { buildDemoArchive } from './archive'

/** The committed demo report: one real run of the live pipeline over the demo archive. */
export const DemoReportFileSchema = z.object({
  generatedAt: z.string().datetime(),
  decisionCount: z.number().int().positive(),
  summary: z.string().min(1),
  findings: z.array(BiasSchema),
  calibrationInsight: z.string().nullable(),
  modelsUsed: z.array(z.string().min(1)).min(1),
})

export type DemoReportFile = z.infer<typeof DemoReportFileSchema>

// Built from code points so this source file never contains the characters it removes.
const DASH_CLASS = `[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`
const NUMERIC_RANGE = new RegExp(String.raw`(\d)\s*${DASH_CLASS}\s*(\d)`, 'g')
const ANY_DASH = new RegExp(String.raw`\s*${DASH_CLASS}\s*`, 'g')
const COMMA_BEFORE_PUNCTUATION = /,\s*([.,;:!?])/g

/** House style for public copy: no em or en dashes. Ranges read "to"; other dashes become commas. */
export function normalizeTypography(text: string): string {
  return text.replace(NUMERIC_RANGE, '$1 to $2').replace(ANY_DASH, ', ').replace(COMMA_BEFORE_PUNCTUATION, '$1')
}

/** Maps pipeline output the way the live report job saves it, normalizing every string. */
export function buildDemoReportFile(
  result: { report: BiasReportOutput; modelsUsed: string[]; analyzedCount: number },
  generatedAt: Date
): DemoReportFile {
  const { report, modelsUsed, analyzedCount } = result
  return {
    generatedAt: generatedAt.toISOString(),
    decisionCount: analyzedCount,
    summary: normalizeTypography(report.summary),
    findings: report.biases.map((bias) => ({
      name: normalizeTypography(bias.name),
      severity: bias.severity,
      evidence: normalizeTypography(bias.evidence),
      affectedDecisions: bias.affectedDecisions.map(normalizeTypography),
      reframe: normalizeTypography(bias.reframe),
    })),
    calibrationInsight: report.calibrationInsight === null ? null : normalizeTypography(report.calibrationInsight),
    modelsUsed,
  }
}

/** Affected-decision titles in the report that no seeded decision has. */
export function unknownAffectedDecisions(file: DemoReportFile, titles: readonly string[]): string[] {
  const known = new Set(titles)
  return [...new Set(file.findings.flatMap((finding) => finding.affectedDecisions))].filter((title) => !known.has(title))
}

/** Runs the real report pipeline over the demo archive and returns the validated file contents. */
export async function generateDemoReportFile(deps: { generate?: Generate; now?: Date } = {}): Promise<DemoReportFile> {
  const result = await runBiasAnalysisPipeline(buildDemoArchive(), { generate: deps.generate })
  return DemoReportFileSchema.parse(buildDemoReportFile(result, deps.now ?? new Date()))
}
