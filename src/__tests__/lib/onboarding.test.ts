import { describe, expect, it } from 'vitest'
import {
  BIAS_REPORT_THRESHOLD,
  getMilestoneMessage,
  STARTER_DECISION_PROMPTS,
} from '@/lib/onboarding'

describe('STARTER_DECISION_PROMPTS', () => {
  it('covers all six decision domains', () => {
    expect(STARTER_DECISION_PROMPTS.map((prompt) => prompt.domain)).toEqual([
      'CAREER',
      'FINANCE',
      'HEALTH',
      'RELATIONSHIPS',
      'CREATIVE',
      'OTHER',
    ])
  })

  it('provides scaffold text for the required locked fields', () => {
    for (const prompt of STARTER_DECISION_PROMPTS) {
      expect(prompt.seed.title).toBeTruthy()
      expect(prompt.seed.summary).toBeTruthy()
      expect(prompt.seed.context).toBeTruthy()
      expect(prompt.seed.alternatives).toBeTruthy()
      expect(prompt.seed.chosenOption).toBeTruthy()
      expect(prompt.seed.reasoning).toBeTruthy()
    }
  })
})

describe('getMilestoneMessage', () => {
  it('returns no milestone below the first threshold', () => {
    expect(getMilestoneMessage(2)).toBeNull()
  })

  it('returns the 3-decision milestone when applicable', () => {
    expect(getMilestoneMessage(3)?.title).toContain('3 decisions')
  })

  it('returns the unlocked report message at the threshold', () => {
    expect(getMilestoneMessage(BIAS_REPORT_THRESHOLD)?.href).toBe('/ai/reports')
  })
})
