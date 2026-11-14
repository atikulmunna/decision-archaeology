/** Counts the unit and component tests for the case study's numbers. Pure; scripts/count-tests.ts feeds it. */

// it(, test(, it.each(, it.only( and so on, but never obj.it( or words that merely end in it or test.
const TEST_CALL = /(?<![\w.$])(?:it|test)(?:\.(?:each|only))?\s*\(/g
const TEST_FILE = /\.test\.tsx?$/

export function countTestCases(source: string): number {
  return source.match(TEST_CALL)?.length ?? 0
}

export function summarizeTestFiles(files: Array<{ path: string; source: string }>): { files: number; cases: number } {
  const tests = files.filter((file) => TEST_FILE.test(file.path))
  return { files: tests.length, cases: tests.reduce((sum, file) => sum + countTestCases(file.source), 0) }
}
