import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

function mockFetch(draft?: Record<string, unknown>) {
  calls = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null })
    if (method === 'GET') return new Response(JSON.stringify(draft ?? {}), { status: draft ? 200 : 404 })
    if (method === 'POST') return new Response(JSON.stringify({ id: 'draft1' }))
    return new Response(
      JSON.stringify({ id: 'draft1', createdAt: new Date().toISOString(), catalogNumber: 4, sealHash: 'abc' })
    )
  })
}

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
const next = (name = 'Next') => userEvent.click(screen.getByRole('button', { name }))

async function walkToStep3() {
  fill('Decision Title', text.title)
  fill('Decision Summary', text.summary)
  fill('Context', text.context)
  await next()
  fill('Alternatives Considered', text.alternatives)
  fill('Chosen Option', text.chosenOption)
  fill('Reasoning', text.reasoning)
  await next()
}

const group = (n: number) => within(screen.getByRole('group', { name: `Forecast ${n}` }))
const patches = () => calls.filter((call) => call.method === 'PATCH')

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('capture flow forecasts', () => {
  it('saves only complete forecasts, blocks a half-filled one, and seals the rest', async () => {
    mockFetch()
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await walkToStep3()

    await userEvent.click(screen.getByRole('button', { name: 'Add a forecast' }))
    fireEvent.change(group(1).getByLabelText('What will happen'), { target: { value: 'I ship the new pipeline' } })
    fireEvent.change(group(1).getByRole('slider', { name: 'Probability for forecast 1' }), { target: { value: '70' } })
    fireEvent.change(group(1).getByLabelText('Resolve by'), { target: { value: '2027-06-30' } })
    await userEvent.click(screen.getByRole('button', { name: 'Add a forecast' }))
    fireEvent.change(group(2).getByLabelText('What will happen'), { target: { value: 'Half filled' } })

    await next('Review and seal')
    expect(group(2).getByText('Add a statement and a date, or remove this forecast.')).toBeInTheDocument()
    expect(screen.queryByText('Read it once more before it is sealed.')).toBeNull()

    // Going back and forward again autosaves the draft without the half-filled forecast.
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await next()
    const complete = { statement: 'I ship the new pipeline', probability: 70, resolveBy: '2027-06-30' }
    await waitFor(() => expect(patches().at(-1)?.body?.forecasts).toEqual([complete]))

    await userEvent.click(group(2).getByRole('button', { name: 'Remove' }))
    await next('Review and seal')
    expect(screen.getByText('70% that I ship the new pipeline by Jun 30, 2027')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Lock it in' }))
    await waitFor(() => expect(patches().at(-1)?.body).toMatchObject({ finalize: true, forecasts: [complete] }))
  })

  it('restores forecasts from a saved draft', async () => {
    window.localStorage.setItem('decision-archaeology:draft-id', 'draft1')
    mockFetch({
      id: 'draft1',
      isDraft: true,
      ...text,
      customTags: [],
      forecasts: [{ statement: 'I ship the new pipeline', probability: 70, resolveBy: '2027-06-30T00:00:00.000Z' }],
    })
    render(<DecisionCaptureForm upcomingCatalogNumber={4} />)
    await screen.findByText('Draft restored from your last session')
    await next()
    await next()
    expect(group(1).getByLabelText('What will happen')).toHaveValue('I ship the new pipeline')
    expect(group(1).getByLabelText('Resolve by')).toHaveValue('2027-06-30')
    expect(group(1).getByText('70%')).toBeInTheDocument()
  })
})
