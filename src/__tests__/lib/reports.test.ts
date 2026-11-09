import { describe, expect, it } from 'vitest'
import { isReportStale, REPORT_STALE_AFTER_MS } from '@/lib/reports'

const now = new Date('2026-11-09T12:00:00Z')
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)

describe('isReportStale', () => {
  it('uses a 10 minute window', () => {
    expect(REPORT_STALE_AFTER_MS).toBe(10 * 60 * 1000)
  })

  it('treats a pending or running report older than the window as stale', () => {
    expect(isReportStale({ status: 'PENDING', createdAt: minutesAgo(11) }, now)).toBe(true)
    expect(isReportStale({ status: 'RUNNING', createdAt: minutesAgo(10) }, now)).toBe(true)
  })

  it('keeps a recent in-progress report active', () => {
    expect(isReportStale({ status: 'RUNNING', createdAt: minutesAgo(2) }, now)).toBe(false)
  })

  it('never treats a finished report as stale', () => {
    expect(isReportStale({ status: 'COMPLETE', createdAt: minutesAgo(10_000) }, now)).toBe(false)
    expect(isReportStale({ status: 'FAILED', createdAt: minutesAgo(10_000) }, now)).toBe(false)
  })
})
