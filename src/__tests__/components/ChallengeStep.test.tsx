import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ChallengeStep } from '@/components/decisions/ChallengeStep'
import { EMPTY_CHALLENGE, type CaptureChallenge } from '@/lib/devils-advocate'

const INTRO =
  'Want a second opinion? The AI reads what you wrote and asks two or three hard questions. Your answers are sealed with the decision. Nothing is sent unless you ask.'
const asked = { questions: [{ position: 0, question: 'Why not stay?' }, { position: 1, question: 'What if it stalls?' }], model: 'openai/gpt-5-mini' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function Harness({ ask, initial = EMPTY_CHALLENGE, onSkip = vi.fn() }: { ask: () => Promise<Response>; initial?: CaptureChallenge; onSkip?: () => void }) {
  const [challenge, setChallenge] = useState(initial)
  return <ChallengeStep challenge={challenge} onChange={setChallenge} ask={ask} onBack={vi.fn()} onSkip={onSkip} onContinue={vi.fn()} />
}

afterEach(() => vi.restoreAllMocks())

describe('ChallengeStep', () => {
  it('offers both choices and sends nothing until asked', async () => {
    const ask = vi.fn()
    const onSkip = vi.fn()
    render(<Harness ask={ask} onSkip={onSkip} />)
    expect(screen.getByRole('heading', { name: 'Before you seal' })).toBeInTheDocument()
    expect(screen.getByText(INTRO)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Seal without questions' }))
    expect(onSkip).toHaveBeenCalled()
    expect(ask).not.toHaveBeenCalled()
  })

  it('asks once even on a double press, then shows numbered questions with answer boxes and the credit', async () => {
    let answer: (response: Response) => void = () => {}
    const ask = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
    render(<Harness ask={ask} />)
    const button = screen.getByRole('button', { name: 'Challenge my reasoning' })
    await userEvent.click(button)
    await userEvent.click(button)
    expect(ask).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Reading your reasoning...')).toBeInTheDocument()
    await act(async () => answer(json(asked, 201)))
    expect(screen.getByText('Why not stay?')).toBeInTheDocument()
    expect(screen.getByText('What if it stalls?')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Your answer (optional)')).toHaveLength(2)
    expect(screen.getByText('Asked by openai/gpt-5-mini via OpenRouter Auto Router')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue to review' })).toBeInTheDocument()
  })

  it('shows the failure with Try again and Seal without questions', async () => {
    const ask = vi.fn(async () => json({ error: 'The AI could not be reached. Try again, or seal without questions.' }, 503))
    render(<Harness ask={ask} />)
    await userEvent.click(screen.getByRole('button', { name: 'Challenge my reasoning' }))
    expect(await screen.findByText('The AI could not be reached. Try again, or seal without questions.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seal without questions' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(ask).toHaveBeenCalledTimes(2)
  })

  it('shows the cap with only Seal without questions', async () => {
    const message = "You have used today's 20 challenges. Seal without questions, or try again tomorrow."
    render(<Harness ask={vi.fn(async () => json({ error: message }, 429))} />)
    await userEvent.click(screen.getByRole('button', { name: 'Challenge my reasoning' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Challenge my reasoning' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Seal without questions' })).toBeInTheDocument()
  })

  it('counts characters up to 1000', async () => {
    render(<Harness ask={vi.fn()} initial={{ outcome: 'ASKED', model: 'm', questions: asked.questions, answers: ['', ''] }} />)
    const [first] = screen.getAllByLabelText('Your answer (optional)')
    expect(first).toHaveAttribute('maxLength', '1000')
    await userEvent.type(first, 'abc')
    expect(screen.getByText('3/1000')).toBeInTheDocument()
  })
})

describe('ChallengeStep accessibility', () => {
  it('announces progress and the result in one live region and moves focus to the questions', async () => {
    let answer: (response: Response) => void = () => {}
    render(<Harness ask={vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))} />)
    const live = screen.getByRole('status')
    expect(live).toHaveTextContent('')
    await userEvent.click(screen.getByRole('button', { name: 'Challenge my reasoning' }))
    expect(live).toHaveTextContent('Reading your reasoning...')
    await act(async () => answer(json(asked, 201)))
    expect(screen.getByRole('status')).toBe(live)
    expect(live).toHaveTextContent('2 questions are ready.')
    expect(document.activeElement).toBe(screen.getByRole('list', { name: 'Questions' }))
  })

  it('announces a failure in the same live region', async () => {
    const message = 'The AI could not be reached. Try again, or seal without questions.'
    render(<Harness ask={vi.fn(async () => json({ error: message }, 503))} />)
    const live = screen.getByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'Challenge my reasoning' }))
    await screen.findByText(message)
    expect(live).toHaveTextContent(message)
  })

  it('describes each answer box with its question and its counter', () => {
    render(<Harness ask={vi.fn()} initial={{ outcome: 'ASKED', model: 'm', questions: asked.questions, answers: ['', ''] }} />)
    const [first, second] = screen.getAllByLabelText('Your answer (optional)')
    expect(first).toHaveAccessibleDescription('1. Why not stay? 0/1000')
    expect(second).toHaveAccessibleDescription('2. What if it stalls? 0/1000')
  })
})
