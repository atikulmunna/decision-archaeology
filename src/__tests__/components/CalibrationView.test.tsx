import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { CalibrationView } from '@/components/calibration/CalibrationView'
import { summarizeCalibration } from '@/lib/calibration'
import { buildDemoArchive } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import { DEMO_ROUTES } from '@/lib/routes'

const archive = buildDemoArchive()

describe('CalibrationView', () => {
  it('shows the Brier score, the finding, the curve, what is due and the older measure', () => {
    const { container } = render(
      <CalibrationView eyebrow="Demo archive" data={summarizeCalibration(archive, DEMO_NOW)} routes={DEMO_ROUTES} />
    )
    expect(screen.getByText('0.19')).toBeInTheDocument()
    expect(screen.getByText('Lower is better. Always saying 50% scores 0.25.')).toBeInTheDocument()
    expect(screen.getByText('When you said 70% or more, it happened 71% of the time.')).toBeInTheDocument()
    expect(screen.getByText('Overconfident')).toBeInTheDocument()
    expect(screen.getByText('61 resolved · 9 open · 3 due')).toBeInTheDocument()

    expect(screen.getByRole('img', { name: /Reliability curve/ })).toBeInTheDocument()
    expect(container.querySelectorAll('[data-band]')).toHaveLength(9)
    const table = screen.getByRole('table', { name: 'Reliability by band' })
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['You said', 'It happened', 'Forecasts'])
    expect(within(table).getAllByRole('row')).toHaveLength(10)

    const due = screen.getByRole('region', { name: 'Due to resolve' })
    const links = within(due).getAllByRole('link')
    expect(links).toHaveLength(3)
    for (const link of links) expect(link.getAttribute('href')).toMatch(/^\/demo\/decisions\/demo-\d{4}\?view=now$/)

    const domains = screen.getByRole('region', { name: 'By domain' })
    expect(within(domains).getByText('Career')).toBeInTheDocument()
    expect(screen.getByText('Outcome alignment (older measure)')).toBeInTheDocument()
  })

  it('says how many more forecasts the score needs, and keeps the older measure', () => {
    const twoScored = archive.map((decision, index) => ({ ...decision, forecasts: index === 0 ? decision.forecasts.slice(0, 2) : [] }))
    const { container, unmount } = render(
      <CalibrationView eyebrow="Your record" data={summarizeCalibration(twoScored, DEMO_NOW)} routes={DEMO_ROUTES} />
    )
    expect(screen.getByText('Resolve 3 more forecasts to see your Brier score.')).toBeInTheDocument()
    expect(screen.queryByText(/When you said/)).toBeNull()
    expect(container.querySelectorAll('[data-band]')).toHaveLength(0)
    expect(screen.getByRole('img', { name: /Reliability curve/ })).toBeInTheDocument()
    expect(screen.getByText('Outcome alignment (older measure)')).toBeInTheDocument()
    expect(screen.getByText('71')).toBeInTheDocument()
    unmount()

    const fourScored = archive.map((decision, index) => ({ ...decision, forecasts: index < 2 ? decision.forecasts.slice(0, 2) : [] }))
    render(<CalibrationView eyebrow="Your record" data={summarizeCalibration(fourScored, DEMO_NOW)} routes={DEMO_ROUTES} />)
    expect(screen.getByText('Resolve 1 more forecast to see your Brier score.')).toBeInTheDocument()
  })
})
