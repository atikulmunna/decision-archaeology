import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'

type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

// ── Pass 1 — Normalization ─────────────────────────────────────────────────
export function buildNormalizationPrompt(decisions: DecisionRecord[]): string {
  const texts = decisions
    .map(
      (d, i) =>
        `[Decision ${i + 1}] Title: ${d.title}\nSummary: ${d.summary}\nContext: ${d.context}\nReasoning: ${d.reasoning}\nAlternatives: ${d.alternatives}\nChosen: ${d.chosenOption}`
    )
    .join('\n\n')

  return `You are a decision analysis assistant. Your task is to normalize the following decision records into clean, consistent language. Fix grammar, remove hedging words, and standardize phrasing. Do NOT change the meaning. Return each decision as a JSON object with all fields preserved. Output JSON only, no explanation.

DECISIONS:
${texts}`
}

// ── Pass 2 — Assumption Extraction ─────────────────────────────────────────
export function buildAssumptionExtractionPrompt(normalizedDecisions: string): string {
  return `You are a decision analysis expert. Analyze the following decision records and extract the KEY IMPLICIT ASSUMPTIONS underlying each decision — things the decision-maker believed to be true but did not explicitly state.

For each decision, list 2-5 implicit assumptions. Be specific. Format your response as JSON:
{ "assumptions": [{ "decisionIndex": number, "decisionTitle": string, "assumptions": string[] }] }

NORMALIZED DECISIONS:
${normalizedDecisions}`
}

// ── Pass 3 — Bias Detection ─────────────────────────────────────────────────
export function buildBiasDetectionPrompt(assumptionsJson: string): string {
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

For each identified bias, specify:
- severity: "MILD" | "MODERATE" | "STRONG"
- evidence: quote or reference the specific assumptions that reveal it
- affectedDecisions: the decision titles it appears in

Return JSON only:
{ "biases": [{ "name": string, "severity": string, "evidence": string, "affectedDecisions": string[], "reframe": string }] }

ASSUMPTIONS:
${assumptionsJson}`
}

// ── Pass 4 — Calibration Analysis ──────────────────────────────────────────
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

Note recurring themes: consistent over-optimism, under-estimation of complexity, domain-specific blind spots, etc.

Return JSON only:
{ "patterns": [{ "description": string, "frequency": "occasional" | "frequent" | "consistent", "affectedDecisions": string[] }] }

DATA:
${JSON.stringify(withOutcomes, null, 2)}`
}

// ── Pass 5 — Synthesis ─────────────────────────────────────────────────────
export function buildSynthesisPrompt(opts: {
  biasesJson: string
  calibrationJson: string
  totalDecisions: number
  dateRange: string
}): string {
  return `You are a personal decision coach writing a Bias Report for a user. Synthesize the following analysis into a clear, empathetic, and actionable report.

Guidelines:
- Write in second person ("You tend to…")
- Be honest but constructive — frame weaknesses as growth opportunities  
- Keep the overall summary to 3-4 sentences
- Do NOT be preachy or repetitive

Return JSON only:
{
  "summary": string,
  "biases": [{
    "name": string,
    "severity": "MILD" | "MODERATE" | "STRONG",
    "evidence": string,
    "affectedDecisions": string[],
    "reframe": string
  }],
  "calibrationInsight": string | null
}

ANALYSIS PERIOD: ${opts.dateRange} (${opts.totalDecisions} decisions)

BIAS FINDINGS:
${opts.biasesJson}

CALIBRATION PATTERNS:
${opts.calibrationJson}`
}
