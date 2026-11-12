import { describe, expect, it } from 'vitest'
import { getDemoCalibrationRecords, getDemoDecision, listDemoDecisions, listDemoStrataRecords } from '@/lib/demo/queries'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_NOW, daysBefore } from '@/lib/demo/clock'

describe('listDemoDecisions', () => {
  it('lists the 24 sealed decisions newest first, 20 per page', () => {
    const first = listDemoDecisions({ page: 1, limit: 20 })
    expect([first.total, first.records.length, first.records[0].catalogNumber]).toEqual([24, 20, 24])
    expect(first.records[19].catalogNumber).toBe(5)
    const second = listDemoDecisions({ page: 2, limit: 20 })
    expect(second.records.map((record) => record.catalogNumber)).toEqual([4, 3, 2, 1])
    expect(listDemoDecisions({}).records).toHaveLength(20)
  })

  it('gives each listed record only its latest outcome', () => {
    const card = listDemoDecisions({ q: 'Northwind senior' }).records[0]
    expect(card.title).toBe('Accept the senior role at Northwind?')
    expect(card.outcomes.map((outcome) => outcome.outcomeRating)).toEqual(['AS_EXPECTED'])
  })

  it('searches every token case-insensitively across the app search fields', () => {
    expect(listDemoDecisions({ q: 'NORTHWIND senior' }).total).toBe(1)
    expect(listDemoDecisions({ q: 'lighthouse' }).records.map((record) => record.id)).toEqual([
      demoDecisionIdForKey('cofound-fernhill'),
    ])
  })

  it('treats regex characters as plain text', () => {
    expect(() => listDemoDecisions({ q: 'c++ (equity' })).not.toThrow()
    expect(listDemoDecisions({ q: 'c++ (equity' }).total).toBe(0)
  })

  it('applies each filter', () => {
    expect(listDemoDecisions({ domain: 'HEALTH' }).total).toBe(4)
    expect(listDemoDecisions({ outcome: 'too_early' }).total).toBe(4)
    expect(listDemoDecisions({ outcome: 'pending' }).total).toBe(4)
    expect(listDemoDecisions({ outcome: 'has' }).total).toBe(20)
    expect(listDemoDecisions({ outcome: 'negative' }).total).toBe(3)
    const confident = listDemoDecisions({ minConfidence: 7 }).records
    expect(confident.length).toBeGreaterThan(0)
    expect(confident.every((record) => record.confidenceLevel! >= 7)).toBe(true)
    expect(listDemoDecisions({ tag: 'equity' }).total).toBe(3)
    expect(listDemoDecisions({ dateFrom: daysBefore(DEMO_NOW, 200).toISOString().slice(0, 10) }).total).toBe(7)
    expect(listDemoDecisions({ dateTo: daysBefore(DEMO_NOW, 500).toISOString().slice(0, 10) }).total).toBe(3)
  })
})

describe('getDemoDecision', () => {
  it('returns null for unknown or real-looking ids', () => {
    expect(getDemoDecision('demo-9999')).toBeNull()
    expect(getDemoDecision('clx0abc123def456')).toBeNull()
  })

  it('returns full detail with outcomes oldest first and corrections newest first', () => {
    const decision = getDemoDecision(demoDecisionIdForKey('rewrite-billing'))!
    expect(decision.outcomes.map((outcome) => outcome.outcomeRating)).toEqual(['SLIGHTLY_WORSE', 'MUCH_WORSE'])
    expect(decision.corrections).toHaveLength(1)
  })
})

describe('getDemoCalibrationRecords', () => {
  it('returns every sealed demo decision with all outcomes', () => {
    const records = getDemoCalibrationRecords()
    expect(records).toHaveLength(24)
    expect(records.find((record) => record.id === demoDecisionIdForKey('northwind-offer'))!.outcomes).toHaveLength(2)
  })
})

describe('listDemoStrataRecords', () => {
  it('returns every matching demo decision oldest first, with all outcomes in date order', () => {
    const { records, total } = listDemoStrataRecords({})
    expect(total).toBe(24)
    expect(records).toHaveLength(24)
    expect(records.map((record) => record.createdAt.getTime())).toEqual([...records.map((record) => record.createdAt.getTime())].sort((a, b) => a - b))
    const northwind = records.find((record) => record.id === demoDecisionIdForKey('northwind-offer'))!
    expect(northwind.outcomes.map((outcome) => outcome.outcomeRating)).toEqual(['TOO_EARLY_TO_TELL', 'AS_EXPECTED'])
    expect(Object.keys(northwind).sort()).toEqual(['catalogNumber', 'createdAt', 'domainTag', 'id', 'outcomes', 'title'])
  })

  it('applies the archive filters', () => {
    const { records, total } = listDemoStrataRecords({ domain: 'HEALTH' })
    expect(records.length).toBeGreaterThan(0)
    expect(total).toBe(records.length)
    expect(records.every((record) => record.domainTag === 'HEALTH')).toBe(true)
  })
})
