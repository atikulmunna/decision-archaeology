import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SealRecord } from '@/lib/seal'

const mocks = vi.hoisted(() => ({ shareFindFirst: vi.fn(), userFindUnique: vi.fn(), userFindMany: vi.fn() }))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_collab' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
    collaboratorShare: { findFirst: mocks.shareFindFirst },
  },
}))
// Print what the seal panel would hash, so the test can read the payload's version and challenge.
vi.mock('@/components/seal/SealPanel', async () => {
  const { buildSealPayload } = await import('@/lib/seal')
  return {
    SealPanel: ({ record }: { record: SealRecord }) => {
      const payload = JSON.parse(buildSealPayload(record))
      return <p>{`payload ${payload.seal} with ${payload.challenge?.questions.length ?? 0} questions`}</p>
    },
  }
})

import SharedDecisionPage from '@/app/(dashboard)/shared/[shareId]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'

describe('shared decision page challenge', () => {
  it('loads the sealed questions so the seal panel verifies a v3 record', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: {
        ...decision,
        challengeOutcome: 'ASKED',
        challengeModel: 'openai/gpt-5-mini',
        challengeQuestions: [
          { id: 'q1', decisionId: decision.id, position: 0, question: 'Why this team?', answer: 'The interviews.', createdAt: decision.createdAt },
          { id: 'q2', decisionId: decision.id, position: 1, question: 'What if it stalls?', answer: null, createdAt: decision.createdAt },
        ],
      },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(mocks.shareFindFirst.mock.calls[0][0].include.decision.include.challengeQuestions).toEqual({ orderBy: { position: 'asc' } })
    expect(markup).toContain('payload da-seal-v3 with 2 questions')
  })
})

describe('shared decision page challenge section', () => {
  it('shows the questions and answers in the sealed record', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: {
        ...decision,
        challengeOutcome: 'ASKED',
        challengeModel: 'openai/gpt-5-mini',
        challengeQuestions: [
          { id: 'q1', decisionId: decision.id, position: 0, question: 'Why this team?', answer: 'The interviews.', createdAt: decision.createdAt },
          { id: 'q2', decisionId: decision.id, position: 1, question: 'What if it stalls?', answer: null, createdAt: decision.createdAt },
        ],
      },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(markup).toContain('Questions before sealing')
    expect(markup).toContain('Why this team?')
    expect(markup).toContain('The interviews.')
    expect(markup).toContain('Left unanswered')
    expect(markup).toContain('Asked by openai/gpt-5-mini via OpenRouter Auto Router')
  })
})
