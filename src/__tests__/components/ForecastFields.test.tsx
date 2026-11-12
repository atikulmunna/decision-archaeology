import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  completeForecasts,
  forecastErrors,
  ForecastFields,
  type ForecastDraft,
} from '@/components/decisions/ForecastFields'

function Harness({
  initial = [],
  defaultResolveBy,
  errors = {},
}: {
  initial?: ForecastDraft[]
  defaultResolveBy?: string
  errors?: Record<number, string>
}) {
  const [forecasts, setForecasts] = useState<ForecastDraft[]>(initial)
  return <ForecastFields forecasts={forecasts} defaultResolveBy={defaultResolveBy} errors={errors} onChange={setForecasts} />
}

const group = (n: number) => screen.getByRole('group', { name: `Forecast ${n}` })
const draft = (statement: string): ForecastDraft => ({ statement, probability: 50, resolveBy: '2027-01-01' })

// A fixed today, so the forecast dates in these tests stay in the future.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-12T10:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ForecastFields', () => {
  it('adds a forecast with a statement, a 5% step slider and a resolve-by date', async () => {
    render(<Harness defaultResolveBy="2027-06-30" />)
    expect(screen.queryByRole('group')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add a forecast' }))

    const first = within(group(1))
    expect(first.getByLabelText('What will happen')).toHaveValue('')
    const slider = first.getByRole('slider', { name: 'Probability for forecast 1' })
    expect(slider).toHaveAttribute('min', '5')
    expect(slider).toHaveAttribute('max', '95')
    expect(slider).toHaveAttribute('step', '5')
    expect(slider).toHaveValue('50')
    expect(first.getByText('50%')).toBeInTheDocument()
    expect(first.getByLabelText('Resolve by')).toHaveValue('2027-06-30')

    fireEvent.change(slider, { target: { value: '70' } })
    expect(first.getByText('70%')).toBeInTheDocument()
  })

  it('previews the sentence once the forecast is complete', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Add a forecast' }))
    const first = within(group(1))
    await userEvent.type(first.getByLabelText('What will happen'), 'The podcast reaches 500 listeners')
    fireEvent.change(first.getByLabelText('Resolve by'), { target: { value: '2026-10-01' } })
    expect(first.getByText('50% that the podcast reaches 500 listeners by Oct 1, 2026')).toBeInTheDocument()
  })

  it('stops at three and renumbers after a removal', async () => {
    render(<Harness initial={[draft('A'), draft('B'), draft('C')]} />)
    expect(screen.queryByRole('button', { name: 'Add a forecast' })).toBeNull()
    await userEvent.click(within(group(2)).getByRole('button', { name: 'Remove' }))
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(within(group(2)).getByLabelText('What will happen')).toHaveValue('C')
    expect(screen.getByRole('button', { name: 'Add a forecast' })).toBeInTheDocument()
  })

  it('shows an error on its forecast', () => {
    render(<Harness initial={[draft('A')]} errors={{ 0: 'Add a statement and a date, or remove this forecast.' }} />)
    expect(within(group(1)).getByText('Add a statement and a date, or remove this forecast.')).toBeInTheDocument()
  })

  it('keeps complete forecasts and flags half-filled ones', () => {
    const drafts: ForecastDraft[] = [
      draft('Complete'),
      { statement: 'No date', probability: 50, resolveBy: '' },
      { statement: '  ', probability: 50, resolveBy: '2027-01-01' },
      { statement: '', probability: 50, resolveBy: '' },
    ]
    expect(completeForecasts(drafts)).toEqual([draft('Complete')])
    expect(forecastErrors(drafts)).toEqual({
      1: 'Add a statement and a date, or remove this forecast.',
      2: 'Add a statement and a date, or remove this forecast.',
    })
  })
})
