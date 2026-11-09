import { z } from 'zod'

export const BiasSchema = z.object({
  name: z.string(),
  severity: z.enum(['MILD', 'MODERATE', 'STRONG']),
  evidence: z.string(),
  affectedDecisions: z.array(z.string()),
  reframe: z.string(),
})

export const BiasReportOutputSchema = z.object({
  summary: z.string(),
  biases: z.array(BiasSchema),
  calibrationInsight: z.string().nullable(),
})

export type BiasReportOutput = z.infer<typeof BiasReportOutputSchema>
export type BiasEntry = z.infer<typeof BiasSchema>

// ── Pipeline pass outputs (sent to OpenRouter as strict JSON Schemas) ─────

export const AssumptionsSchema = z.object({
  decisions: z.array(
    z.object({
      decisionId: z.string(),
      assumptions: z.array(z.string()),
    })
  ),
})

export const BiasFindingsSchema = z.object({
  biases: z.array(BiasSchema),
})

export const CalibrationPatternsSchema = z.object({
  patterns: z.array(
    z.object({
      description: z.string(),
      frequency: z.enum(['occasional', 'frequent', 'consistent']),
      affectedDecisions: z.array(z.string()),
    })
  ),
})

export type AssumptionsOutput = z.infer<typeof AssumptionsSchema>
export type BiasFindingsOutput = z.infer<typeof BiasFindingsSchema>
export type CalibrationPatternsOutput = z.infer<typeof CalibrationPatternsSchema>
