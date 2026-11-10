import { describe, expect, it } from 'vitest'
import { tamperReasoning } from '@/lib/tamper'

describe('tamperReasoning', () => {
  it('swaps the earliest listed word, preserving case', () => {
    expect(tamperReasoning('The team is as strong as it seemed, with more people.')).toEqual({
      text: 'The team is as weak as it seemed, with more people.',
      start: 15,
      end: 19,
    })
    expect(tamperReasoning('Better late than never.')).toEqual({ text: 'Worse late than never.', start: 0, end: 5 })
    expect(tamperReasoning('A risky bet, but less risky than staying.').text).toBe('A safe bet, but less risky than staying.')
  })

  it('matches whole words only and otherwise appends a denial', () => {
    expect(tamperReasoning('It was a stronghold.')).toEqual({
      text: 'It was a stronghold. Not really.',
      start: 21,
      end: 32,
    })
  })
})
