import { describe, expect, it } from 'vitest'
import { parseTourStep, TOUR_FINISH_HREF, TOUR_START_HREF, TOUR_STOPS, tourState, withoutTour } from '@/lib/tour'
import { getDemoDecision } from '@/lib/demo/queries'

describe('tour stops', () => {
  it('walks the five demo stops in order, each carrying its own number', () => {
    expect(TOUR_STOPS.map((stop) => stop.href)).toEqual([
      '/demo?tour=1',
      '/demo/decisions/demo-0007?view=then&tour=2',
      '/demo/decisions/demo-0007?view=now&tour=3',
      '/demo?view=strata&tour=4',
      '/demo/calibration?tour=5',
    ])
    expect(TOUR_STOPS.map((stop) => stop.n)).toEqual([1, 2, 3, 4, 5])
    expect(TOUR_STOPS[0].caption).toBe("This is Rowan's archive: eighteen months of sealed decisions.")
    expect(TOUR_STOPS[1].caption).toBe('Every decision is sealed. Press Verify seal, then try changing a word.')
    expect(TOUR_STOPS[2].caption).toBe('Then vs Now: what Rowan expected, beside what happened.')
    expect(TOUR_STOPS[3].caption).toBe('The archive as strata: newer decisions settle on top.')
    expect(TOUR_STOPS[4].caption).toBe('Forecasts scored with a Brier score.')
    expect(TOUR_START_HREF).toBe('/demo?tour=1')
    expect(TOUR_FINISH_HREF).toBe('/how-it-works')
  })

  it('points stops 2 and 3 at the Northwind decision', () => {
    expect(getDemoDecision('demo-0007')?.title).toContain('Northwind')
  })
})

describe('parseTourStep', () => {
  it('accepts exactly 1 to 5', () => {
    expect(['1', '2', '3', '4', '5'].map(parseTourStep)).toEqual([1, 2, 3, 4, 5])
  })

  it('rejects anything else', () => {
    for (const value of [null, '', '0', '6', '04', '1.5', ' 2', 'two']) {
      expect(parseTourStep(value)).toBeNull()
    }
  })
})

describe('tourState', () => {
  it('has no Back on the first stop', () => {
    expect(tourState(1).backHref).toBeNull()
    expect(tourState(1).total).toBe(5)
  })

  it('links Back and Next to the neighbouring stops', () => {
    expect(tourState(2).backHref).toBe(TOUR_STOPS[0].href)
    expect(tourState(4).nextHref).toBe(TOUR_STOPS[4].href)
    expect(tourState(4).nextLabel).toBe('Next')
  })

  it('finishes on the case study', () => {
    expect(tourState(5).nextHref).toBe('/how-it-works')
    expect(tourState(5).nextLabel).toBe('Finish')
  })
})

describe('withoutTour', () => {
  it('drops only the tour parameter', () => {
    expect(withoutTour('/demo', 'view=strata&tour=4')).toBe('/demo?view=strata')
    expect(withoutTour('/demo', 'tour=1')).toBe('/demo')
    expect(withoutTour('/demo/decisions/demo-0007', 'view=now&tour=3')).toBe('/demo/decisions/demo-0007?view=now')
  })
})
