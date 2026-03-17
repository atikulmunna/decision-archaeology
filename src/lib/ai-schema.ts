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
