import { describe, expect, it } from 'vitest'
import {
  canTransitionCorrection,
  CorrectionRequestSchema,
  getCorrectionFieldLabel,
  isLikelyTypoCorrection,
} from '@/lib/corrections'

describe('CorrectionRequestSchema', () => {
  it('accepts a valid correction request payload', () => {
    const result = CorrectionRequestSchema.safeParse({
      fieldName: 'summary',
      correctedText: 'This is the corrected summary text.',
      reason: 'Fixed a spelling typo.',
    })

    expect(result.success).toBe(true)
  })

  it('rejects unsupported fields', () => {
    const result = CorrectionRequestSchema.safeParse({
      fieldName: 'title',
      correctedText: 'Updated title',
    })

    expect(result.success).toBe(false)
  })
})

describe('isLikelyTypoCorrection', () => {
  it('accepts small spelling edits', () => {
    expect(isLikelyTypoCorrection('Acme Corpp offered the role.', 'Acme Corp offered the role.')).toBe(true)
  })

  it('accepts punctuation-only edits', () => {
    expect(isLikelyTypoCorrection('Move fast and learn', 'Move fast, and learn.')).toBe(true)
  })

  it('rejects semantic rewrites', () => {
    expect(
      isLikelyTypoCorrection(
        'Take the role because it builds leadership experience.',
        'Reject the role because it will distract from family priorities.'
      )
    ).toBe(false)
  })
})

describe('getCorrectionFieldLabel', () => {
  it('returns a friendly label for known fields', () => {
    expect(getCorrectionFieldLabel('chosenOption')).toBe('Chosen Option')
  })
})

describe('isLikelyTypoCorrection hardening', () => {
  it('rejects removing a negation', () => {
    expect(isLikelyTypoCorrection('I will not take the offer', 'I will now take the offer')).toBe(false)
  })

  it('rejects adding a negation', () => {
    expect(isLikelyTypoCorrection('We can ship this month', "We can't ship this month")).toBe(false)
  })

  it('rejects changed numbers', () => {
    expect(isLikelyTypoCorrection('Offer is $50k base salary', 'Offer is $500k base salary')).toBe(false)
  })

  it('rejects swapping single-letter options', () => {
    expect(isLikelyTypoCorrection('Chose option A over option B', 'Chose option B over option A')).toBe(false)
  })

  it('rejects more than three changed words', () => {
    expect(isLikelyTypoCorrection('the quick brown fox jumps high', 'teh quik brwn foxx jumps high')).toBe(false)
  })

  it('accepts curly to straight quote fixes', () => {
    expect(isLikelyTypoCorrection('Acme’s offer was strong', "Acme's offer was strong")).toBe(true)
  })

  it('accepts capitalization fixes', () => {
    expect(isLikelyTypoCorrection('joined acme in march', 'joined Acme in March')).toBe(true)
  })
})

describe('canTransitionCorrection', () => {
  it('allows reviewing a pending correction', () => {
    expect(canTransitionCorrection('PENDING', 'APPROVED')).toBe(true)
    expect(canTransitionCorrection('PENDING', 'REJECTED')).toBe(true)
  })

  it('blocks changing a reviewed correction', () => {
    expect(canTransitionCorrection('REJECTED', 'APPROVED')).toBe(false)
    expect(canTransitionCorrection('APPROVED', 'PENDING')).toBe(false)
    expect(canTransitionCorrection('APPROVED', 'REJECTED')).toBe(false)
  })
})

describe('isLikelyTypoCorrection review fixes', () => {
  const longReasoning =
    'I chose the Northwind offer because the salary is higher, the commute is shorter, and the manager seemed supportive during every interview round. The team has shipped steadily for three years, the product has real customers, and the equity terms are fair compared with what similar startups are offering right now.'

  it('rejects removing one of two identical negations', () => {
    expect(
      isLikelyTypoCorrection(
        'I will not move cities and I will not take the offer',
        'I will not move cities and I will now take the offer'
      )
    ).toBe(false)
  })

  it('rejects adding a negation contraction written without an apostrophe', () => {
    expect(isLikelyTypoCorrection('We can ship this month', 'We cant ship this month')).toBe(false)
    expect(isLikelyTypoCorrection('I did call them back', 'I didnt call them back')).toBe(false)
  })

  it('rejects swapping several words when one word is also added', () => {
    const rewritten = longReasoning
      .replace('Northwind', 'Contoso')
      .replace('higher', 'lower')
      .replace('shorter', 'longer')
      .replace('seemed supportive during every', 'seemed indifferent during every single')
    expect(isLikelyTypoCorrection(longReasoning, rewritten)).toBe(false)
  })

  it('accepts removing a duplicated word', () => {
    expect(isLikelyTypoCorrection('We decided to to move in spring', 'We decided to move in spring')).toBe(true)
  })

  it('accepts adding the apostrophe to a contraction', () => {
    expect(isLikelyTypoCorrection('I dont want this role', "I don't want this role")).toBe(true)
  })
})
