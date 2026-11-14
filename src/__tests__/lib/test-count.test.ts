import { describe, expect, it } from 'vitest'
import { countTestCases, summarizeTestFiles } from '@/lib/test-count'

describe('countTestCases', () => {
  it('counts it and test calls', () => {
    expect(countTestCases("it('a', () => {})\ntest('b', () => {})")).toBe(2)
  })

  it('counts a table test once', () => {
    expect(countTestCases("it.each([1, 2])('c %s', () => {})")).toBe(1)
  })

  it('ignores describe and words that merely end in it or test', () => {
    expect(countTestCases("describe('x', () => {}); split('a'); submit(); obj.it(); edit(1); commit()")).toBe(0)
  })
})

describe('summarizeTestFiles', () => {
  it('counts only test files', () => {
    expect(
      summarizeTestFiles([
        { path: 'a.test.ts', source: "it('a')" },
        { path: 'b.test.tsx', source: "it('b'); it('c')" },
        { path: 'setup.ts', source: "it('d')" },
      ])
    ).toEqual({ files: 2, cases: 3 })
  })
})
