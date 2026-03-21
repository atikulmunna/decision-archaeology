import { describe, it, expect } from 'vitest'
import { CreateDecisionSchema, DraftDecisionSchema, FinalizeDecisionSchema } from '@/lib/validations/decision'

const VALID_PAYLOAD = {
  title: 'Should I accept the senior role at Acme Corp?',
  summary: 'Deciding whether to take a senior engineering role at Acme Corp after 3 years at current company.',
  context: 'I have been offered a 30% salary increase, new tech stack, but a longer commute and more responsibility.',
  alternatives: 'Option 1: Stay at current company. Option 2: Accept Acme offer. Option 3: Negotiate at current role.',
  chosenOption: 'Accept the Acme Corp senior engineering role starting next month.',
  reasoning: 'The salary increase covers the commute cost, the new stack aligns with my 5-year skill goals, and the senior title opens doors.',
  confidenceLevel: 7,
  domainTag: 'CAREER' as const,
  customTags: ['career', 'money'],
}

describe('CreateDecisionSchema', () => {
  it('accepts a valid complete payload', () => {
    const result = CreateDecisionSchema.safeParse(VALID_PAYLOAD)
    expect(result.success).toBe(true)
  })

  it('rejects title shorter than 20 characters', () => {
    const result = CreateDecisionSchema.safeParse({ ...VALID_PAYLOAD, title: 'Too short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('title')
  })

  it('rejects summary shorter than 20 characters', () => {
    const result = CreateDecisionSchema.safeParse({ ...VALID_PAYLOAD, summary: 'Short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('summary')
  })

  it('rejects confidenceLevel below 1', () => {
    const result = CreateDecisionSchema.safeParse({ ...VALID_PAYLOAD, confidenceLevel: 0 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('confidenceLevel')
  })

  it('rejects confidenceLevel above 10', () => {
    const result = CreateDecisionSchema.safeParse({ ...VALID_PAYLOAD, confidenceLevel: 11 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('confidenceLevel')
  })

  it('rejects more than 5 custom tags', () => {
    const result = CreateDecisionSchema.safeParse({
      ...VALID_PAYLOAD,
      customTags: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('customTags')
  })

  it('defaults customTags to empty array when omitted', () => {
    const { customTags, ...rest } = VALID_PAYLOAD
    void customTags
    const result = CreateDecisionSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customTags).toEqual([])
  })

  it('accepts optional fields as undefined', () => {
    const minimal = {
      title: VALID_PAYLOAD.title,
      summary: VALID_PAYLOAD.summary,
      context: VALID_PAYLOAD.context,
      alternatives: VALID_PAYLOAD.alternatives,
      chosenOption: VALID_PAYLOAD.chosenOption,
      reasoning: VALID_PAYLOAD.reasoning,
    }
    const result = CreateDecisionSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('rejects invalid domainTag', () => {
    const result = CreateDecisionSchema.safeParse({ ...VALID_PAYLOAD, domainTag: 'SPORTS' })
    expect(result.success).toBe(false)
  })
})

describe('DraftDecisionSchema', () => {
  it('accepts a partial draft payload', () => {
    const result = DraftDecisionSchema.safeParse({
      title: 'Short',
      summary: 'Still thinking',
    })
    expect(result.success).toBe(true)
  })

  it('still enforces confidence range for drafts', () => {
    const result = DraftDecisionSchema.safeParse({
      confidenceLevel: 12,
    })
    expect(result.success).toBe(false)
  })
})

describe('FinalizeDecisionSchema', () => {
  it('requires finalize to be true', () => {
    const result = FinalizeDecisionSchema.safeParse({
      ...VALID_PAYLOAD,
      finalize: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects incomplete finalize payloads', () => {
    const result = FinalizeDecisionSchema.safeParse({
      title: VALID_PAYLOAD.title,
      finalize: true,
    })
    expect(result.success).toBe(false)
  })
})
