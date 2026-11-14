import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
        letter={{ body: '', opensOn: '2027-05-15' }}
        onLetterChange={vi.fn()}
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
      <TimeCapsuleConfirmation data={validInput} onConfirm={vi.fn()} onBack={vi.fn()} loading={false} upcomingCatalogNumber={43} challenge={challenge} letter={{ body: '', opensOn: '2027-05-15' }} onLetterChange={vi.fn()} />
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

describe('TimeCapsuleConfirmation letter', () => {
  it('shows the letter box with a 5000 counter and the opening day it is given', async () => {
    const onLetterChange = vi.fn()
    render(
      <TimeCapsuleConfirmation data={validInput} onConfirm={vi.fn()} onBack={vi.fn()} loading={false} upcomingCatalogNumber={43}
        challenge={{ outcome: null, model: null, questions: [], answers: [], skipped: true }} letter={{ body: 'Hi', opensOn: '2027-05-15' }} onLetterChange={onLetterChange} letterError="Pick an opening day at least a month away." />
    )
    const box = screen.getByLabelText('A letter to future you (optional)')
    expect(box).toHaveAttribute('maxLength', '5000')
    expect(screen.getByText('2/5000')).toBeInTheDocument()
    const day = screen.getByLabelText('Opens on')
    expect(day).toHaveValue('2027-05-15')
    const min = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) + 30 * 86400000).toISOString().slice(0, 10)
    expect(day).toHaveAttribute('min', min)
    expect(screen.getByText('Pick an opening day at least a month away.')).toBeInTheDocument()
    fireEvent.change(box, { target: { value: 'Hi there' } })
    expect(onLetterChange).toHaveBeenLastCalledWith({ body: 'Hi there', opensOn: '2027-05-15' })
  })
})

describe('TimeCapsuleConfirmation letter accessibility', () => {
  it('links the hint and the error to the letter box and announces the error', () => {
    render(
      <TimeCapsuleConfirmation data={validInput} onConfirm={vi.fn()} onBack={vi.fn()} loading={false} upcomingCatalogNumber={43}
        challenge={{ outcome: null, model: null, questions: [], answers: [], skipped: true }} letter={{ body: 'Hi', opensOn: '2027-05-15' }} onLetterChange={vi.fn()} letterError="Pick an opening day at least a month away." />
    )
    const box = screen.getByLabelText('A letter to future you (optional)')
    expect(box).toHaveAccessibleDescription(/stays sealed until the day you pick/)
    expect(screen.getByLabelText('Opens on')).toHaveAccessibleDescription(/Pick an opening day at least a month away/)
    expect(screen.getByLabelText('Opens on')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Pick an opening day at least a month away.')
  })
})
