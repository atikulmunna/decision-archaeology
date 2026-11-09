import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import type {
  AssumptionsOutput,
  BiasFindingsOutput,
  CalibrationPatternsOutput,
} from '@/lib/ai-schema'

type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

// Output shape is enforced by the JSON Schema sent with each request, so these
// prompts describe the task only. Decision text is embedded with JSON.stringify
// so quotes, backslashes and newlines in user content cannot break the prompt.

// ── Pass 1: Assumption Extraction ──────────────────────────────────────────
export function buildAssumptionExtractionPrompt(decisions: DecisionRecord[]): string {
  const records = decisions
    .map((d) =>
      JSON.stringify({
        id: d.id,
        title: d.title,
        summary: d.summary,
        context: d.context,
        alternatives: d.alternatives,
        chosenOption: d.chosenOption,
        reasoning: d.reasoning,
        values: d.values ?? null,
        uncertainties: d.uncertainties ?? null,
      })
    )
    .join('\n')

  return `You are a decision analysis expert. Each line below is one decision record as JSON. Extract the KEY IMPLICIT ASSUMPTIONS underlying each decision: things the decision-maker believed to be true but did not explicitly state.

For each decision, list 2 to 5 specific implicit assumptions and return them under that decision's "id" as decisionId. Do not paraphrase the record's meaning.

DECISIONS:
${records}`
}

// ── Pass 2: Bias Detection ─────────────────────────────────────────────────
export function buildBiasDetectionPrompt(
  assumptions: AssumptionsOutput,
  titlesById: Record<string, string>
): string {
  const labelled = assumptions.decisions.map((entry) => ({
    decisionTitle: titlesById[entry.decisionId] ?? entry.decisionId,
    assumptions: entry.assumptions,
  }))

  return `You are a cognitive bias analyst. Review the following assumptions extracted from a person's decision history and identify which cognitive biases are present.

Use only these bias categories from the taxonomy:
- Overconfidence Bias: overestimating certainty or skill
- Confirmation Bias: seeking information that confirms existing beliefs
- Sunk Cost Fallacy: weighing past investments too heavily
- Availability Heuristic: overweighting recent/memorable events
- Planning Fallacy: underestimating time, costs, risks
- Status Quo Bias: preference for the current state of affairs
- Optimism Bias: unrealistic expectations of positive outcomes
- Anchoring Bias: over-relying on the first piece of information

For each identified bias, give a severity (MILD, MODERATE or STRONG), evidence that quotes or references the specific assumptions that reveal it, the titles of the affected decisions, and a short constructive reframe.

ASSUMPTIONS:
${JSON.stringify(labelled, null, 2)}`
}

// ── Pass 3: Calibration Analysis ───────────────────────────────────────────
export function buildCalibrationAnalysisPrompt(decisions: DecisionWithOutcomes[]): string {
  const withOutcomes = decisions
    .filter((d) => d.outcomes.length > 0 && d.predictedOutcome)
    .map((d) => ({
      title: d.title,
      predicted: d.predictedOutcome,
      actual: d.outcomes.map((o) => `${o.outcomeRating}: ${o.whatHappened}`).join('; '),
    }))

  if (withOutcomes.length === 0) {
    return ''
  }

  return `Analyze the gap between predicted and actual outcomes in the following decisions. Identify patterns in how well predictions matched reality.

Note recurring themes: consistent over-optimism, under-estimation of complexity, domain-specific blind spots, etc. Rate each pattern's frequency as occasional, frequent or consistent, and list the affected decision titles.

DATA:
${JSON.stringify(withOutcomes, null, 2)}`
}

// ── Pass 4: Synthesis ──────────────────────────────────────────────────────
export function buildSynthesisPrompt(opts: {
  biases: BiasFindingsOutput
  calibration: CalibrationPatternsOutput | null
  totalDecisions: number
  dateRange: string
}): string {
  const calibration = opts.calibration
    ? JSON.stringify(opts.calibration, null, 2)
    : 'No decisions have both a prediction and a recorded outcome yet. Set calibrationInsight to null.'

  return `You are a personal decision coach writing a Bias Report for a user. Synthesize the following analysis into a clear, empathetic, and actionable report.

Guidelines:
- Write in second person ("You tend to...")
- Be honest but constructive, and frame weaknesses as growth opportunities
- Keep the overall summary to 3 or 4 sentences
- Do NOT be preachy or repetitive

ANALYSIS PERIOD: ${opts.dateRange} (${opts.totalDecisions} decisions)

BIAS FINDINGS:
${JSON.stringify(opts.biases, null, 2)}

CALIBRATION PATTERNS:
${calibration}`
}
