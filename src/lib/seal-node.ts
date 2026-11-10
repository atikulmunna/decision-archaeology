import { createHash } from 'node:crypto'

/**
 * Synchronous SHA-256 for server code that cannot await, such as the demo
 * archive builder. Must agree with computeSealHash in seal.ts (a test checks).
 */
export function computeSealHashSync(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex')
}
