import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo/decisions/demo-0010',
}))

import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { getDemoDecision } from '@/lib/demo/queries'
import { demoDecisionIdForKey } from '@/lib/demo/archive'

const demo = (key: string) => getDemoDecision(demoDecisionIdForKey(key))!

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DecisionDetail read-only', () => {
  it('renders a sealed demo record without any controls', () => {
    const decision = demo('on-call-redesign')
    const { container } = render(<DecisionDetail decision={decision} readOnly />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelector('form, textarea, input')).toBeNull()
    expect(screen.getAllByText(decision.corrections[0].correctedText).length).toBeGreaterThan(0)
    expect(screen.getByText('APPROVED')).toBeInTheDocument()
    expect(screen.getByText(decision.outcomes[0].whatHappened)).toBeInTheDocument()
  })

  it('shows supplementary notes as text', () => {
    const decision = demo('northwind-offer')
    render(<DecisionDetail decision={decision} readOnly />)
    expect(screen.getByText(decision.supplementaryNotes!)).toBeInTheDocument()
  })

  it('makes no API calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<DecisionDetail decision={demo('northwind-offer')} readOnly />)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('still offers owner actions when not read-only', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ attachments: [] })))
    render(
      <DecisionDetail decision={demo('northwind-offer')} collaboration={{ currentUserId: 'u1', shares: [], discussions: [] }} />
    )
    expect(screen.getAllByRole('button', { name: /request typo correction/i }).length).toBeGreaterThan(0)
    expect(screen.getByText('Collaboration')).toBeInTheDocument()
  })
})
