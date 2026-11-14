import { z } from 'zod'

/**
 * Single AI entry point: OpenRouter's Auto Router picks a model per request.
 * Every call asks for a strict JSON Schema reply, validates it with Zod, and
 * retries once with the validation problems if the reply does not match.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const AUTO_ROUTER_MODEL = 'openrouter/auto'
const DEFAULT_COST_TIER: CostTier = 'medium'
const DEFAULT_MAX_TOKENS = 4096
const REQUEST_TIMEOUT_MS = 90_000

export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type CostTier = 'low' | 'medium' | 'high'

type Env = Record<string, string | undefined>

export class OpenRouterError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

type JsonObject = Record<string, unknown>

function enforceStrictObjects(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(enforceStrictObjects)
  if (!node || typeof node !== 'object') return node

  const result: JsonObject = {}
  for (const [key, value] of Object.entries(node as JsonObject)) {
    result[key] = enforceStrictObjects(value)
  }
  if (result.type === 'object' && result.properties && typeof result.properties === 'object') {
    result.additionalProperties = false
    result.required = Object.keys(result.properties as JsonObject)
  }
  return result
}

/** Zod schema to the JSON Schema subset that strict structured outputs accept. */
export function toStrictJsonSchema(schema: z.ZodType): JsonObject {
  const jsonSchema = { ...(z.toJSONSchema(schema) as JsonObject) }
  delete jsonSchema.$schema
  return enforceStrictObjects(jsonSchema) as JsonObject
}

function parseAllowedModels(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
}

type ChatCompletion = {
  model?: string
  choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>
}

type ParseOutcome<T> = { ok: true; data: T } | { ok: false; problems: string; raw: string }

function parseReply<T>(completion: ChatCompletion, schema: z.ZodType<T>): ParseOutcome<T> {
  const content = completion.choices?.[0]?.message?.content
  const raw = typeof content === 'string' ? content : ''

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    return {
      ok: false,
      raw,
      problems: `the reply was not valid JSON (${(error as Error).message})`,
    }
  }

  const parsed = schema.safeParse(json)
  if (parsed.success) return { ok: true, data: parsed.data }
  const problems = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  return { ok: false, raw, problems }
}

export async function generateStructured<T>(opts: {
  messages: AIMessage[]
  schema: z.ZodType<T>
  schemaName: string
  costTier?: CostTier
  maxTokens?: number
  fetchImpl?: typeof fetch
  env?: Env
  /** The whole call, repair included, must finish within this; the repair is skipped when no time remains. */
  timeoutMs?: number
  now?: () => number
}): Promise<{ data: T; model: string }> {
  const env = opts.env ?? process.env
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? Date.now
  // With timeoutMs the whole call, repair included, shares one deadline. Without it each request keeps
  // its own 90 second limit, as callers that predate the option expect.
  const overall = opts.timeoutMs !== undefined
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  const deadline = overall ? now() + timeoutMs : Number.POSITIVE_INFINITY
  const timedOut = () => new OpenRouterError(408, `OpenRouter request timed out after ${timeoutMs / 1000} seconds`)
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const autoRouter: JsonObject = {
    id: 'auto-router',
    cost_tier:
      opts.costTier ?? (env.OPENROUTER_COST_TIER as CostTier | undefined) ?? DEFAULT_COST_TIER,
  }
  const allowedModels = parseAllowedModels(env.OPENROUTER_ALLOWED_MODELS)
  if (allowedModels.length > 0) autoRouter.allowed_models = allowedModels

  const jsonSchema = toStrictJsonSchema(opts.schema)

  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS

  async function send(messages: AIMessage[]): Promise<Response> {
    try {
      return await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(overall ? Math.max(1, deadline - now()) : REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'Decision Archaeology',
        },
        body: JSON.stringify({
          model: AUTO_ROUTER_MODEL,
          messages,
          max_tokens: maxTokens,
          response_format: {
            type: 'json_schema',
            json_schema: { name: opts.schemaName, strict: true, schema: jsonSchema },
          },
          provider: { require_parameters: true },
          plugins: [autoRouter, { id: 'response-healing' }],
        }),
      })
    } catch (error) {
      // AbortSignal.timeout rejects with a DOMException named TimeoutError
      if ((error as { name?: unknown } | null)?.name === 'TimeoutError') {
        throw timedOut()
      }
      throw error
    }
  }

  async function request(messages: AIMessage[]): Promise<ChatCompletion> {
    const response = await send(messages)

    const payload = (await response.json().catch(() => ({}))) as ChatCompletion & {
      error?: { message?: string }
    }
    if (!response.ok) {
      const reason = payload.error?.message ?? response.statusText
      throw new OpenRouterError(
        response.status,
        `OpenRouter request failed (${response.status}): ${reason}`
      )
    }
    // Truncated output cannot be healed or repaired; say so instead of retrying.
    if (payload.choices?.[0]?.finish_reason === 'length') {
      throw new Error(
        `OpenRouter reply for ${opts.schemaName} was truncated at ${maxTokens} tokens`
      )
    }
    return payload
  }

  const first = await request(opts.messages)
  const firstOutcome = parseReply(first, opts.schema)
  if (firstOutcome.ok) return { data: firstOutcome.data, model: first.model ?? AUTO_ROUTER_MODEL }

  if (overall && deadline - now() <= 0) throw timedOut()
  const repair = await request([
    ...opts.messages,
    { role: 'assistant', content: firstOutcome.raw },
    {
      role: 'user',
      content: `Your previous reply did not match the required JSON schema. Problems: ${firstOutcome.problems}. Reply again with only JSON that matches the schema.`,
    },
  ])
  const repairOutcome = parseReply(repair, opts.schema)
  if (repairOutcome.ok)
    return { data: repairOutcome.data, model: repair.model ?? AUTO_ROUTER_MODEL }

  throw new Error(`OpenRouter returned invalid structured output for ${opts.schemaName}`)
}
