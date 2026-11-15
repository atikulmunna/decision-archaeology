import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import { DEMO_ROUTES } from '@/lib/routes'

const cardFixture = {
  id: 'd1',
  userId: 'u1',
  title: 'Accept the senior role at Northwind',
  summary: 'Deciding whether to take the senior role.',
  context: 'Context',
  alternatives: 'Alternatives',
  chosenOption: 'Accept',
  reasoning: 'Reasoning',
  isLocked: true,
  lockedAt: new Date('2026-03-14'),
  values: null,
  uncertainties: null,
  predictedOutcome: null,
  predictedTimeframe: null,
  confidenceLevel: 7,
  domainTag: 'CAREER',
  customTags: ['offer'],
  attachments: [],
  supplementaryNotes: null,
  isImported: false,
  catalogNumber: null,
  isDraft: false,
  draftStartedAt: null,
  challengeOutcome: null,
  challengeModel: null,
  sealHash: null,
  sealedAt: null,
  createdAt: new Date('2026-03-14'),
  updatedAt: new Date('2026-03-14'),
  outcomes: [] as OutcomeUpdate[],
} as DecisionRecord & { outcomes: OutcomeUpdate[] }

describe('DecisionCard', () => {
  it('shows the catalog number on archive cards', () => {
    render(<DecisionCard decision={{ ...cardFixture, catalogNumber: 7 }} />)
    expect(screen.getByText('DA-0007')).toBeInTheDocument()
  })

  it('links to the app record by default', () => {
    render(<DecisionCard decision={cardFixture} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/decisions/d1')
  })

  it('links through the given routes', () => {
    render(<DecisionCard decision={cardFixture} routes={DEMO_ROUTES} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/demo/decisions/d1')
  })

  it('calls a locked record without a seal locked, and a sealed one sealed', () => {
    const { rerender } = render(<DecisionCard decision={cardFixture} />)
    expect(screen.getByText('Locked')).toHaveAttribute('title', 'Core fields locked')
    expect(screen.queryByText('Sealed')).toBeNull()
    rerender(<DecisionCard decision={{ ...cardFixture, sealHash: 'a'.repeat(64), sealedAt: new Date('2026-03-14') }} />)
    expect(screen.getByText('Sealed')).toHaveAttribute('title', 'Core fields locked and sealed')
  })
})
