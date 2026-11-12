import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Forecast } from '@prisma/client'
import { ForecastList } from '@/components/decisions/ForecastList'

const NOW = new Date('2026-11-10T12:00:00.000Z')
const base = { decisionId: 'd1', createdAt: NOW, updatedAt: NOW, resolution: null, resolvedAt: null }
const open: Forecast = {
  ...base,
  id: 'f1',
  position: 0,
  statement: 'I am promoted to staff engineer',
  probability: 70,
  resolveBy: new Date('2027-06-30T00:00:00.000Z'),
}
const due: Forecast = {
  ...base,
  id: 'f2',
  position: 1,
  statement: 'The half marathon is under 2:00',
  probability: 85,
  resolveBy: new Date('2026-10-12T00:00:00.000Z'),
}
const resolved: Forecast = {
  ...base,
  id: 'f3',
  position: 2,
  statement: 'I move flats again',
  probability: 40,
  resolveBy: new Date('2026-03-01T00:00:00.000Z'),
  resolution: 'DIDNT',
  resolvedAt: new Date('2026-03-03T09:00:00.000Z'),
}

function Harness({ initial = [open, due, resolved] }: { initial?: Forecast[] }) {
  const [forecasts, setForecasts] = useState(initial)
  return <ForecastList decisionId="d1" forecasts={forecasts} canEdit canResolve now={NOW} onForecastsChange={setForecasts} />
}

const item = (sentence: string) => within(screen.getByText(sentence).closest('li')!)
const OPEN = '70% that I am promoted to staff engineer by Jun 30, 2027'
const DUE = '85% that the half marathon is under 2:00 by Oct 12, 2026'
const RESOLVED = '40% that I move flats again by Mar 1, 2026'
const buttonNames = (scope: ReturnType<typeof item>) => scope.queryAllByRole('button').map((button) => button.textContent)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ForecastList', () => {
  it('shows each status with only the resolutions its date allows', async () => {
    render(<Harness />)
    expect(item(OPEN).getByText('Open', { selector: '[data-chip]' })).toBeInTheDocument()
    expect(buttonNames(item(OPEN))).toEqual(['Happened'])
    expect(item(DUE).getByText('Due', { selector: '[data-chip]' })).toBeInTheDocument()
    expect(buttonNames(item(DUE))).toEqual(['Happened', "Didn't happen", "Can't tell"])
    expect(item(RESOLVED).getByText("Didn't happen", { selector: '[data-chip]' })).toBeInTheDocument()
    expect(item(RESOLVED).getByText('Resolved Mar 3, 2026 · scored 0.16')).toBeInTheDocument()
    expect(buttonNames(item(RESOLVED))).toEqual(['Change'])
    await userEvent.click(item(RESOLVED).getByRole('button', { name: 'Change' }))
    expect(buttonNames(item(RESOLVED))).toEqual(['Happened', "Didn't happen", "Can't tell", 'Reopen'])
  })

  it('resolves at once and saves in the background', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ...open, resolution: 'HAPPENED' })))
    render(<Harness />)
    await userEvent.click(item(OPEN).getByRole('button', { name: 'Happened' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/decisions/d1/forecasts/f1', expect.objectContaining({ method: 'PUT' }))
    expect(JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)).toEqual({ resolution: 'HAPPENED' })
    expect(await item(OPEN).findByText('Happened', { selector: '[data-chip]' })).toBeInTheDocument()
  })

  it('puts the forecast back when saving fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    render(<Harness />)
    await userEvent.click(item(DUE).getByRole('button', { name: "Didn't happen" }))
    expect(await item(DUE).findByText('Could not save. Try again.')).toBeInTheDocument()
    expect(item(DUE).getByText('Due', { selector: '[data-chip]' })).toBeInTheDocument()
  })

  it('offers no controls to readers, and explains the wait before sealing', () => {
    const { unmount } = render(<ForecastList decisionId="d1" forecasts={[open, due]} canEdit={false} canResolve now={NOW} />)
    expect(screen.queryByRole('button')).toBeNull()
    unmount()
    render(<ForecastList decisionId="d1" forecasts={[open]} canEdit canResolve={false} now={NOW} />)
    expect(screen.getByText('Resolve forecasts once the decision is sealed.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing without forecasts', () => {
    const { container } = render(<ForecastList decisionId="d1" forecasts={[]} canEdit canResolve now={NOW} />)
    expect(container).toBeEmptyDOMElement()
  })
})
