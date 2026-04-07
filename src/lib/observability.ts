import 'server-only'

type MetadataValue = string | number | boolean | null | undefined
type Metadata = Record<string, MetadataValue>

function toErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
    stack: undefined,
  }
}

function log(level: 'info' | 'error', message: string, metadata?: Metadata) {
  const payload = {
    level,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  }

  if (level === 'error') {
    console.error(JSON.stringify(payload))
  } else {
    console.info(JSON.stringify(payload))
  }
}

async function sendToAxiom(level: 'info' | 'error', message: string, metadata?: Metadata, error?: unknown) {
  const apiKey = process.env.AXIOM_API_KEY
  const dataset = process.env.AXIOM_DATASET

  if (!apiKey || !dataset) return

  const body = {
    events: [
      {
        level,
        message,
        metadata,
        error: error ? toErrorPayload(error) : undefined,
        app: 'decision-archaeology',
        timestamp: new Date().toISOString(),
      },
    ],
  }

  try {
    await fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (axiomError) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Failed to send log to Axiom',
      metadata: {
        originalMessage: message,
        axiomError: axiomError instanceof Error ? axiomError.message : String(axiomError),
      },
      timestamp: new Date().toISOString(),
    }))
  }
}

export async function logInfo(message: string, metadata?: Metadata) {
  log('info', message, metadata)
  await sendToAxiom('info', message, metadata)
}

export async function logError(message: string, error: unknown, metadata?: Metadata) {
  const payload = {
    ...metadata,
    ...toErrorPayload(error),
  }

  log('error', message, payload)
  await sendToAxiom('error', message, metadata, error)
}
