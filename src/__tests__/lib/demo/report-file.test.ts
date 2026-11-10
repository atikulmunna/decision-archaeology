import { describe, expect, it } from 'vitest'
import type { BiasReportOutput } from '@/lib/ai-schema'
import {
  buildDemoReportFile,
  DemoReportFileSchema,
  generateDemoReportFile,
  normalizeTypography,
  unknownAffectedDecisions,
  type DemoReportFile,
} from '@/lib/demo/report-file'
import { DEMO_SEEDS } from '@/lib/demo/seed'

// Built from code points so this file contains no dash characters itself.
const EM = String.fromCharCode(0x2014)
const EN = String.fromCharCode(0x2013)
const DASHES = new RegExp(`[${EN}${EM}]`)
const TITLES = DEMO_SEEDS.map((seed) => seed.title)

const outputWithDashes: BiasReportOutput = {
  summary: `Rowan decides boldly ${EM} and estimates optimistically.`,
  biases: [
    {
      name: `Planning fallacy${EM}estimates`,
      severity: 'STRONG',
      evidence: `The rewrite took 3${EN}4 times the estimate ${EM}.`,
      affectedDecisions: ['Push to rewrite the billing service instead of patching it?'],
      reframe: `Add a buffer ${EN} then add another.`,
    },
  ],
  calibrationInsight: `High confidence ${EM} worse outcomes.`,
}

const CANNED: Record<string, unknown> = {
  assumptions: { decisions: [{ decisionId: 'demo-0001', assumptions: ['The new team will teach me infrastructure'] }] },
  bias_findings: { biases: outputWithDashes.biases },
  calibration_patterns: { patterns: [] },
  bias_report: outputWithDashes,
}

const fakeGenerate = (async (opts: { schemaName: string }) => ({
  data: CANNED[opts.schemaName] as never,
  model: `m/${opts.schemaName}`,
})) as never

function fileNaming(titles: string[]): DemoReportFile {
  return {
    generatedAt: '2026-11-10T12:00:00.000Z',
    decisionCount: 24,
    summary: 'Summary.',
    findings: [{ name: 'Bias', severity: 'MILD', evidence: 'Evidence.', affectedDecisions: titles, reframe: 'Reframe.' }],
    calibrationInsight: null,
    modelsUsed: ['m/a'],
  }
}

describe('normalizeTypography', () => {
  it('normalizes dashes to the house style', () => {
    expect(normalizeTypography(`A ${EM} B`)).toBe('A, B')
    expect(normalizeTypography(`A${EM}B`)).toBe('A, B')
    expect(normalizeTypography(`2025${EN}2026`)).toBe('2025 to 2026')
    expect(normalizeTypography(`3 ${EN} 5 months`)).toBe('3 to 5 months')
    expect(normalizeTypography(`the end ${EM}.`)).toBe('the end.')
    expect(normalizeTypography('plain text, with commas')).toBe('plain text, with commas')
  })
})

describe('buildDemoReportFile', () => {
  it('maps pipeline output like the live job and strips dashes everywhere', () => {
    const file = buildDemoReportFile(
      { report: outputWithDashes, modelsUsed: ['m/a', 'm/b'], analyzedCount: 24 },
      new Date('2026-11-10T12:00:00Z')
    )
    expect(file).toMatchObject({
      decisionCount: 24,
      modelsUsed: ['m/a', 'm/b'],
      generatedAt: '2026-11-10T12:00:00.000Z',
      summary: 'Rowan decides boldly, and estimates optimistically.',
      calibrationInsight: 'High confidence, worse outcomes.',
    })
    expect(file.findings[0]).toMatchObject({
      name: 'Planning fallacy, estimates',
      evidence: 'The rewrite took 3 to 4 times the estimate.',
      reframe: 'Add a buffer, then add another.',
      severity: 'STRONG',
    })
    expect(JSON.stringify(file)).not.toMatch(DASHES)
  })
})

describe('generateDemoReportFile', () => {
  it('runs the real pipeline over the demo archive with an injected generator', async () => {
    const file = await generateDemoReportFile({ generate: fakeGenerate, now: new Date('2026-11-10T12:00:00Z') })
    const parsed = DemoReportFileSchema.parse(file)
    expect(parsed.decisionCount).toBe(24)
    expect(parsed.modelsUsed).toEqual(['m/assumptions', 'm/bias_findings', 'm/calibration_patterns', 'm/bias_report'])
    expect(JSON.stringify(parsed)).not.toMatch(DASHES)
  })

  it('fails when the generator fails', async () => {
    const failing = (async () => {
      throw new Error('upstream')
    }) as never
    await expect(generateDemoReportFile({ generate: failing })).rejects.toThrow('upstream')
  })
})

describe('unknownAffectedDecisions', () => {
  it('finds affected decisions that are not in the seed', () => {
    expect(unknownAffectedDecisions(fileNaming(['Accept the senior role at Northwind?', 'Buy a boat?']), TITLES)).toEqual([
      'Buy a boat?',
    ])
    expect(unknownAffectedDecisions(fileNaming(['Accept the senior role at Northwind?']), TITLES)).toEqual([])
  })
})
