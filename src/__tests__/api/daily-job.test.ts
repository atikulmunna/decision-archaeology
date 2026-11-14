// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  db: {
    letter: { findMany: vi.fn(), updateMany: vi.fn() },
    checkInReminder: { findMany: vi.fn(), updateMany: vi.fn() },
  },
  send: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mocks.db }))
vi.mock('@/lib/observability', () => ({ logError: mocks.logError }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send }
  },
}))

import { GET as runDaily } from '@/app/api/jobs/daily/route'
import { checkInEmail, letterReadyEmail } from '@/lib/email/messages'

const { db, send } = mocks
const SECRET = 'a-long-cron-secret-value'
const run = (auth: string | null = `Bearer ${SECRET}`) =>
  runDaily(new NextRequest('http://localhost/api/jobs/daily', { headers: auth ? { authorization: auth } : {} }))
const decision = (id: string) => ({ title: `Decision ${id}`, catalogNumber: 7, user: { email: 'owner@example.com' } })

beforeEach(() => {
  for (const group of Object.values(db)) for (const fn of Object.values(group)) fn.mockReset()
  send.mockReset()
  vi.stubEnv('CRON_SECRET', SECRET)
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://da.example')
  db.letter.findMany.mockResolvedValue([])
  db.checkInReminder.findMany.mockResolvedValue([])
  db.letter.updateMany.mockResolvedValue({ count: 1 })
  db.checkInReminder.updateMany.mockResolvedValue({ count: 1 })
  send.mockResolvedValue({ data: { id: 'e1' }, error: null })
})

afterEach(() => vi.unstubAllEnvs())

describe('GET /api/jobs/daily', () => {
  it('refuses a missing or wrong bearer token, and an unset CRON_SECRET', async () => {
    expect((await run(null)).status).toBe(401)
    expect((await run('Bearer wrong')).status).toBe(401)
    vi.stubEnv('CRON_SECRET', '')
    expect((await run('Bearer ')).status).toBe(401)
    expect(db.letter.findMany).not.toHaveBeenCalled()
  })

  it('emails each opened letter once and marks it, without the letter text', async () => {
    db.letter.findMany.mockResolvedValue([{ id: 'l1', decisionId: 'd1', decision: decision('d1') }])
    const res = await run()
    expect(await res.json()).toEqual({ letters: { sent: 1, failed: 0 }, checkIns: { sent: 0, failed: 0 } })
    const query = db.letter.findMany.mock.calls[0][0]
    // A letter its owner already opened in the app is never announced.
    expect(query.where).toEqual({ opensAt: { lte: expect.any(Date) }, emailedAt: null, openedAt: null, decision: { isDraft: false } })
    expect(query.take).toBe(200)
    expect(JSON.stringify(query.select)).not.toContain('body')
    expect(db.letter.updateMany).toHaveBeenCalledWith({ where: { id: 'l1', emailedAt: null, openedAt: null }, data: { emailedAt: expect.any(Date) } })
    const sent = send.mock.calls[0][0]
    expect(sent.to).toBe('owner@example.com')
    expect(sent.html).toContain('https://da.example/decisions/d1/revisit')
  })

  it('emails each due check-in once', async () => {
    db.checkInReminder.findMany.mockResolvedValue([{ id: 'c1', decisionId: 'd2', decision: decision('d2') }])
    const res = await run()
    expect((await res.json()).checkIns).toEqual({ sent: 1, failed: 0 })
    expect(db.checkInReminder.findMany.mock.calls[0][0].where).toEqual({
      scheduledFor: { lte: expect.any(Date) },
      sentAt: null,
      completedAt: null,
      decision: { isDraft: false },
    })
    expect(db.checkInReminder.updateMany).toHaveBeenCalledWith({ where: { id: 'c1', sentAt: null }, data: { sentAt: expect.any(Date) } })
  })

  it('keeps going when one send fails and leaves it for tomorrow', async () => {
    db.letter.findMany.mockResolvedValue([
      { id: 'l1', decisionId: 'd1', decision: decision('d1') },
      { id: 'l2', decisionId: 'd2', decision: decision('d2') },
      { id: 'l3', decisionId: 'd3', decision: decision('d3') },
    ])
    send
      .mockResolvedValueOnce({ data: { id: 'e1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } })
      .mockRejectedValueOnce(new Error('network'))
    const res = await run()
    expect((await res.json()).letters).toEqual({ sent: 1, failed: 2 })
    // The two failures are un-marked so tomorrow's run tries them again.
    expect(db.letter.updateMany).toHaveBeenCalledWith({ where: { id: 'l2' }, data: { emailedAt: null } })
    expect(db.letter.updateMany).toHaveBeenCalledWith({ where: { id: 'l3' }, data: { emailedAt: null } })
    expect(db.letter.updateMany).not.toHaveBeenCalledWith({ where: { id: 'l1' }, data: { emailedAt: null } })
    // The reason is logged, with the kind and id only.
    expect(mocks.logError).toHaveBeenCalledWith('[daily] Letter email failed', expect.any(Error), { letterId: 'l2' })
    expect(mocks.logError).toHaveBeenCalledWith('[daily] Letter email failed', expect.any(Error), { letterId: 'l3' })
  })

  it('sends nothing twice when two runs overlap', async () => {
    db.letter.findMany.mockResolvedValue([{ id: 'l1', decisionId: 'd1', decision: decision('d1') }])
    db.letter.updateMany.mockResolvedValue({ count: 0 })
    const res = await run()
    expect((await res.json()).letters).toEqual({ sent: 0, failed: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  it('sends nothing and marks nothing without RESEND_API_KEY', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    db.letter.findMany.mockResolvedValue([{ id: 'l1', decisionId: 'd1', decision: decision('d1') }])
    const res = await run()
    expect(await res.json()).toEqual({ letters: { sent: 0, failed: 0 }, checkIns: { sent: 0, failed: 0 } })
    expect(db.letter.updateMany).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })
})

describe('email copy', () => {
  it('has no emoji and no em or en dashes, escapes the title, and links to the revisit', () => {
    const dash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)
    for (const email of [
      letterReadyEmail({ title: 'Move <here>?', catalog: 'DA-0007', revisitUrl: 'https://da.example/decisions/d1/revisit' }),
      checkInEmail({ title: 'Move <here>?', catalog: 'DA-0007', revisitUrl: 'https://da.example/decisions/d1/revisit' }),
    ]) {
      const all = `${email.subject} ${email.html} ${email.text}`
      expect(all).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(all).not.toMatch(dash)
      expect(email.html).toContain('Move &lt;here&gt;?')
      expect(email.html).not.toContain('<here>')
      expect(email.html).toContain('https://da.example/decisions/d1/revisit')
      expect(email.text).toContain('https://da.example/decisions/d1/revisit')
    }
  })
})
