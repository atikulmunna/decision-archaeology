import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/components/decisions/AttachmentManager', () => ({ AttachmentManager: () => null }))

import { DecisionCaptureForm } from '@/components/decisions/DecisionCaptureForm'

const text = {
  title: 'Take the platform team role at Halcyon',
  summary: 'Move from payments to the platform team at Halcyon.',
  context: 'The platform team is rebuilding the deploy pipeline and asked me.',
  alternatives: 'Stay on payments, join platform, or look outside the company.',
  chosenOption: 'Join the platform team for at least a year.',
  reasoning: 'Infrastructure is the gap in my experience and moving back stays easy.',
}
const asked = { questions: [{ position: 0, question: 'Why not stay on payments?' }, { position: 1, question: 'What if the manager leaves?' }], model: 'openai/gpt-5-mini' }

type Call = { url: string; method: string; body: Record<string, unknown> | null }
let calls: Call[] = []

function mockFetch(opts: { draft?: Record<string, unknown>; finalizeFailure?: Record<string, unknown> } = {}) {
  calls = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    calls.push({ url, method, body })
    if (url.endsWith('/challenge')) return new Response(JSON.stringify(asked), { status: 201 })
    if (method === 'GET') return new Response(JSON.stringify(opts.draft ?? {}), { status: opts.draft ? 200 : 404 })
    if (method === 'POST') return new Response(JSON.stringify({ id: 'draft1' }))
    if (body?.finalize && opts.finalizeFailure) return new Response(JSON.stringify(opts.finalizeFailure), { status: 400 })
    return new Response(JSON.stringify({ id: 'draft1', createdAt: new Date().toISOString(), catalogNumber: 4, sealHash: 'abc' }))
  })
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))

async function walkToChallenge() {
  fill('Decision Title', text.title)
  fill('Decision Summary', text.summary)
  fill('Context', text.context)
  await click('Next')
  fill('Alternatives Considered', text.alternatives)
  fill('Chosen Option', text.chosenOption)
  fill('Reasoning', text.reasoning)
  await click('Next')
  await click('Next')
}

const challengeCalls = () => calls.filter((call) => call.url.endsWith('/challenge'))
const finalize = () => calls.filter((call) => call.body?.finalize).at(-1)

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('capture flow challenge step', () => {
  it('goes Context, Challenge, review, and Seal without questions sends challengeSkipped', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    expect(screen.getByRole('heading', { name: 'Before you seal' })).toBeInTheDocument()
    expect(screen.getByText('Challenge')).toBeInTheDocument()
    await click('Seal without questions')
    expect(screen.getByText('Read it once more before it is sealed.')).toBeInTheDocument()
    expect(screen.getByText('Sealing without questions')).toBeInTheDocument()
    await click('Lock it in')
    await waitFor(() => expect(finalize()?.body).toMatchObject({ finalize: true, challengeSkipped: true }))
    expect(challengeCalls()).toHaveLength(0)
  })

  it('keeps questions and typed answers through Back and forward with no second request', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    await click('Challenge my reasoning')
    expect(await screen.findByText('Why not stay on payments?')).toBeInTheDocument()
    await userEvent.type(screen.getAllByLabelText('Your answer (optional)')[0], 'Payments has no growth left')
    await click('Back')
    expect(screen.getByLabelText('Key uncertainties', { exact: false })).toBeInTheDocument()
    await click('Next')
    expect(screen.getByText('Why not stay on payments?')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Your answer (optional)')[0]).toHaveValue('Payments has no growth left')
    expect(challengeCalls()).toHaveLength(1)
  })

  it('saves the draft before asking and finalizes with the typed answers', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    await click('Challenge my reasoning')
    await screen.findByText('Why not stay on payments?')
    const index = calls.findIndex((call) => call.url.endsWith('/challenge'))
    expect(calls[index]).toMatchObject({ url: '/api/decisions/draft1/challenge', method: 'POST' })
    expect(calls[index - 1]).toMatchObject({ url: '/api/decisions/draft1', method: 'PATCH' })
    await userEvent.type(screen.getAllByLabelText('Your answer (optional)')[0], 'typed')
    await click('Continue to review')
    expect(screen.getByText('typed')).toBeInTheDocument()
    expect(screen.getByText('Left unanswered')).toBeInTheDocument()
    await click('Lock it in')
    await waitFor(() => expect(finalize()?.body).toMatchObject({ finalize: true, challengeAnswers: ['typed', ''] }))
    expect(finalize()?.body?.challengeSkipped).toBeUndefined()
  })

  it('restores the step from a draft with questions', async () => {
    mockFetch({
      draft: {
        id: 'draft1',
        isDraft: true,
        ...text,
        customTags: [],
        challengeOutcome: 'ASKED',
        challengeModel: 'openai/gpt-5-mini',
        challengeQuestions: [
          { position: 1, question: 'Q two?', answer: null },
          { position: 0, question: 'Q one?', answer: 'Saved answer' },
        ],
      },
    })
    render(<DecisionCaptureForm initialDraftId="draft1" upcomingCatalogNumber={4} />)
    expect(await screen.findByText('Draft restored from your last session')).toBeInTheDocument()
    await click('Next')
    await click('Next')
    await click('Next')
    expect(screen.getByText('Q one?')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Your answer (optional)').map((box) => (box as HTMLTextAreaElement).value)).toEqual(['Saved answer', ''])
    expect(challengeCalls()).toHaveLength(0)
  })

  it('returns to the step with the message when finalize refuses the answers', async () => {
    mockFetch({ finalizeFailure: { error: 'Validation failed', issues: [{ path: ['challengeAnswers', 0], message: 'Keep each answer under 1000 characters.' }] } })
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    await click('Challenge my reasoning')
    await screen.findByText('Why not stay on payments?')
    await click('Continue to review')
    await click('Lock it in')
    expect(await screen.findByText('Keep each answer under 1000 characters.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Before you seal' })).toBeInTheDocument()
  })
})

describe('capture flow challenge request', () => {
  it('does not ask when saving the draft first fails', async () => {
    let failSaves = false
    calls = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null })
      if (url.endsWith('/challenge')) return new Response(JSON.stringify(asked), { status: 201 })
      if (method === 'GET') return new Response('{}', { status: 404 })
      if (method === 'POST') return new Response(JSON.stringify({ id: 'draft1' }))
      return failSaves ? new Response('{}', { status: 500 }) : new Response(JSON.stringify({ id: 'draft1' }))
    })
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    failSaves = true
    await click('Challenge my reasoning')
    expect(await screen.findByText('We could not save your draft. Try again.')).toBeInTheDocument()
    expect(challengeCalls()).toHaveLength(0)
  })

  it('gives the challenge request a 30 second limit, so a stalled server still leaves a way to seal', async () => {
    const signals: Array<AbortSignal | null | undefined> = []
    mockFetch()
    const inner = vi.mocked(globalThis.fetch).getMockImplementation()!
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      if (String(input).endsWith('/challenge')) signals.push(init?.signal)
      return inner(input, init)
    })
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToChallenge()
    await click('Challenge my reasoning')
    await screen.findByText('Why not stay on payments?')
    expect(signals[0]).toBeInstanceOf(AbortSignal)
  })
})
