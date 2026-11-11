import { describe, expect, it } from 'vitest'
import { formatDeliberation, formatElapsed } from '@/lib/elapsed'

const t = (iso: string) => new Date(iso)

describe('formatDeliberation', () => {
  it('phrases deliberation time', () => {
    expect(formatDeliberation(t('2025-08-15T11:59:30Z'), t('2025-08-15T12:00:00Z'))).toBe('under a minute')
    expect(formatDeliberation(t('2025-08-15T11:59:00Z'), t('2025-08-15T12:00:00Z'))).toBe('1 minute')
    expect(formatDeliberation(t('2025-08-15T11:15:00Z'), t('2025-08-15T12:00:00Z'))).toBe('45 minutes')
    expect(formatDeliberation(t('2025-08-15T11:00:00Z'), t('2025-08-15T12:00:00Z'))).toBe('1 hour')
    expect(formatDeliberation(t('2025-08-15T08:00:00Z'), t('2025-08-15T12:00:00Z'))).toBe('4 hours')
    expect(formatDeliberation(t('2025-08-13T12:00:00Z'), t('2025-08-15T12:00:00Z'))).toBe('2 days')
  })
})

describe('formatElapsed', () => {
  it('phrases elapsed time', () => {
    expect(formatElapsed(t('2026-11-10T08:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('today')
    expect(formatElapsed(t('2026-11-09T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('1 day')
    expect(formatElapsed(t('2026-09-20T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('51 days')
    expect(formatElapsed(t('2026-08-20T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('2 months')
    expect(formatElapsed(t('2025-08-15T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('14 months')
    expect(formatElapsed(t('2024-11-10T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('2 years')
    expect(formatElapsed(t('2024-05-19T12:00:00Z'), t('2026-11-10T12:00:00Z'))).toBe('2 years')
  })
})
