/**
 * The origin of Clerk's Frontend API, decoded from the publishable key ("pk_test_" or "pk_live_" plus the base64
 * of "host$"). The auth pages preconnect to it so Clerk's code starts downloading sooner. Pure.
 */

const KEY = /^pk_(?:test|live)_(.+)$/
const HOST = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i

export function clerkFrontendApiOrigin(publishableKey: string | undefined): string | null {
  const match = publishableKey ? KEY.exec(publishableKey) : null
  if (!match) return null
  let decoded: string
  try {
    decoded = atob(match[1])
  } catch {
    return null
  }
  if (!decoded.endsWith('$')) return null
  const host = decoded.slice(0, -1)
  return HOST.test(host) ? `https://${host}` : null
}
