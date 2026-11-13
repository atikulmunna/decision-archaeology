import { describe, expect, it, vi, type Mock } from 'vitest'
import { z } from 'zod'
import { generateStructured, OpenRouterError, toStrictJsonSchema } from '@/lib/ai'

type StrictSchemaNode = {
  additionalProperties?: boolean
  required?: string[]
  properties: Record<string, StrictSchemaNode>
}

const Schema = z.object({ answer: z.string(), score: z.number().nullable() })
const env = { OPENROUTER_API_KEY: 'k', NEXT_PUBLIC_APP_URL: 'https://da.example' }

function okReply(content: unknown, model = 'anthropic/claude-sonnet-4.5') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ model, choices: [{ message: { content: JSON.stringify(content) } }] }),
  }
}

const bodyOf = (f: Mock, call = 0) => JSON.parse(f.mock.calls[call][1].body)

describe('generateStructured', () => {
  it('sends the auto router request with the given cost tier', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({
      messages: [{ role: 'user', content: 'q' }],
      schema: Schema,
      schemaName: 'probe',
      costTier: 'low',
      fetchImpl: f,
      env,
    })
    const body = bodyOf(f)
    expect(f.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(body.model).toBe('openrouter/auto')
    expect(body.plugins).toEqual([{ id: 'auto-router', cost_tier: 'low' }, { id: 'response-healing' }])
    expect(body.provider).toEqual({ require_parameters: true })
    expect(body.response_format.type).toBe('json_schema')
    expect(body.response_format.json_schema.name).toBe('probe')
    expect(body.response_format.json_schema.strict).toBe(true)
  })

  it('sends attribution headers', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({ messages: [], schema: Schema, schemaName: 'probe', fetchImpl: f, env })
    expect(f.mock.calls[0][1].headers).toMatchObject({
      'HTTP-Referer': 'https://da.example',
      'X-Title': 'Decision Archaeology',
      Authorization: 'Bearer k',
    })
  })

  it('defaults cost tier from env and then to medium', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({
      messages: [],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f,
      env: { ...env, OPENROUTER_COST_TIER: 'high' },
    })
    await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    expect(bodyOf(f, 0).plugins[0].cost_tier).toBe('high')
    expect(bodyOf(f, 1).plugins[0].cost_tier).toBe('medium')
  })

  it('passes allowed models from env', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({
      messages: [],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f,
      env: { ...env, OPENROUTER_ALLOWED_MODELS: 'anthropic/*, openai/gpt-5*,' },
    })
    expect(bodyOf(f).plugins[0].allowed_models).toEqual(['anthropic/*', 'openai/gpt-5*'])
  })

  it('omits allowed models when env is unset', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    expect(bodyOf(f).plugins[0]).not.toHaveProperty('allowed_models')
  })

  it('returns parsed data and the routed model', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'yes', score: null }, 'google/gemini-3-pro'))
    expect(
      await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    ).toEqual({ data: { answer: 'yes', score: null }, model: 'google/gemini-3-pro' })
  })

  it('repairs once when the reply fails the schema', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(okReply({ answer: 42 }))
      .mockResolvedValueOnce(okReply({ answer: 'fixed', score: 2 }))
    const result = await generateStructured({
      messages: [{ role: 'user', content: 'q' }],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f,
      env,
    })
    expect(result.data.answer).toBe('fixed')
    const repair = bodyOf(f, 1).messages
    expect(repair.at(-2).role).toBe('assistant')
    expect(repair.at(-1).content).toContain('did not match the required JSON schema')
  })

  it('repairs once when the reply is not JSON', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ model: 'm', choices: [{ message: { content: 'Sure! {answer' } }] }),
      })
      .mockResolvedValueOnce(okReply({ answer: 'ok', score: 1 }))
    const result = await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    expect(result.data.answer).toBe('ok')
  })

  it('throws after a failed repair', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ wrong: true }))
    await expect(
      generateStructured({ messages: [], schema: Schema, schemaName: 'probe', fetchImpl: f, env })
    ).rejects.toThrow('OpenRouter returned invalid structured output for probe')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it.each([402, 404, 429])('throws a readable OpenRouterError for %i', async (status) => {
    const f = vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText: 'x',
      json: async () => ({ error: { message: 'No eligible models' } }),
    })
    const error = await generateStructured({
      messages: [],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f,
      env,
    }).catch((e) => e)
    expect(error).toBeInstanceOf(OpenRouterError)
    expect(error.status).toBe(status)
    expect(error.message).toBe(`OpenRouter request failed (${status}): No eligible models`)
  })

  it('does not send temperature, which require_parameters could use to exclude endpoints', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    expect(bodyOf(f)).not.toHaveProperty('temperature')
  })

  it('fails clearly without a repair when the reply was truncated', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'm',
        choices: [{ finish_reason: 'length', message: { content: '{"answer":"cut' } }],
      }),
    })
    await expect(
      generateStructured({ messages: [], schema: Schema, schemaName: 'probe', maxTokens: 500, fetchImpl: f, env })
    ).rejects.toThrow('OpenRouter reply for probe was truncated at 500 tokens')
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('passes an abort signal so a hung request cannot stall the job', async () => {
    const f = vi.fn().mockResolvedValue(okReply({ answer: 'a', score: 1 }))
    await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env })
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('reports a timeout readably', async () => {
    const f = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    const error = await generateStructured({
      messages: [],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f,
      env,
    }).catch((e) => e)
    expect(error).toBeInstanceOf(OpenRouterError)
    expect(error.status).toBe(408)
    expect(error.message).toBe('OpenRouter request timed out after 90 seconds')
  })

  it('fails fast without an API key', async () => {
    const f = vi.fn()
    await expect(
      generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env: {} })
    ).rejects.toThrow('OPENROUTER_API_KEY is not set')
    expect(f).not.toHaveBeenCalled()
  })
})

describe('toStrictJsonSchema', () => {
  it('produces a strict JSON schema', () => {
    const s = toStrictJsonSchema(
      z.object({ a: z.string(), nested: z.object({ b: z.number().nullable() }) })
    ) as StrictSchemaNode
    expect(s.additionalProperties).toBe(false)
    expect(s.required).toEqual(['a', 'nested'])
    expect(s.properties.nested.additionalProperties).toBe(false)
    expect(s.properties.nested.required).toEqual(['b'])
    expect(s).not.toHaveProperty('$schema')
  })
})

describe('generateStructured deadline', () => {
  it('skips the repair when the deadline has passed and reports the custom timeout', async () => {
    let clock = 0
    const f = vi.fn(async () => {
      clock = 21_000
      return okReply({ wrong: true })
    })
    const error = await generateStructured({
      messages: [],
      schema: Schema,
      schemaName: 'p',
      fetchImpl: f as never,
      env,
      timeoutMs: 20_000,
      now: () => clock,
    }).catch((e) => e)
    expect(f).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(OpenRouterError)
    expect(error.message).toBe('OpenRouter request timed out after 20 seconds')
  })

  it('still repairs when time remains', async () => {
    const f = vi.fn().mockResolvedValueOnce(okReply({ wrong: true })).mockResolvedValueOnce(okReply({ answer: 'a', score: 1 }))
    await generateStructured({ messages: [], schema: Schema, schemaName: 'p', fetchImpl: f, env, timeoutMs: 20_000, now: () => 0 })
    expect(f).toHaveBeenCalledTimes(2)
  })
})
