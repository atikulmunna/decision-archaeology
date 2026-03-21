const MAX_ATTACHMENTS = 5
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export type AttachmentSummary = {
  key: string
  name: string
  url?: string
}

export function sanitizeAttachmentFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function buildAttachmentKey(decisionId: string, filename: string): string {
  const safeFilename = sanitizeAttachmentFilename(filename)
  return `decisions/${decisionId}/${Date.now()}-${safeFilename}`
}

export function getAttachmentDisplayName(key: string): string {
  const lastSegment = key.split('/').pop() ?? key
  const separatorIndex = lastSegment.indexOf('-')
  return separatorIndex >= 0 ? lastSegment.slice(separatorIndex + 1) : lastSegment
}

export function validateAttachment(file: Pick<File, 'size' | 'type' | 'name'>) {
  if (!file.name.trim()) {
    return 'Attachment must have a file name.'
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return 'Only PDF and image attachments are supported.'
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return 'Each attachment must be 10MB or smaller.'
  }

  return null
}

export function canAddMoreAttachments(existingCount: number, incomingCount = 1) {
  return existingCount + incomingCount <= MAX_ATTACHMENTS
}

export const ATTACHMENT_LIMITS = {
  maxAttachments: MAX_ATTACHMENTS,
  maxBytes: MAX_ATTACHMENT_SIZE_BYTES,
}
