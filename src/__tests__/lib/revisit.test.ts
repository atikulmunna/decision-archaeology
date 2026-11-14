import { describe, expect, it } from 'vitest'
import { checkCheckInDay, checkInChoices, isDueForRevisit } from '@/lib/revisit'

const day = (s: string) => new Date(`${s}T00:00:00Z`)

describe('revisit rules', () => {
  it('is due when a letter has opened since the last revisit, or a check-in has arrived', () => {
    const now = new Date('2027-01-10T00:00:00Z')
    expect(isDueForRevisit({ letterOpensAt: day('2027-01-01'), lastRevisitAt: null, pendingCheckIn: null }, now)).toBe(true)
    expect(isDueForRevisit({ letterOpensAt: day('2027-01-01'), lastRevisitAt: day('2027-01-05'), pendingCheckIn: null }, now)).toBe(false)
    expect(isDueForRevisit({ letterOpensAt: day('2027-02-01'), lastRevisitAt: null, pendingCheckIn: day('2027-01-09') }, now)).toBe(true)
    expect(isDueForRevisit({ letterOpensAt: null, lastRevisitAt: null, pendingCheckIn: day('2027-01-11') }, now)).toBe(false)
    expect(isDueForRevisit({ letterOpensAt: null, lastRevisitAt: null, pendingCheckIn: null }, now)).toBe(false)
  })

  it('offers 1, 3 and 6 months and accepts only future days within two years', () => {
    const today = new Date('2026-11-15T10:00:00Z')
    expect(checkInChoices(today)).toEqual([
      { label: '1 month', day: '2026-12-15' },
      { label: '3 months', day: '2027-02-15' },
      { label: '6 months', day: '2027-05-15' },
    ])
    expect(checkCheckInDay('2026-11-16', today)).toEqual({ ok: true, at: day('2026-11-16') })
    expect(checkCheckInDay('2026-11-15', today)).toEqual({ ok: false, error: 'Pick a day in the next two years.' })
    expect(checkCheckInDay('2028-11-15', today)).toEqual({ ok: true, at: day('2028-11-15') })
    expect(checkCheckInDay('2028-11-16', today)).toEqual({ ok: false, error: 'Pick a day in the next two years.' })
    expect(checkCheckInDay('not a day', today)).toEqual({ ok: false, error: 'Pick a day in the next two years.' })
  })
})
