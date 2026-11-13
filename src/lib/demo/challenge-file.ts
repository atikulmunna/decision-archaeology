import { generateStructured } from '@/lib/ai'
import { ChallengeSchema, buildChallengeMessages, cleanQuestion } from '@/lib/devils-advocate'
import { buildDemoArchive, demoDecisionIdForKey } from './archive'
import { DEMO_ASKED_KEYS, type DemoChallengeFile } from './challenges'

// The script runs offline, so it allows longer than the 20 seconds a person waits in the app.
const SCRIPT_TIMEOUT_MS = 60_000

/** Runs the live Devil's Advocate prompt once per asked demo decision. Only demo data leaves the machine. */
export async function generateDemoChallengeFile(
  generate: typeof generateStructured = generateStructured,
  now: Date = new Date()
): Promise<DemoChallengeFile> {
  const archive = buildDemoArchive()
  const challenges: DemoChallengeFile['challenges'] = {}
  for (const key of DEMO_ASKED_KEYS) {
    const decision = archive.find((record) => record.id === demoDecisionIdForKey(key))
    if (!decision) throw new Error(`Unknown demo decision: ${key}`)
    const { data, model } = await generate({
      messages: buildChallengeMessages(decision),
      schema: ChallengeSchema,
      schemaName: 'devils_advocate',
      costTier: 'medium',
      maxTokens: 1000,
      timeoutMs: SCRIPT_TIMEOUT_MS,
    })
    challenges[key] = { model, questions: data.questions.map((item) => cleanQuestion(item.question)) }
  }
  return { generatedAt: now.toISOString(), challenges }
}
