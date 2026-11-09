import { Receiver } from '@upstash/qstash'

type Env = Record<string, string | undefined>

export type VerifiedJobBody<T> =
  | { ok: true; payload: T }
  | { ok: false; status: 400 | 401 | 503; error: string }

/**
 * Reads a background job request body, requiring a valid QStash signature.
 * Unsigned requests are accepted only outside production, for local development.
 */
export async function readVerifiedJobBody<T>(
  req: Request,
  env: Env = process.env
): Promise<VerifiedJobBody<T>> {
  const body = await req.text()
  const currentSigningKey = env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = env.QSTASH_NEXT_SIGNING_KEY

  if (currentSigningKey && nextSigningKey) {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey })
    const signature = req.headers.get('upstash-signature') ?? ''
    const isValid = await receiver.verify({ signature, body }).catch(() => false)
    if (!isValid) return { ok: false, status: 401, error: 'Invalid signature' }
  } else if (env.NODE_ENV === 'production') {
    return { ok: false, status: 503, error: 'Job signing is not configured.' }
  }

  try {
    return { ok: true, payload: JSON.parse(body) as T }
  } catch {
    return { ok: false, status: 400, error: 'Invalid job payload.' }
  }
}
