import type { ChallengeOutcome, DecisionRecord } from '@prisma/client'
import { formatCatalogNumber } from '@/lib/catalog'
import { getDecisionLockDeadline } from '@/lib/locks'

/**
 * The Seal: a SHA-256 fingerprint of everything that locks on a decision.
 * This module runs unchanged on the server (which stamps the seal) and in the
 * browser (which verifies it), so both sides hash exactly the same payload.
 */

export const SEAL_VERSION = 'da-seal-v1'
/** Records with forecasts seal them too; records without keep the v1 payload byte for byte. */
export const SEAL_VERSION_V2 = 'da-seal-v2'
/** Records that went through the Devil's Advocate step seal its outcome, questions and answers (with forecasts, possibly none). */
export const SEAL_VERSION_V3 = 'da-seal-v3'

/** The parts of a forecast that lock with the decision. Resolutions stay open and are never sealed. */
export type SealForecast = { position: number; statement: string; probability: number; resolveBy: Date }

/** A question asked before sealing and its answer (null: left unanswered). */
export type SealChallengeQuestion = { position: number; question: string; answer: string | null }

export type SealableDecision = Pick<
  DecisionRecord,
  | 'catalogNumber'
  | 'createdAt'
  | 'title'
  | 'summary'
  | 'context'
  | 'alternatives'
  | 'chosenOption'
  | 'reasoning'
  | 'values'
  | 'uncertainties'
  | 'predictedOutcome'
  | 'predictedTimeframe'
  | 'confidenceLevel'
  | 'domainTag'
  | 'customTags'
> & {
  forecasts?: SealForecast[]
  challengeOutcome?: ChallengeOutcome | null
  challengeModel?: string | null
  challengeQuestions?: SealChallengeQuestion[]
}

/** Same words, same bytes: Unicode NFC, and CRLF or lone CR line endings become LF. */
export function canonicalText(value: string): string {
  return value.normalize('NFC').replace(/\r\n?/g, '\n')
}

function canonicalOptional(value: string | null | undefined): string | null {
  return value === null || value === undefined ? null : canonicalText(value)
}

export function sealVersion(record: SealableDecision): string {
  if (record.challengeOutcome) return SEAL_VERSION_V3
  return record.forecasts && record.forecasts.length > 0 ? SEAL_VERSION_V2 : SEAL_VERSION
}

/** The exact text that gets hashed: pretty-printed JSON in a fixed key order, no trailing newline. */
export function buildSealPayload(record: SealableDecision): string {
  const version = sealVersion(record)
  const ordered = {
    seal: version,
    catalogNumber: record.catalogNumber ?? null,
    finalizedAt: new Date(record.createdAt).toISOString(),
    title: canonicalText(record.title),
    summary: canonicalText(record.summary),
    context: canonicalText(record.context),
    alternatives: canonicalText(record.alternatives),
    chosenOption: canonicalText(record.chosenOption),
    reasoning: canonicalText(record.reasoning),
    values: canonicalOptional(record.values),
    uncertainties: canonicalOptional(record.uncertainties),
    predictedOutcome: canonicalOptional(record.predictedOutcome),
    predictedTimeframe: record.predictedTimeframe ? new Date(record.predictedTimeframe).toISOString() : null,
    confidenceLevel: record.confidenceLevel ?? null,
    domainTag: record.domainTag ?? null,
    customTags: (record.customTags ?? []).map(canonicalText),
  }
  if (version === SEAL_VERSION) return JSON.stringify(ordered, null, 2)
  const forecasts = [...(record.forecasts ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((forecast) => ({
      statement: canonicalText(forecast.statement),
      probability: forecast.probability,
      resolveBy: new Date(forecast.resolveBy).toISOString(),
    }))
  if (version === SEAL_VERSION_V2) return JSON.stringify({ ...ordered, forecasts }, null, 2)
  const challenge = {
    outcome: record.challengeOutcome!.toLowerCase(),
    model: record.challengeModel ?? null,
    questions: [...(record.challengeQuestions ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ question: canonicalText(item.question), answer: canonicalOptional(item.answer) })),
  }
  return JSON.stringify({ ...ordered, forecasts, challenge }, null, 2)
}

function toSealChallengeQuestion(item: SealChallengeQuestion): SealChallengeQuestion {
  return { position: item.position, question: item.question, answer: item.answer }
}

function toSealForecast(forecast: SealForecast): SealForecast {
  return {
    position: forecast.position,
    statement: forecast.statement,
    probability: forecast.probability,
    resolveBy: forecast.resolveBy,
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 of the payload's UTF-8 bytes via Web Crypto, as lowercase hex. */
export async function computeSealHash(payload: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return toHex(digest)
}

export async function verifySeal(record: SealableDecision, expectedHash: string): Promise<boolean> {
  return (await computeSealHash(buildSealPayload(record))) === expectedHash
}

/** The values a write spreads into its data so the stored seal covers what it stores. */
export async function sealFields(record: SealableDecision, now: Date): Promise<{ sealHash: string; sealedAt: Date }> {
  return { sealHash: await computeSealHash(buildSealPayload(record)), sealedAt: now }
}

/** What the seal panel needs: the sealed fields plus the seal and lock state, and nothing else. */
export type SealRecord = SealableDecision & {
  sealHash: string | null
  sealedAt: Date | null
  isImported: boolean
  isLocked: boolean
}

/** Picks only the SealRecord fields, so a client component never receives the rest of a decision. */
export function toSealRecord(record: SealRecord): SealRecord {
  return {
    catalogNumber: record.catalogNumber,
    createdAt: record.createdAt,
    title: record.title,
    summary: record.summary,
    context: record.context,
    alternatives: record.alternatives,
    chosenOption: record.chosenOption,
    reasoning: record.reasoning,
    values: record.values,
    uncertainties: record.uncertainties,
    predictedOutcome: record.predictedOutcome,
    predictedTimeframe: record.predictedTimeframe,
    confidenceLevel: record.confidenceLevel,
    domainTag: record.domainTag,
    customTags: record.customTags,
    ...(record.forecasts ? { forecasts: record.forecasts.map(toSealForecast) } : {}),
    challengeOutcome: record.challengeOutcome ?? null,
    challengeModel: record.challengeModel ?? null,
    ...(record.challengeQuestions ? { challengeQuestions: record.challengeQuestions.map(toSealChallengeQuestion) } : {}),
    sealHash: record.sealHash,
    sealedAt: record.sealedAt,
    isImported: record.isImported,
    isLocked: record.isLocked,
  }
}

type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> }

type Created<T> = { [K in keyof T]: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K] }

/** A Prisma create stores omitted optional fields as null: the record the create produces. */
export function asCreated<T extends object>(data: T): Created<T> {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])) as Created<T>
}

/** A Prisma update leaves undefined fields unchanged: the record the update produces. */
export function afterUpdate<R extends object, U extends object>(record: R, data: U): R & Defined<U> {
  const set = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
  return { ...record, ...set } as R & Defined<U>
}

/** A seal computed after the record locked (the backfill) cannot vouch for the wording at finalization. */
export function isRetroactiveSeal(record: { sealedAt: Date | null; createdAt: Date }): boolean {
  if (!record.sealedAt) return false
  return new Date(record.sealedAt).getTime() > getDecisionLockDeadline({ createdAt: new Date(record.createdAt) }).getTime()
}

export function shortSealHash(hash: string): string {
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`
}

export function sealFileName(catalogNumber: number | null): string {
  return catalogNumber === null ? 'decision-seal.json' : `${formatCatalogNumber(catalogNumber)}-seal.json`
}
