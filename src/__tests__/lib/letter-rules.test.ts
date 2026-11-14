import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { checkLetter, defaultOpensOn, letterFingerprint } from '@/lib/letter-rules'

describe('letter rules', () => {
  it('defaults to the predicted day when it is a month away, else six months out', () => {
    const today = new Date('2026-11-15T10:00:00Z')
    expect(defaultOpensOn('2027-03-01T00:00:00Z', today)).toBe('2027-03-01')
    expect(defaultOpensOn('2026-11-30T00:00:00Z', today)).toBe('2027-05-15')
    expect(defaultOpensOn(null, today)).toBe('2027-05-15')
  })

  it('checks the letter body and opening day, and treats a blank letter as none', () => {
    const sealed = new Date('2026-11-15T10:00:00Z')
    expect(checkLetter({ body: '  Dear me  ', opensOn: '2026-12-15' }, sealed)).toEqual({
      ok: true,
      letter: { body: 'Dear me', opensAt: new Date('2026-12-15T00:00:00Z') },
    })
    expect(checkLetter({ body: '   ', opensOn: '2026-12-15' }, sealed)).toEqual({ ok: true, letter: null })
    expect(checkLetter(null, sealed)).toEqual({ ok: true, letter: null })
    expect(checkLetter({ body: 'x'.repeat(5001), opensOn: '2026-12-15' }, sealed)).toEqual({ ok: false, error: 'Keep the letter under 5000 characters.' })
    expect(checkLetter({ body: 'Hi', opensOn: '2026-12-14' }, sealed)).toEqual({ ok: false, error: 'Pick an opening day at least a month away.' })
    expect(checkLetter({ body: 'Hi', opensOn: '2036-11-15' }, sealed)).toEqual({ ok: true, letter: { body: 'Hi', opensAt: new Date('2036-11-15T00:00:00Z') } })
    expect(checkLetter({ body: 'Hi', opensOn: '2036-11-16' }, sealed)).toEqual({ ok: false, error: 'Pick an opening day within ten years.' })
  })

  it('fingerprints the canonical text', async () => {
    expect(await letterFingerprint('a\r\nb')).toBe(await letterFingerprint('a\nb'))
    expect(await letterFingerprint('a')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('adds the letter, revisit and check-in tables with cascading keys, clearing orphan reminders first', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261115120000_letters_and_revisits/migration.sql'), 'utf8')
    expect(sql.indexOf('DELETE FROM "check_in_reminders"')).toBeGreaterThanOrEqual(0)
    expect(sql.indexOf('DELETE FROM "check_in_reminders"')).toBeLessThan(sql.indexOf('check_in_reminders_decisionId_fkey'))
    expect(sql).toContain('CREATE TABLE "letters"')
    expect(sql).toContain('CREATE TABLE "revisits"')
    expect(sql).toMatch(/"letters_decisionId_fkey" FOREIGN KEY \("decisionId"\) REFERENCES "decision_records"\("id"\) ON DELETE CASCADE/)
    expect(sql).toMatch(/"check_in_reminders_decisionId_fkey" FOREIGN KEY \("decisionId"\) REFERENCES "decision_records"\("id"\) ON DELETE CASCADE/)
  })
})
