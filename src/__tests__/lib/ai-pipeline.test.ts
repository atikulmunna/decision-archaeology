import { beforeEach, describe, expect, it } from 'vitest'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import type { AIMessage, CostTier } from '@/lib/ai'
import { MAX_DECISIONS_PER_REPORT, runBiasAnalysisPipeline } from '@/lib/ai-pipeline'

type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }
type Call = { schemaName: string; costTier?: CostTier; messages: AIMessage[] }
type GenerateOpts = { schemaName: string; costTier?: CostTier; messages: AIMessage[] }

const CANNED: Record<string, unknown> = {
  assumptions: { decisions: [{ decisionId: 'd-0', assumptions: ['The team is strong'] }] },
  bias_findings: { biases: [] },
  calibration_patterns: { patterns: [] },
  bias_report: { summary: 'You decide carefully.', biases: [], calibrationInsight: null },
}

function makeDecisions(n: number, opts: { withOutcomes?: boolean } = {}): DecisionWithOutcomes[] {
  return Array.from({ length: n }, (_, i) => {
    const createdAt = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000)
    const outcomes: OutcomeUpdate[] = opts.withOutcomes
      ? [
          {
            id: `o-${i}`,
            decisionId: `d-${i}`,
            whatHappened: 'Went as planned',
            outcomeRating: 'AS_EXPECTED',
            lessonsLearned: null,
            createdAt,
          },
        ]
      : []
    return {
      id: `d-${i}`,
      title: `Decision ${i}`,
      summary: 'Summary',
      context: 'Context',
      alternatives: 'Alternatives',
      chosenOption: 'Chosen',
      reasoning: 'Reasoning',
      predictedOutcome: opts.withOutcomes ? 'It will work' : null,
      createdAt,
      outcomes,
    } as unknown as DecisionWithOutcomes
  })
}

let calls: Call[]

function fakeGenerate(modelFor: (schemaName: string) => string = (name) => `m-${name}`) {
  return async (opts: GenerateOpts) => {
    calls.push({ schemaName: opts.schemaName, costTier: opts.costTier, messages: opts.messages })
    return { data: CANNED[opts.schemaName] as never, model: modelFor(opts.schemaName) }
  }
}

describe('runBiasAnalysisPipeline', () => {
  beforeEach(() => {
    calls = []
  })

  it('rejects fewer than 10 decisions', async () => {
    await expect(
      runBiasAnalysisPipeline(makeDecisions(9), { generate: fakeGenerate() })
    ).rejects.toThrow('At least 10 decisions')
  })

  it('runs four passes with the right cost tiers, synthesis last', async () => {
    await runBiasAnalysisPipeline(makeDecisions(12, { withOutcomes: true }), { generate: fakeGenerate() })
    expect(calls.map((c) => [c.schemaName, c.costTier])).toEqual(
      expect.arrayContaining([
        ['assumptions', 'low'],
        ['bias_findings', 'medium'],
        ['calibration_patterns', 'low'],
        ['bias_report', 'high'],
      ])
    )
    expect(calls).toHaveLength(4)
    expect(calls[0].schemaName).toBe('assumptions')
    expect(calls.at(-1)!.schemaName).toBe('bias_report')
  })

  it('runs the bias and calibration passes concurrently', async () => {
    const inFlight = new Set<string>()
    let overlapped = false
    const generate = async (opts: GenerateOpts) => {
      inFlight.add(opts.schemaName)
      if (inFlight.has('bias_findings') && inFlight.has('calibration_patterns')) overlapped = true
      await new Promise((resolve) => setTimeout(resolve, 10))
      inFlight.delete(opts.schemaName)
      return { data: CANNED[opts.schemaName] as never, model: 'm' }
    }
    await runBiasAnalysisPipeline(makeDecisions(12, { withOutcomes: true }), { generate })
    expect(overlapped).toBe(true)
  })

  it('skips calibration when no decision has a prediction and an outcome', async () => {
    await runBiasAnalysisPipeline(makeDecisions(12), { generate: fakeGenerate() })
    expect(calls.map((c) => c.schemaName)).not.toContain('calibration_patterns')
    expect(calls).toHaveLength(3)
  })

  it('reports deduplicated routed models in first-seen order', async () => {
    const { modelsUsed } = await runBiasAnalysisPipeline(makeDecisions(12), {
      generate: fakeGenerate(() => 'anthropic/claude-sonnet-4.5'),
    })
    expect(modelsUsed).toEqual(['anthropic/claude-sonnet-4.5'])
  })

  it('returns the synthesis output as the report', async () => {
    const { report } = await runBiasAnalysisPipeline(makeDecisions(12), { generate: fakeGenerate() })
    expect(report).toEqual(CANNED.bias_report)
  })

  it('analyzes only the 60 most recent decisions', async () => {
    expect(MAX_DECISIONS_PER_REPORT).toBe(60)
    await runBiasAnalysisPipeline(makeDecisions(200), { generate: fakeGenerate() })
    const prompt = calls
      .filter((c) => c.schemaName === 'assumptions')
      .map((c) => c.messages[0].content)
      .join(' ')
    expect(prompt).toContain('"id":"d-199"')
    expect(prompt).toContain('"id":"d-140"')
    expect(prompt).not.toContain('"id":"d-139"')
  })

  it('splits assumption extraction into batches of 20 so replies fit the token budget', async () => {
    await runBiasAnalysisPipeline(makeDecisions(60), { generate: fakeGenerate() })
    const batches = calls.filter((c) => c.schemaName === 'assumptions')
    expect(batches).toHaveLength(3)
    for (const batch of batches) {
      expect(batch.messages[0].content.match(/"id":"/g)).toHaveLength(20)
    }
  })

  it('reports how many decisions were actually analyzed', async () => {
    expect((await runBiasAnalysisPipeline(makeDecisions(200), { generate: fakeGenerate() })).analyzedCount).toBe(60)
    expect((await runBiasAnalysisPipeline(makeDecisions(12), { generate: fakeGenerate() })).analyzedCount).toBe(12)
  })
})
