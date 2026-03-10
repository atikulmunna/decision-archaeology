import OpenAI from 'openai'
import { Mistral } from '@mistralai/mistralai'

// NVIDIA NIM uses an OpenAI-compatible API
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })

export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Primary: NVIDIA NIM (Nemotron 70B)
 * Fallback: Mistral Large
 */
export async function generateWithFallback(
  messages: AIMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 4096 } = options

  try {
    const response = await nvidia.chat.completions.create({
      model: options.model ?? 'nvidia/llama-3.1-nemotron-70b-instruct',
      messages,
      temperature,
      max_tokens: maxTokens,
    })
    return response.choices[0]?.message?.content ?? ''
  } catch (err) {
    console.error('[AI] NVIDIA NIM failed, falling back to Mistral:', err)
    const response = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages,
    })
    const content = response.choices?.[0]?.message?.content
    return typeof content === 'string' ? content : ''
  }
}

/**
 * Lightweight model for normalization pass (Pass 1).
 * Uses the smaller 8B model to save cost and latency.
 */
export async function generateNormalization(messages: AIMessage[]): Promise<string> {
  return generateWithFallback(messages, {
    model: 'meta/llama-3.1-8b-instruct',
    temperature: 0.1,
    maxTokens: 2048,
  })
}
