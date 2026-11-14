import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let search = ''
let pathname = '/demo'
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => pathname,
}))

import { TourBar } from '@/components/demo/TourBar'
import { TOUR_STOPS } from '@/lib/tour'

function show(path: string, query: string) {
  pathname = path
  search = query
  return render(<TourBar />)
}

describe('TourBar', () => {
  it('shows the step, the caption and every control mid-tour', () => {
    show('/demo/decisions/demo-0007', 'view=then&tour=2')
    const bar = screen.getByRole('region', { name: 'Guided tour' })
    expect(bar).toHaveTextContent('Tour · 2 of 5')
    expect(bar).toHaveTextContent(TOUR_STOPS[1].caption)
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', TOUR_STOPS[0].href)
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', TOUR_STOPS[2].href)
    expect(screen.getByRole('link', { name: 'End tour' })).toHaveAttribute('href', '/demo/decisions/demo-0007?view=then')
  })

  it('announces the step politely', () => {
    show('/demo', 'tour=1')
    expect(screen.getByText(/Tour · 1 of 5/)).toHaveAttribute('aria-live', 'polite')
  })

  it('hides Back on the first stop', () => {
    show('/demo', 'tour=1')
    expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
  })

  it('offers Finish on the last stop', () => {
    show('/demo/calibration', 'tour=5')
    expect(screen.getByRole('link', { name: 'Finish' })).toHaveAttribute('href', '/how-it-works')
    expect(screen.queryByRole('link', { name: 'Next' })).toBeNull()
  })

  it('renders nothing for a bad or missing value', () => {
    expect(show('/demo', 'tour=9').container).toBeEmptyDOMElement()
    expect(show('/demo', '').container).toBeEmptyDOMElement()
  })
})
