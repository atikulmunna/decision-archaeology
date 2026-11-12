import { describe, expect, it } from 'vitest'
import { toForecastInputs, toForecastRows } from '@/lib/forecast-input'

describe('forecast input', () => {
  it('turns form forecasts into positioned rows at UTC midnight, and back', () => {
    const rows = toForecastRows([
      { statement: ' First ', probability: 70, resolveBy: '2027-06-30' },
      { statement: 'Second', probability: 30, resolveBy: '2027-01-15' },
    ])
    expect(rows).toEqual([
      { position: 0, statement: 'First', probability: 70, resolveBy: new Date('2027-06-30T00:00:00.000Z') },
      { position: 1, statement: 'Second', probability: 30, resolveBy: new Date('2027-01-15T00:00:00.000Z') },
    ])
    expect(toForecastInputs(rows)).toEqual([
      { statement: 'First', probability: 70, resolveBy: '2027-06-30' },
      { statement: 'Second', probability: 30, resolveBy: '2027-01-15' },
    ])
    // A draft read back over JSON carries ISO strings.
    expect(toForecastInputs([{ statement: 'S', probability: 50, resolveBy: '2027-06-30T00:00:00.000Z' }])).toEqual([
      { statement: 'S', probability: 50, resolveBy: '2027-06-30' },
    ])
  })
})
