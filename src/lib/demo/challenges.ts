import { z } from 'zod'
import challengesJson from './challenges.json'

/**
 * Devil's Advocate questions on Rowan's demo decisions. The questions came from one real run of the
 * live prompt (`npm run demo:challenges`, written to challenges.json), so the model credit is true.
 * Rowan's answers are written by hand.
 */
export const DEMO_ASKED_KEYS = [
  'northwind-offer',
  'start-therapy',
  'move-across-city',
  'cofound-fernhill',
  'negotiate-equity',
  'index-funds',
  'weekly-parents-call',
] as const

/** One decision sealed without questions, so the demo shows that outcome too. */
export const DEMO_SKIPPED_KEY = 'pottery-class'

export const DemoChallengeFileSchema = z.object({
  generatedAt: z.string().datetime(),
  challenges: z.record(
    z.string(),
    z.object({ model: z.string().min(1), questions: z.array(z.string().min(10)).min(2).max(3) })
  ),
})

export type DemoChallengeFile = z.infer<typeof DemoChallengeFileSchema>

const FILE = DemoChallengeFileSchema.parse(challengesJson)

/** Rowan's answers, in question order. One is left unanswered on purpose. */
export const DEMO_CHALLENGE_ANSWERS: Record<(typeof DEMO_ASKED_KEYS)[number], Array<string | null>> = {
  'northwind-offer': [
    'If I still own nothing real by month three, or I am regularly past fifty hours, those are the two signals. I wrote both down so I cannot pretend later.',
    'Honestly, the 90 is mostly how good the interviews felt. The 70 is a guess from what the hiring manager said about crunch. Neither is better than a hunch.',
    'The bigger startups were months away from an offer, if one came at all. Northwind was real, the team was strong, and another month of interviews was costing me sleep.',
  ],
  'start-therapy': [
    'I already run three times a week, so exercise is not the missing piece. Not working means the same worries come back however much I run.',
    'Fair. The commitment is to the six months; the 30% is me admitting I have quit things early before. Saying it out loud is part of not doing it again.',
    null,
  ],
  'move-across-city': [
    'I did ask. Northwind allows one remote day, not three, so the commute is four days a week either way.',
    'Not much, if I am honest. I am betting the people are the part I can keep by visiting, and the streets are the part I will forget.',
    'Probably sleep and cooking, which would still be a win. If it all goes to my phone, that is a sign to look at, not a reason to stay.',
  ],
  'cofound-fernhill': [
    'None has agreed to a price yet. Two said they would pay around 200 a month after the pilot, and the 70% leans on those two conversations.',
    'We have a written agreement on equal equity, roles and vesting with a cliff. We have not planned for a split on direction; we agreed to bring in a mentor first if it happens.',
    'Word of mouth between clinics, mostly. If we have fewer than three paying clinics at month six, we stop and find jobs before the runway decides for us.',
  ],
  'negotiate-equity': [
    'Not much evidence. I am betting on the team, and I accept the options could end up worth nothing. The salary cut is an amount I can live without.',
    'I am thinking five to seven years. If there is no sale by then, I treat the options as a lottery ticket I already paid for.',
    'Roughly a grant twice the original size. Anything less and the salary I give up is the better bet.',
  ],
  'index-funds': [
    'This is not money I need soon. The emergency fund stays in cash; only what is left over goes in.',
    'I am not confident. The 45% is me admitting I will probably peek. Automation stops me timing the market, not looking at it.',
    'In 2022 I watched a small test account drop and did nothing. That is thin evidence, but it is something.',
  ],
  'weekly-parents-call': [
    'If I am away I call from wherever I am. If Sunday truly fails, Monday at the same time is the backup, and I have told them so.',
    'Visits matter more, but monthly visits did not happen either. The call is the floor, not the ceiling.',
    'Mostly hope. What is different is that we agreed on the time together, so missing it means letting them down, not just forgetting.',
  ],
}

/** The sealed challenge for one demo decision, or null for decisions that predate the step. */
export function demoChallengeFor(key: string): {
  outcome: 'ASKED' | 'SKIPPED'
  model: string | null
  questions: Array<{ position: number; question: string; answer: string | null }>
} | null {
  if (key === DEMO_SKIPPED_KEY) return { outcome: 'SKIPPED', model: null, questions: [] }
  const entry = FILE.challenges[key]
  const answers = DEMO_CHALLENGE_ANSWERS[key as (typeof DEMO_ASKED_KEYS)[number]]
  if (!entry || !answers) return null
  return {
    outcome: 'ASKED',
    model: entry.model,
    questions: entry.questions.map((question, position) => ({ position, question, answer: answers[position] ?? null })),
  }
}
