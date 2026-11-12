import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FieldNote } from '@prisma/client'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { NotesSince } from '@/components/decisions/DecisionNotes'
import { DEMO_NOW } from '@/lib/demo/clock'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'

const coffee = getDemoDecision(demoDecisionIdForKey('one-coffee-a-day'))!
const seal = coffee.createdAt.getTime()
const note = (id: string, offset: number, body: string, extra: Partial<FieldNote> = {}): FieldNote => ({
  id,
  userId: 'demo-user',
  decisionId: coffee.id,
  body,
  mood: 2,
  energy: null,
  promoted: false,
  createdAt: new Date(seal + offset),
  updatedAt: new Date(seal + offset),
  ...extra,
})
const DAY = 24 * 3600 * 1000

afterEach(() => {
  vi.restoreAllMocks()
})

describe('field notes on the decision page', () => {
  it('splits linked notes at the seal: before in Then, after in Now, and opens in Now', async () => {
    const fieldNotes = [
      note('a', -DAY, 'Noticed the 3pm crash again.', { promoted: true }),
      note('b', 0, 'Writing this as I seal it.'),
      note('c', DAY, 'Day one at one cup. Headache by noon.'),
    ]
    render(<DecisionDetail decision={{ ...coffee, fieldNotes }} readOnly timeZone="UTC" now={DEMO_NOW} />)
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')
    const now = screen.getByRole('tabpanel')
    expect(now).toHaveTextContent('Field notes since')
    expect(now).toHaveTextContent('Day one at one cup. Headache by noon.')
    expect(now).not.toHaveTextContent('Writing this as I seal it.')

    await userEvent.click(screen.getByRole('tab', { name: 'Then' }))
    const then = screen.getByRole('tabpanel')
    expect(then).toHaveTextContent('Field notes before sealing')
    expect(then).toHaveTextContent('Noticed the 3pm crash again.')
    expect(then).toHaveTextContent('Writing this as I seal it.')
    expect(then).toHaveTextContent('Where this started')
    expect(then).not.toHaveTextContent('Day one at one cup.')
  })

  it('lets the owner add a note about the decision, which joins the list', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init!.body))
      return new Response(
        JSON.stringify({ id: 'n9', ...body, promoted: false, createdAt: new Date(seal + 2 * DAY).toISOString(), decision: null }),
        { status: 201 }
      )
    })
    render(<NotesSince decisionId={coffee.id} notes={[]} canEdit />)
    await userEvent.type(screen.getByLabelText('Add a note about this decision'), 'Still on one cup.')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body)).decisionId).toBe(coffee.id)
    expect(await screen.findByText('Still on one cup.')).toBeInTheDocument()
  })

  it('shows readers nothing when there are no later notes', () => {
    const { container } = render(<NotesSince decisionId={coffee.id} notes={[]} canEdit={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
