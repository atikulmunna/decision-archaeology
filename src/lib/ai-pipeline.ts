import { generateStructured, type AIMessage, type CostTier } from '@/lib/ai'
import {
  AssumptionsSchema,
  BiasFindingsSchema,
  BiasReportOutputSchema,
  CalibrationPatternsSchema,
  type BiasReportOutput,
} from '@/lib/ai-schema'
import {
  buildAssumptionExtractionPrompt,
  buildBiasDetectionPrompt,
  buildCalibrationAnalysisPrompt,
  buildSynthesisPrompt,
} from '@/lib/prompts'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import type { z } from 'zod'

type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

export const MAX_DECISIONS_PER_REPORT = 60
export const MIN_DECISIONS_PER_REPORT = 10

export const PASS_NAMES = {
  assumptions: 'assumptions',
  biases: 'bias_findings',
  calibration: 'calibration_patterns',
  synthesis: 'bias_report',
} as const

type Generate = typeof generateStructured

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Four schema-typed passes routed through OpenRouter's Auto Router:
 * assumptions (low) → [biases (medium) ∥ calibration (low)] → synthesis (high).
 */
export async function runBiasAnalysisPipeline(
  decisions: DecisionWithOutcomes[],
  deps: { generate?: Generate } = {}
): Promise<{ report: BiasReportOutput; modelsUsed: string[] }> {
  if (decisions.length < MIN_DECISIONS_PER_REPORT) {
    throw new Error('At least 10 decisions are required to generate a bias report')
  }

  const generate = deps.generate ?? generateStructured
  const modelsUsed: string[] = []

  async function pass<T>(schemaName: string, schema: z.ZodType<T>, costTier: CostTier, prompt: string) {
    const messages: AIMessage[] = [{ role: 'user', content: prompt }]
    const { data, model } = await generate({ messages, schema, schemaName, costTier })
    if (!modelsUsed.includes(model)) modelsUsed.push(model)
    return data
  }

  // Newest first for the cap, then back to chronological order for the prompts.
  const analyzed = [...decisions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_DECISIONS_PER_REPORT)
    .reverse()
  const titlesById = Object.fromEntries(analyzed.map((d) => [d.id, d.title]))

  const assumptions = await pass(
    PASS_NAMES.assumptions,
    AssumptionsSchema,
    'low',
    buildAssumptionExtractionPrompt(analyzed)
  )

  const calibrationPrompt = buildCalibrationAnalysisPrompt(analyzed)
  const [biases, calibration] = await Promise.all([
    pass(PASS_NAMES.biases, BiasFindingsSchema, 'medium', buildBiasDetectionPrompt(assumptions, titlesById)),
    calibrationPrompt
      ? pass(PASS_NAMES.calibration, CalibrationPatternsSchema, 'low', calibrationPrompt)
      : Promise.resolve(null),
  ])

  const times = analyzed.map((d) => new Date(d.createdAt).getTime())
  const dateRange = `${formatMonth(new Date(Math.min(...times)))} to ${formatMonth(new Date(Math.max(...times)))}`

  const report = await pass(
    PASS_NAMES.synthesis,
    BiasReportOutputSchema,
    'high',
    buildSynthesisPrompt({ biases, calibration, totalDecisions: analyzed.length, dateRange })
  )

  return { report, modelsUsed }
}
