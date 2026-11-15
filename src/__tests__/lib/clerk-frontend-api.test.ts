import { describe, expect, it } from 'vitest'
import { clerkFrontendApiOrigin } from '@/lib/clerk-frontend-api'

const key = (prefix: string, decoded: string) => `${prefix}${Buffer.from(decoded).toString('base64')}`

describe('clerkFrontendApiOrigin', () => {
  it('decodes a development key to its Frontend API origin', () => {
    expect(clerkFrontendApiOrigin(key('pk_test_', 'faithful-lynx-85.clerk.accounts.dev$'))).toBe(
      'https://faithful-lynx-85.clerk.accounts.dev'
    )
  })

  it('decodes a production key on a custom domain', () => {
    expect(clerkFrontendApiOrigin(key('pk_live_', 'clerk.example.com$'))).toBe('https://clerk.example.com')
  })

  it('gives nothing for a missing or malformed key', () => {
    for (const value of [
      undefined,
      '',
      'pk_test_!!!',
      key('pk_test_', 'clerk.example.com'),
      key('pk_test_', 'clerk example.com$'),
      key('pk_test_', 'evil.com/path$'),
      key('sk_test_', 'clerk.example.com$'),
    ]) {
      expect(clerkFrontendApiOrigin(value), String(value)).toBeNull()
    }
  })
})
