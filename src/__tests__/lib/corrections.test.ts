import { describe, expect, it } from 'vitest'
import {
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
