import { describe, expect, it } from 'vitest'
import {
  authorizeDecisionPatch,
  buildFinalizeTimestamps,
  classifyDecisionPatch,
} from '@/lib/decision-patch'

const now = new Date('2026-11-09T12:00:00Z')
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)
const finalized = (createdAt: Date, extra = {}) => ({
  isDraft: false,
  isLocked: false,
  lockedAt: null,
  isImported: false,
  createdAt,
  ...extra,
})
const draft = (createdAt: Date) => ({ ...finalized(createdAt), isDraft: true })

describe('classifyDecisionPatch', () => {
  it('treats a lone supplementaryNotes key as notes', () => {
    expect(classifyDecisionPatch({ supplementaryNotes: 'x' }, { isDraft: false })).toBe('notes')
  })

  it('treats notes plus another field as core', () => {
    expect(classifyDecisionPatch({ supplementaryNotes: 'x', title: 'y' }, { isDraft: false })).toBe('core')
  })

  it('requires finalize to be boolean true', () => {
    expect(classifyDecisionPatch({ finalize: 'true' }, { isDraft: false })).toBe('core')
    expect(classifyDecisionPatch({ finalize: true }, { isDraft: false })).toBe('finalize')
  })

  it('treats non-finalize edits on a draft as draft saves', () => {
    expect(classifyDecisionPatch({ title: 'y' }, { isDraft: true })).toBe('draft')
  })
})

describe('authorizeDecisionPatch', () => {
  it('rejects finalize on a locked finalized decision with 409', () => {
    expect(authorizeDecisionPatch(finalized(minutesAgo(60)), 'finalize', now)).toEqual({
      ok: false,
      status: 409,
      error: 'This decision is already finalized.',
    })
  })

  it('rejects finalize on a finalized decision still inside the edit window', () => {
    expect(authorizeDecisionPatch(finalized(minutesAgo(1)), 'finalize', now).ok).toBe(false)
  })

  it('allows finalize on a draft', () => {
    expect(authorizeDecisionPatch(draft(minutesAgo(600)), 'finalize', now)).toEqual({ ok: true })
  })

  it('rejects core edits after the 5 minute window with 403', () => {
    expect(authorizeDecisionPatch(finalized(minutesAgo(6)), 'core', now)).toEqual({
      ok: false,
      status: 403,
      error: 'Record is locked. Only supplementary notes can be updated.',
    })
  })

  it('allows core edits inside the window', () => {
    expect(authorizeDecisionPatch(finalized(minutesAgo(1)), 'core', now)).toEqual({ ok: true })
  })

  it('allows core edits on imported records of any age', () => {
    expect(
      authorizeDecisionPatch(finalized(minutesAgo(525_600), { isImported: true }), 'core', now)
    ).toEqual({ ok: true })
  })

  it('allows notes on locked records', () => {
    expect(
      authorizeDecisionPatch(finalized(minutesAgo(60), { isLocked: true }), 'notes', now)
    ).toEqual({ ok: true })
  })
})

describe('buildFinalizeTimestamps', () => {
  it('moves the draft creation time into draftStartedAt and restarts createdAt', () => {
    const started = minutesAgo(3 * 24 * 60)
    expect(buildFinalizeTimestamps({ isDraft: true, createdAt: started }, now)).toEqual({
      createdAt: now,
      draftStartedAt: started,
    })
  })

  it('changes nothing for a non-draft', () => {
    expect(buildFinalizeTimestamps({ isDraft: false, createdAt: now }, now)).toEqual({})
  })
})
