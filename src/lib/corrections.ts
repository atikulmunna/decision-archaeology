import { z } from 'zod'
import type { CorrectionRequest, DecisionRecord } from '@prisma/client'

export const CORRECTION_FIELDS = [
  { key: 'summary', label: 'Decision Summary' },
  { key: 'context', label: 'Context' },
  { key: 'alternatives', label: 'Alternatives Considered' },
  { key: 'chosenOption', label: 'Chosen Option' },
  { key: 'reasoning', label: 'Reasoning' },
] as const

export type CorrectionField = (typeof CORRECTION_FIELDS)[number]['key']
export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const CorrectionRequestSchema = z.object({
  fieldName: z.enum(CORRECTION_FIELDS.map((field) => field.key) as [CorrectionField, ...CorrectionField[]]),
  correctedText: z
    .string()
    .trim()
    .min(1, 'Corrected text is required.')
    .max(5000, 'Correction text is too long.'),
  reason: z
    .string()
    .trim()
    .max(500, 'Reason must be 500 characters or fewer.')
    .optional()
    .transform((value) => value || undefined),
})

export const CorrectionStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
})

export function getCorrectionFieldLabel(fieldName: string): string {
  return CORRECTION_FIELDS.find((field) => field.key === fieldName)?.label ?? fieldName
}

export function getLatestApprovedCorrection(
  corrections: CorrectionRequest[],
  fieldName: string
) {
  return corrections.find((correction) => correction.fieldName === fieldName && correction.status === 'APPROVED') ?? null
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[rows - 1][cols - 1]
}

export function isLikelyTypoCorrection(originalText: string, correctedText: string): boolean {
  const original = originalText.trim()
  const corrected = correctedText.trim()

  if (!original || !corrected || original === corrected) return false

  const originalWords = original.split(/\s+/)
  const correctedWords = corrected.split(/\s+/)
  if (Math.abs(originalWords.length - correctedWords.length) > 1) return false

  const distance = levenshteinDistance(original.toLowerCase(), corrected.toLowerCase())
  const maxDistance = Math.max(12, Math.floor(original.length * 0.2))

  return distance <= maxDistance
}

export function getCorrectableFieldValue(record: DecisionRecord, fieldName: CorrectionField): string {
  return record[fieldName] ?? ''
}
