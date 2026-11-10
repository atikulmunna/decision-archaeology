import { describe, expect, it } from 'vitest'
import { DomainTag } from '@prisma/client'
import { buildDemoArchive, demoDecisionId, demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_NOW, daysBefore } from '@/lib/demo/clock'
import { SPECIMEN_EXCERPT, SPECIMEN_KEY, SPECIMEN_SENTENCE } from '@/lib/demo/seed'
import { computeCalibrationScore, getClosedPredictedDecisions } from '@/lib/calibration'
import { isLikelyTypoCorrection } from '@/lib/corrections'
import { isRetroactiveSeal, verifySeal } from '@/lib/seal'

describe('buildDemoArchive', () => {
  it('builds 24 sealed records with stable ids and catalog numbers in creation order', () => {
    const archive = buildDemoArchive()
    expect(archive).toHaveLength(24)
    archive.forEach((decision, index) => {
      expect(decision.catalogNumber).toBe(index + 1)
      expect(decision.id).toBe(demoDecisionId(index + 1))
      expect(decision.isDraft).toBe(false)
      expect(decision.isLocked).toBe(true)
    })
    const times = archive.map((decision) => decision.createdAt.getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(demoDecisionId(7)).toBe('demo-0007')
  })

  it('seals every record five minutes after creation at midday UTC', () => {
    for (const decision of buildDemoArchive()) {
      expect(decision.createdAt.getUTCHours()).toBe(12)
      expect(decision.lockedAt!.getTime() - decision.createdAt.getTime()).toBe(5 * 60 * 1000)
    }
  })

  it('keeps every date within 18 months before DEMO_NOW and every follow-up after its decision', () => {
    for (const decision of buildDemoArchive()) {
      expect(decision.createdAt.getTime()).toBeGreaterThanOrEqual(daysBefore(DEMO_NOW, 548).getTime())
      expect(decision.createdAt.getTime()).toBeLessThan(DEMO_NOW.getTime())
      for (const followUp of [...decision.outcomes, ...decision.corrections]) {
        expect(followUp.createdAt.getTime()).toBeGreaterThan(decision.createdAt.getTime())
        expect(followUp.createdAt.getTime()).toBeLessThanOrEqual(DEMO_NOW.getTime())
      }
    }
  })

  it('covers what the demo pages need', () => {
    const archive = buildDemoArchive()
    const latest = archive.map((decision) => decision.outcomes.at(-1)?.outcomeRating)
    expect(latest.filter((rating) => rating && rating !== 'TOO_EARLY_TO_TELL')).toHaveLength(16)
    expect(latest.filter((rating) => rating === 'TOO_EARLY_TO_TELL')).toHaveLength(4)
    expect(latest.filter((rating) => !rating)).toHaveLength(4)
    expect(getClosedPredictedDecisions(archive)).toHaveLength(14)
    expect(computeCalibrationScore(archive)).toBe(71)
    expect(new Set(archive.map((decision) => decision.domainTag))).toEqual(new Set(Object.values(DomainTag)))
  })

  it('shows one approved typo correction and one rejected rewrite', () => {
    const corrections = buildDemoArchive().flatMap((decision) => decision.corrections)
    const approved = corrections.filter((correction) => correction.status === 'APPROVED')
    const rejected = corrections.filter((correction) => correction.status === 'REJECTED')
    expect(approved).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(isLikelyTypoCorrection(approved[0].originalText, approved[0].correctedText)).toBe(true)
    expect(isLikelyTypoCorrection(rejected[0].originalText, rejected[0].correctedText)).toBe(false)
  })

  it('makes the specimen decision match the landing card', () => {
    const specimen = buildDemoArchive().find((decision) => decision.id === demoDecisionIdForKey(SPECIMEN_KEY))!
    expect(specimen.title).toBe('Accept the senior role at Northwind?')
    expect(specimen.reasoning.startsWith(SPECIMEN_SENTENCE)).toBe(true)
    expect(SPECIMEN_SENTENCE).toContain(SPECIMEN_EXCERPT)
    expect([specimen.confidenceLevel, specimen.domainTag, specimen.outcomes.at(-1)?.outcomeRating]).toEqual([
      7,
      'CAREER',
      'AS_EXPECTED',
    ])
    expect(specimen.catalogNumber).toBe(7)
  })

  it('is deterministic', () => {
    expect(buildDemoArchive()).toEqual(buildDemoArchive())
  })

  it('seals every demo record so it verifies, and none is retroactive', async () => {
    for (const decision of buildDemoArchive()) {
      expect(decision.sealHash).toMatch(/^[0-9a-f]{64}$/)
      expect(await verifySeal(decision, decision.sealHash!)).toBe(true)
      expect(isRetroactiveSeal(decision)).toBe(false)
    }
  })
})
