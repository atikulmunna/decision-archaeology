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

/** Reviews are one-way: only a pending correction can be approved or rejected. */
export function canTransitionCorrection(from: CorrectionStatus, to: CorrectionStatus): boolean {
  return from === 'PENDING' && (to === 'APPROVED' || to === 'REJECTED')
}

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

const NEGATIONS = new Set(['not', 'no', 'never', 'none', 'nor', 'cannot', 'without'])
const MAX_CHANGED_WORDS = 3
const MAX_WORD_EDIT_DISTANCE = 2

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
}

/** Lowercased words with leading and trailing punctuation removed. */
function toComparableWords(text: string): string[] {
  return normalizeForComparison(text)
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
}

function negationSet(words: string[]): string {
  const negations = words.filter((word) => NEGATIONS.has(word) || word.endsWith("n't"))
  return [...new Set(negations)].sort().join(' ')
}

function numericTokens(words: string[]): string {
  return words
    .filter((word) => /\d/.test(word))
    .map((word) => word.replace(/[$,%]/g, ''))
    .sort()
    .join(' ')
}

function hasOnlyTypoLevelWordChanges(originalWords: string[], correctedWords: string[]): boolean {
  let changed = 0
  for (let i = 0; i < originalWords.length; i += 1) {
    const before = originalWords[i]
    const after = correctedWords[i]
    if (before === after) continue

    changed += 1
    if (changed > MAX_CHANGED_WORDS) return false

    const distance = levenshteinDistance(before, after)
    if (distance > MAX_WORD_EDIT_DISTANCE) return false
    if (distance >= Math.min(before.length, after.length)) return false
  }
  return true
}

export function isLikelyTypoCorrection(originalText: string, correctedText: string): boolean {
  const original = originalText.trim()
  const corrected = correctedText.trim()

  // Compare raw text here so quote-only and case-only fixes still count as a change.
  if (!original || !corrected || original === corrected) return false

  const originalWords = original.split(/\s+/)
  const correctedWords = corrected.split(/\s+/)
  if (Math.abs(originalWords.length - correctedWords.length) > 1) return false

  const originalComparable = toComparableWords(original)
  const correctedComparable = toComparableWords(corrected)
  if (negationSet(originalComparable) !== negationSet(correctedComparable)) return false
  if (numericTokens(originalComparable) !== numericTokens(correctedComparable)) return false
  if (
    originalComparable.length === correctedComparable.length &&
    !hasOnlyTypoLevelWordChanges(originalComparable, correctedComparable)
  ) {
    return false
  }

  const distance = levenshteinDistance(original.toLowerCase(), corrected.toLowerCase())
  const maxDistance = Math.max(12, Math.floor(original.length * 0.2))

  return distance <= maxDistance
}

export function getCorrectableFieldValue(record: DecisionRecord, fieldName: CorrectionField): string {
  return record[fieldName] ?? ''
}
