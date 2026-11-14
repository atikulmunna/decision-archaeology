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

type Call = { url: string; method: string; body: Record<string, unknown> | null }
let calls: Call[] = []

function mockFetch(opts: { draft?: Record<string, unknown>; finalizeFailure?: Record<string, unknown> } = {}) {
  calls = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    calls.push({ url, method, body })
    if (method === 'GET') return new Response(JSON.stringify(opts.draft ?? {}), { status: opts.draft ? 200 : 404 })
    if (method === 'POST') return new Response(JSON.stringify({ id: 'draft1' }))
    if (body?.finalize && opts.finalizeFailure) return new Response(JSON.stringify(opts.finalizeFailure), { status: 400 })
    return new Response(JSON.stringify({ id: 'draft1', createdAt: new Date().toISOString(), catalogNumber: 4, sealHash: 'abc' }))
  })
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
const click = (name: string) => userEvent.click(screen.getByRole('button', { name }))
const sixMonthsOut = () => {
  const now = new Date()
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 1))
  const last = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), Math.min(now.getUTCDate(), last))).toISOString().slice(0, 10)
}
const finalize = () => calls.filter((call) => call.body?.finalize).at(-1)

async function walkToReview() {
  fill('Decision Title', text.title)
  fill('Decision Summary', text.summary)
  fill('Context', text.context)
  await click('Next')
  fill('Alternatives Considered', text.alternatives)
  fill('Chosen Option', text.chosenOption)
  fill('Reasoning', text.reasoning)
  await click('Next')
  await click('Next')
  await click('Seal without questions')
}

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('capture flow letter', () => {
  it('opens the review with the default day: six months out when there is no predicted date', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToReview()
    expect(screen.getByLabelText('Opens on')).toHaveValue(sixMonthsOut())
  })

  it('saves the letter with the draft when you leave the box, and restores it when the draft reopens', async () => {
    mockFetch()
    const { unmount } = render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToReview()
    const box = screen.getByLabelText('A letter to future you (optional)')
    await userEvent.type(box, 'Dear me')
    fireEvent.blur(box)
    await waitFor(() =>
      expect(calls.filter((call) => call.method === 'PATCH').at(-1)?.body?.letter).toEqual({ body: 'Dear me', opensOn: sixMonthsOut() })
    )
    unmount()

    mockFetch({ draft: { id: 'draft1', isDraft: true, ...text, customTags: [], letter: { body: 'Kept letter', opensOn: '2027-09-01' } } })
    render(<DecisionCaptureForm initialDraftId="draft1" upcomingCatalogNumber={4} />)
    expect(await screen.findByText('Draft restored from your last session')).toBeInTheDocument()
    await click('Next')
    await click('Next')
    await click('Next')
    await click('Seal without questions')
    expect(screen.getByLabelText('A letter to future you (optional)')).toHaveValue('Kept letter')
    expect(screen.getByLabelText('Opens on')).toHaveValue('2027-09-01')
  })

  it('finalizes with the letter, and without one when it is blank', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToReview()
    await click('Lock it in')
    await waitFor(() => expect(finalize()?.body).toMatchObject({ finalize: true, letter: null }))
  })

  it('finalizes with a written letter and its day', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToReview()
    await userEvent.type(screen.getByLabelText('A letter to future you (optional)'), 'Keep going')
    fill('Opens on', '2027-10-01')
    await click('Lock it in')
    await waitFor(() => expect(finalize()?.body).toMatchObject({ finalize: true, letter: { body: 'Keep going', opensOn: '2027-10-01' } }))
  })

  it('shows the server letter error on the review screen', async () => {
    mockFetch({ finalizeFailure: { error: 'Pick an opening day at least a month away.' } })
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToReview()
    await userEvent.type(screen.getByLabelText('A letter to future you (optional)'), 'Keep going')
    await click('Lock it in')
    expect(await screen.findByText('Pick an opening day at least a month away.')).toBeInTheDocument()
    expect(screen.getByText('Read it once more before it is sealed.')).toBeInTheDocument()
  })
})
