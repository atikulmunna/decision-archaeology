import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeCapsuleConfirmation } from '@/components/decisions/TimeCapsuleConfirmation'
import type { CreateDecisionInput } from '@/lib/validations/decision'

const validInput = {
  title: 'Accept the senior role at Northwind',
  summary: 'Deciding whether to take the senior engineering role offered by Northwind.',
  context: 'Current role is stable but growth has stalled for two review cycles.',
  alternatives: 'Stay and push for promotion, or interview elsewhere for six months.',
  chosenOption: 'Accept the Northwind offer and start in April.',
  reasoning: 'The role compounds future options if the team is as strong as it seemed.',
  customTags: [],
} as CreateDecisionInput

describe('TimeCapsuleConfirmation', () => {
  it('previews the catalog number the record will be sealed as', () => {
    render(
      <TimeCapsuleConfirmation
        data={validInput}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        upcomingCatalogNumber={43}
        challenge={{ outcome: null, model: null, questions: [], answers: [], skipped: false }}
      />
    )
    expect(screen.getByText(/Will be sealed as/)).toHaveTextContent('Will be sealed as DA-0043')
  })
})

describe('TimeCapsuleConfirmation challenge', () => {
  const base = { outcome: null, model: null, questions: [], answers: [], skipped: false }
  const show = (challenge: Parameters<typeof TimeCapsuleConfirmation>[0]['challenge']) =>
    render(
      <TimeCapsuleConfirmation data={validInput} onConfirm={vi.fn()} onBack={vi.fn()} loading={false} upcomingCatalogNumber={43} challenge={challenge} />
    )

  it('lists the questions with their answers, and Left unanswered for a blank one', () => {
    show({
      ...base,
      outcome: 'ASKED',
      model: 'openai/gpt-5-mini',
      questions: [{ position: 0, question: 'Why not stay?' }, { position: 1, question: 'What if it stalls?' }],
      answers: ['Growth stalled', '  '],
    })
    expect(screen.getByText('Questions before sealing')).toBeInTheDocument()
    expect(screen.getByText('Why not stay?')).toBeInTheDocument()
    expect(screen.getByText('Growth stalled')).toBeInTheDocument()
    expect(screen.getByText('Left unanswered')).toBeInTheDocument()
  })

  it('says when sealing without questions, and when the AI could not be reached', () => {
    const { unmount } = show({ ...base, skipped: true })
    expect(screen.getByText('Sealing without questions')).toBeInTheDocument()
    unmount()
    show({ ...base, outcome: 'UNAVAILABLE', skipped: true })
    expect(screen.getByText('The AI could not be reached')).toBeInTheDocument()
  })
})
