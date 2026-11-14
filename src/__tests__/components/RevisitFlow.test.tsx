import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { RevisitFlow } from '@/components/revisit/RevisitFlow'
import type { RevisitData } from '@/components/revisit/revisit-data'
import { letterFingerprint } from '@/lib/letter-rules'

const day = (s: string) => new Date(`${s}T00:00:00.000Z`)
const now = new Date('2027-03-10T12:00:00.000Z')
const forecast = (id: string, resolveBy: string, resolution: 'HAPPENED' | null = null) => ({
  id,
  decisionId: 'd7',
  position: Number(id.slice(1)),
  statement: `forecast ${id}`,
  probability: 70,
  resolveBy: day(resolveBy),
  resolution,
  resolvedAt: resolution ? day('2027-02-01') : null,
  createdAt: day('2026-01-01'),
  updatedAt: day('2026-01-01'),
})
const data = (overrides: Partial<RevisitData> = {}): RevisitData => ({
  id: 'd7',
  catalogLabel: 'DA-0007',
  title: 'Accept the senior role at Northwind?',
  chosenOption: 'Accept the Northwind offer.',
  reasoning: 'The team is strong.',
  predictedOutcome: 'Glad within six months.',
  confidenceLevel: 7,
  challenge: { outcome: null, model: null, questions: [] },
  uncertainties: null,
  reviews: [],
  canReview: true,
  forecasts: [forecast('f0', '2027-01-01'), forecast('f1', '2027-06-01'), forecast('f2', '2027-02-01', 'HAPPENED')],
  outcomes: [],
  pendingCheckIn: null,
  backHref: '/decisions/d7',
  ...overrides,
})
const flow = (letter: Parameters<typeof RevisitFlow>[0]['letter'] = { state: 'none' }, overrides: Partial<RevisitData> = {}, mode: 'owner' | 'demo' = 'owner') =>
  render(<RevisitFlow mode={mode} data={data(overrides)} letter={letter} now={now} />)
const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

afterEach(() => vi.restoreAllMocks())

describe('RevisitFlow', () => {
  it('walks six steps with Back, Skip and Next, showing Step n of 6', async () => {
    flow()
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument()
    for (const name of ['Letter', 'Sealed', 'Assumptions', 'Forecasts', 'Outcome', 'Next']) expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    await next()
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument()
    expect(screen.getByText('Accept the Northwind offer.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument()
  })

  it('opens the letter on step one with its match line, says Sealed until before its day, and says when there is none', async () => {
    const body = 'Dear me, how is the commute?'
    const sha256 = await letterFingerprint(body)
    const { unmount } = flow({ state: 'open', opensAt: day('2027-03-01'), openedAt: now, sha256, body })
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(await screen.findByText('Matches its seal')).toBeInTheDocument()
    unmount()
    const sealed = flow({ state: 'sealed', opensAt: day('2027-04-01') })
    expect(screen.getByText('Sealed until Apr 1, 2027')).toBeInTheDocument()
    sealed.unmount()
    flow({ state: 'none' })
    expect(screen.getByText('No letter for this decision.')).toBeInTheDocument()
  })

  it('shows only unresolved forecasts whose day has passed, or Nothing due', async () => {
    const { unmount } = flow()
    for (let i = 0; i < 3; i += 1) await next()
    expect(screen.getByText('Step 4 of 6')).toBeInTheDocument()
    expect(screen.getByText(/forecast f0/)).toBeInTheDocument()
    expect(screen.queryByText(/forecast f1/)).toBeNull()
    expect(screen.queryByText(/forecast f2/)).toBeNull()
    unmount()
    flow({ state: 'none' }, { forecasts: [] })
    for (let i = 0; i < 3; i += 1) await next()
    expect(screen.getByText('Nothing due.')).toBeInTheDocument()
  })

  it('starts the next check-in on the pending day or 3 months, and Finish revisit posts the choice', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ revisitId: 'r1', nextCheckIn: '2027-06-10' }), { status: 201 }))
    flow()
    for (let i = 0; i < 5; i += 1) await next()
    expect(screen.getByText('Step 6 of 6')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '3 months' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Finish revisit' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/decisions/d7/revisits', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ nextCheckIn: '2027-06-10' })
    expect(await screen.findByText('Revisit recorded.')).toBeInTheDocument()
  })

  it('starts on the pending check-in day when there is one, and Not again sends null', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ revisitId: 'r1', nextCheckIn: null }), { status: 201 }))
    flow({ state: 'none' }, { pendingCheckIn: day('2027-08-01') })
    for (let i = 0; i < 5; i += 1) await next()
    expect(screen.getByLabelText('On a day')).toHaveValue('2027-08-01')
    await userEvent.click(screen.getByRole('radio', { name: 'Not again' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish revisit' }))
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toEqual({ nextCheckIn: null })
  })

  it('keeps the chosen check-in and says so when finishing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    flow()
    for (let i = 0; i < 5; i += 1) await next()
    await userEvent.click(screen.getByRole('radio', { name: '6 months' }))
    await act(async () => userEvent.click(screen.getByRole('button', { name: 'Finish revisit' })))
    expect(await screen.findByText('Could not record the revisit. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '6 months' })).toBeChecked()
  })

  it('is read-only in the demo', async () => {
    flow({ state: 'none' }, {}, 'demo')
    for (let i = 0; i < 5; i += 1) await next()
    expect(screen.getByRole('button', { name: 'Finish revisit' })).toBeDisabled()
    expect(screen.getByText('The demo is read-only.')).toBeInTheDocument()
  })
})
