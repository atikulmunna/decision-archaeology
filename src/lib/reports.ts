/**
 * A report that has been PENDING or RUNNING this long is treated as abandoned
 * (dispatch failed, or the job function was killed before it could record FAILED),
 * so it no longer blocks the user from starting a new one.
 */
export const REPORT_STALE_AFTER_MS = 10 * 60 * 1000

export const IN_PROGRESS_REPORT_STATUSES = ['PENDING', 'RUNNING'] as const

export const STALE_REPORT_MESSAGE = 'This report timed out before it finished. Please try again.'
export const DISPATCH_FAILED_MESSAGE = 'Could not start report generation. Please try again.'

export function isReportStale(
  report: { status: string; createdAt: Date },
  now = new Date()
): boolean {
  const inProgress = (IN_PROGRESS_REPORT_STATUSES as readonly string[]).includes(report.status)
  return inProgress && now.getTime() - report.createdAt.getTime() >= REPORT_STALE_AFTER_MS
}
