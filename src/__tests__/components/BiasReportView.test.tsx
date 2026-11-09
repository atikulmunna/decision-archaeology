import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BiasReportView } from '@/components/ai/BiasReportView'
import type { BiasEntry } from '@/lib/ai-schema'

const mild: BiasEntry = {
  name: 'Anchoring Bias',
  severity: 'MILD',
  evidence: 'First offers set the frame.',
  affectedDecisions: ['Refinance'],
  reframe: 'Gather a second anchor.',
}
const strong: BiasEntry = {
  name: 'Optimism Bias',
  severity: 'STRONG',
  evidence: 'Timelines assumed best case.',
  affectedDecisions: ['Northwind role'],
  reframe: 'Plan for the median case.',
}

const baseReport = {
  id: 'r1',
  summary: 'You decide carefully but expect too much too soon.',
  findings: [] as BiasEntry[],
  calibrationInsight: 'Your 70% calls land about half the time.',
  flaggedFindings: [] as string[],
  createdAt: new Date('2026-11-01'),
  decisionCount: 12,
  modelsUsed: [] as string[],
}

describe('BiasReportView', () => {
  it('numbers findings by severity and states the analyzed count and models', () => {
    render(
      <BiasReportView
        report={{ ...baseReport, decisionCount: 12, modelsUsed: ['anthropic/claude-sonnet-4.5'], findings: [mild, strong] }}
      />
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('01')
    expect(items[0]).toHaveTextContent(strong.name)
    expect(screen.getByText(/12 decisions analyzed/)).toBeInTheDocument()
    expect(screen.getByText(/Analyzed by anthropic\/claude-sonnet-4\.5 via OpenRouter Auto Router/)).toBeInTheDocument()
  })
})
