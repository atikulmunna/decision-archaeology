import stats from '@/generated/test-stats.json'

/** Test files and cases, counted by scripts/count-tests.ts at install and build time. */
export const TEST_STATS: { files: number; cases: number } = stats
