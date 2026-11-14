import 'server-only'
import { prisma } from '@/lib/prisma'

/**
 * Reading a letter to future you. This file is the only place (besides the draft routes) that reads a
 * letter's body, and it never returns the body before the letter's day, or before its owner opens it
 * when only peeking.
 */
import type { LetterPeek } from '@/lib/revisit-summary'

export type { LetterPeek } from '@/lib/revisit-summary'

const META = { opensAt: true, openedAt: true, sha256: true } as const

function readMeta(userId: string, decisionId: string) {
  return prisma.letter.findFirst({ where: { decisionId, decision: { userId, isDraft: false } }, select: META })
}

async function readBody(decisionId: string): Promise<string> {
  const row = await prisma.letter.findFirst({ where: { decisionId }, select: { body: true } })
  return row?.body ?? ''
}

/** The letter's state for a page, with no side effects. The body comes back only once the owner has opened it. */
export async function peekLetter(userId: string, decisionId: string, now: Date): Promise<LetterPeek> {
  const meta = await readMeta(userId, decisionId)
  if (!meta) return { state: 'none' }
  if (meta.opensAt.getTime() > now.getTime()) return { state: 'sealed', opensAt: meta.opensAt }
  if (!meta.openedAt) return { state: 'ready', opensAt: meta.opensAt }
  return { state: 'open', opensAt: meta.opensAt, openedAt: meta.openedAt, sha256: meta.sha256, body: await readBody(decisionId) }
}

/** Opens the letter on or after its day, marking it opened the first time; before the day it stays sealed. */
export async function openLetter(userId: string, decisionId: string, now: Date): Promise<LetterPeek> {
  const meta = await readMeta(userId, decisionId)
  if (!meta) return { state: 'none' }
  if (meta.opensAt.getTime() > now.getTime()) return { state: 'sealed', opensAt: meta.opensAt }
  let openedAt = meta.openedAt
  if (!openedAt) {
    await prisma.letter.updateMany({ where: { decisionId, openedAt: null }, data: { openedAt: now } })
    openedAt = now
  }
  return { state: 'open', opensAt: meta.opensAt, openedAt, sha256: meta.sha256, body: await readBody(decisionId) }
}
