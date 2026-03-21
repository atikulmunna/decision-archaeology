import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_LIMITS,
  buildAttachmentKey,
  canAddMoreAttachments,
  getAttachmentDisplayName,
  sanitizeAttachmentFilename,
  validateAttachment,
} from '@/lib/attachments'

describe('attachments helpers', () => {
  it('sanitizes attachment filenames', () => {
    expect(sanitizeAttachmentFilename('my report (final).pdf')).toBe('my_report__final_.pdf')
  })

  it('builds a decision-scoped attachment key', () => {
    const key = buildAttachmentKey('dec_123', 'report.pdf')
    expect(key).toContain('decisions/dec_123/')
    expect(key).toContain('report.pdf')
  })

  it('extracts the original display name from a key', () => {
    expect(getAttachmentDisplayName('decisions/dec_123/12345-report.pdf')).toBe('report.pdf')
  })

  it('accepts supported pdf attachments under the size limit', () => {
    expect(
      validateAttachment({
        name: 'report.pdf',
        size: ATTACHMENT_LIMITS.maxBytes,
        type: 'application/pdf',
      })
    ).toBeNull()
  })

  it('rejects unsupported attachment types', () => {
    expect(
      validateAttachment({
        name: 'notes.txt',
        size: 100,
        type: 'text/plain',
      })
    ).toBe('Only PDF and image attachments are supported.')
  })

  it('rejects oversized attachments', () => {
    expect(
      validateAttachment({
        name: 'large.pdf',
        size: ATTACHMENT_LIMITS.maxBytes + 1,
        type: 'application/pdf',
      })
    ).toBe('Each attachment must be 10MB or smaller.')
  })

  it('enforces the max attachment count', () => {
    expect(canAddMoreAttachments(4, 1)).toBe(true)
    expect(canAddMoreAttachments(5, 1)).toBe(false)
  })
})
