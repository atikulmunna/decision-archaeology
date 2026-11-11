import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssumptionList } from '@/components/decisions/AssumptionList'
import type { ReviewLike } from '@/lib/assumptions'

const uncertainties = 'Whether the team holds. Whether the hours stay reasonable.'
const now = new Date('2026-11-10T12:00:00Z')
const held: ReviewLike = { itemText: 'Whether the team holds.', verdict: 'HELD', note: 'It did.', updatedAt: now }

function Harness({ initial = [] as ReviewLike[] }) {
  const [reviews, setReviews] = useState<ReviewLike[]>(initial)
  return (
    <AssumptionList decisionId="d1" uncertainties={uncertainties} reviews={reviews} canEdit canReview onReviewsChange={setReviews} />
  )
}

const firstItem = () => screen.getAllByRole('listitem')[0]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AssumptionList', () => {
  it('shows verdicts read-only with no controls', () => {
    render(<AssumptionList decisionId="d1" uncertainties={uncertainties} canEdit={false} canReview reviews={[held]} />)
    expect(screen.getByText('Held up')).toBeInTheDocument()
    expect(screen.getByText('It did.')).toBeInTheDocument()
    expect(screen.getByText('Not reviewed')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('lets the owner set a verdict and a note', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'r1' })))
    render(<Harness />)
    await userEvent.click(within(firstItem()).getByRole('button', { name: 'Partly' }))
    await userEvent.type(within(firstItem()).getByLabelText('Note'), 'Mostly.')
    await userEvent.click(within(firstItem()).getByRole('button', { name: 'Save' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/decisions/d1/assumptions', expect.objectContaining({ method: 'PUT' }))
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toEqual({
      itemText: 'Whether the team holds.',
      verdict: 'PARTLY',
      note: 'Mostly.',
    })
    expect(within(firstItem()).getByRole('button', { name: 'Partly' })).toHaveAttribute('aria-pressed', 'true')
    expect(await within(firstItem()).findByText('Partly', { selector: '[data-chip]' })).toBeInTheDocument()
  })

  it('restores the previous verdict when saving fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    render(<Harness initial={[held]} />)
    await userEvent.click(within(firstItem()).getByRole('button', { name: "Didn't hold up" }))
    await userEvent.click(within(firstItem()).getByRole('button', { name: 'Save' }))
    expect(await within(firstItem()).findByText('Could not save. Try again.')).toBeInTheDocument()
    expect(within(firstItem()).getByText('Held up', { selector: '[data-chip]' })).toBeInTheDocument()
    expect(within(firstItem()).getByRole('button', { name: 'Held up' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clears a verdict', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ cleared: true })))
    render(<Harness initial={[held]} />)
    await userEvent.click(within(firstItem()).getByRole('button', { name: 'Clear' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/decisions/d1/assumptions', expect.objectContaining({ method: 'DELETE' }))
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toEqual({ itemText: 'Whether the team holds.' })
    expect(await within(firstItem()).findByText('Not reviewed')).toBeInTheDocument()
    expect(within(firstItem()).queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('explains why there are no controls inside the edit window', () => {
    render(<AssumptionList decisionId="d1" uncertainties={uncertainties} reviews={[]} canEdit canReview={false} />)
    expect(screen.getByText('Review assumptions once the decision is sealed.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps orphaned reviews readable', () => {
    render(
      <AssumptionList
        decisionId="d1"
        uncertainties={uncertainties}
        canEdit={false}
        canReview
        reviews={[{ itemText: 'An older wording.', verdict: 'DIDNT', note: null, updatedAt: now }]}
      />
    )
    expect(screen.getByText('From an earlier reading of your uncertainties')).toBeInTheDocument()
    expect(screen.getByText('An older wording.')).toBeInTheDocument()
    expect(screen.getByText("Didn't hold up")).toBeInTheDocument()
  })

  it('lets the owner clear an orphaned review, with no other controls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ cleared: true })))
    render(<Harness initial={[{ itemText: 'An older wording.', verdict: 'DIDNT', note: null, updatedAt: now }]} />)
    const orphanItem = screen.getByText('An older wording.').closest('li')!
    expect(within(orphanItem).queryByRole('button', { name: 'Held up' })).toBeNull()
    expect(within(orphanItem).queryByRole('button', { name: 'Save' })).toBeNull()
    expect(within(orphanItem).queryByLabelText('Note')).toBeNull()
    await userEvent.click(within(orphanItem).getByRole('button', { name: 'Clear' }))
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toEqual({ itemText: 'An older wording.' })
    await waitFor(() => expect(screen.queryByText('An older wording.')).toBeNull())
  })

  it('says when there are no uncertainties', () => {
    render(<AssumptionList decisionId="d1" uncertainties={null} reviews={[]} canEdit canReview />)
    expect(screen.getByText('No uncertainties were recorded.')).toBeInTheDocument()
  })
})
