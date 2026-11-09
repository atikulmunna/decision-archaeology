import { beforeEach, describe, expect, it, vi } from 'vitest'

const verifyMock = vi.fn()

vi.mock('@upstash/qstash', () => ({
  Receiver: class {
    verify = verifyMock
  },
}))

import { readVerifiedJobBody } from '@/lib/jobs'

const req = (body: string, sig = 'sig') =>
  new Request('http://x/api/jobs/generate-report', {
    method: 'POST',
    body,
    headers: { 'upstash-signature': sig },
  })
const keys = { QSTASH_CURRENT_SIGNING_KEY: 'a', QSTASH_NEXT_SIGNING_KEY: 'b' }

describe('readVerifiedJobBody', () => {
  beforeEach(() => {
    verifyMock.mockReset()
  })

  it('refuses unsigned jobs in production', async () => {
    expect(await readVerifiedJobBody(req('{}'), { NODE_ENV: 'production' })).toEqual({
      ok: false,
      status: 503,
      error: 'Job signing is not configured.',
    })
  })

  it('accepts unsigned jobs in development', async () => {
    expect(await readVerifiedJobBody(req('{"reportId":"r1"}'), { NODE_ENV: 'development' })).toEqual({
      ok: true,
      payload: { reportId: 'r1' },
    })
  })

  it('rejects a bad signature', async () => {
    verifyMock.mockResolvedValue(false)
    expect(await readVerifiedJobBody(req('{}'), { ...keys, NODE_ENV: 'production' })).toEqual({
      ok: false,
      status: 401,
      error: 'Invalid signature',
    })
  })

  it('treats a throwing verifier as a bad signature', async () => {
    verifyMock.mockRejectedValue(new Error('bad'))
    expect((await readVerifiedJobBody(req('{}'), { ...keys, NODE_ENV: 'production' })).ok).toBe(false)
  })

  it('accepts a valid signature', async () => {
    verifyMock.mockResolvedValue(true)
    expect(
      await readVerifiedJobBody(req('{"reportId":"r1"}'), { ...keys, NODE_ENV: 'production' })
    ).toEqual({ ok: true, payload: { reportId: 'r1' } })
    expect(verifyMock).toHaveBeenCalledWith({ signature: 'sig', body: '{"reportId":"r1"}' })
  })

  it('rejects malformed JSON', async () => {
    expect(await readVerifiedJobBody(req('not json'), { NODE_ENV: 'development' })).toEqual({
      ok: false,
      status: 400,
      error: 'Invalid job payload.',
    })
  })
})
