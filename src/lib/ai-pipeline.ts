import { generateWithFallback, generateNormalization } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai'
import {
  buildNormalizationPrompt,
  buildAssumptionExtractionPrompt,
  buildBiasDetectionPrompt,
  buildCalibrationAnalysisPrompt,
  buildSynthesisPrompt,
} from '@/lib/prompts'
import { BiasReportOutputSchema, type BiasReportOutput } from '@/lib/ai-schema'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'

type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return match ? match[1].trim() : text.trim()
}

function userMsg(content: string): AIMessage {
  return { role: 'user', content }
}

export async function runBiasAnalysisPipeline(
  decisions: DecisionWithOutcomes[]
): Promise<BiasReportOutput> {
  if (decisions.length < 3) {
    throw new Error('At least 3 decisions are required to generate a bias report')
  }

  // ── Pass 1 — Normalization (fast 8B model) ────────────────────────────
  const normPrompt = buildNormalizationPrompt(decisions)
  const normResult = await generateNormalization([userMsg(normPrompt)])
  const normalizedText = extractJson(normResult)

  // ── Pass 2 — Assumption Extraction ────────────────────────────────────
  const assumptionPrompt = buildAssumptionExtractionPrompt(normalizedText)
  const assumptionResult = await generateWithFallback([userMsg(assumptionPrompt)])

  // ── Pass 3 — Bias Detection ────────────────────────────────────────────
  const biasPrompt = buildBiasDetectionPrompt(extractJson(assumptionResult))
  const biasResult = await generateWithFallback([userMsg(biasPrompt)])

  // ── Pass 4 — Calibration Analysis ─────────────────────────────────────
  const calibPrompt = buildCalibrationAnalysisPrompt(decisions)
  let calibResult = '{ "patterns": [] }'
  if (calibPrompt) {
    calibResult = await generateWithFallback([userMsg(calibPrompt)])
  }

  // ── Pass 5 — Synthesis ────────────────────────────────────────────────
  const dates = decisions.map((d) => new Date(d.createdAt))
  const dateRange = `${new Date(Math.min(...dates.map((d) => d.getTime()))).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(Math.max(...dates.map((d) => d.getTime()))).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`

  const synthesisPrompt = buildSynthesisPrompt({
    biasesJson: extractJson(biasResult),
    calibrationJson: extractJson(calibResult),
    totalDecisions: decisions.length,
    dateRange,
  })
  const synthesisResult = await generateWithFallback([userMsg(synthesisPrompt)])

  const raw = JSON.parse(extractJson(synthesisResult))
  return BiasReportOutputSchema.parse(raw)
}
