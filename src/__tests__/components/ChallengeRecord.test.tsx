import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo/decisions/demo-0007',
}))

import { ChallengeRecord } from '@/components/decisions/ChallengeRecord'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import { getDemoDecision } from '@/lib/demo/queries'

const questions = [
  { position: 1, question: 'What if it stalls?', answer: null },
  { position: 0, question: 'Why not stay?', answer: 'Growth stalled' },
]

describe('ChallengeRecord', () => {
  it('lists questions in order with answers and Left unanswered, and the credit', () => {
    render(<ChallengeRecord outcome="ASKED" model="openai/gpt-5-mini" questions={questions} />)
    expect(screen.getByRole('heading', { name: 'Questions before sealing' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Why not stay?')
    expect(items[0]).toHaveTextContent('Growth stalled')
    expect(items[1]).toHaveTextContent('What if it stalls?')
    expect(items[1]).toHaveTextContent('Left unanswered')
    expect(screen.getByText('Asked by openai/gpt-5-mini via OpenRouter Auto Router')).toBeInTheDocument()
  })

  it('says Sealed without questions. for a skip', () => {
    render(<ChallengeRecord outcome="SKIPPED" model={null} questions={[]} />)
    expect(screen.getByText('Sealed without questions.')).toBeInTheDocument()
  })

  it('says The AI could not be reached before sealing. when unavailable', () => {
    render(<ChallengeRecord outcome="UNAVAILABLE" model={null} questions={[]} />)
    expect(screen.getByText('The AI could not be reached before sealing.')).toBeInTheDocument()
  })

  it('renders nothing without an outcome', () => {
    const { container } = render(<ChallengeRecord outcome={null} model={null} questions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('Then shows Questions before sealing after Forecasts and before the field notes', () => {
    const base = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    const decision = {
      ...base,
      challengeOutcome: 'ASKED' as const,
      challengeModel: 'openai/gpt-5-mini',
      challengeQuestions: questions.map((item, index) => ({ ...item, id: `q${index}`, decisionId: base.id, createdAt: base.createdAt })),
    }
    render(<DecisionDetail decision={decision} readOnly timeZone="UTC" now={DEMO_NOW} initialView="then" />)
    const forecasts = screen.getByRole('heading', { name: 'Forecasts' })
    const challenge = screen.getByRole('heading', { name: 'Questions before sealing' })
    const notes = screen.getByRole('heading', { name: 'Field notes before sealing' })
    expect(forecasts.compareDocumentPosition(challenge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(challenge.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
