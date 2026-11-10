import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
    // Only the seal panel's own buttons remain; nothing that writes.
    expect(screen.queryAllByRole('button').map((button) => button.textContent)).toEqual(['Verify seal', 'Show what is sealed'])
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

describe('DecisionDetail dates in a fixed time zone', () => {
  it('shows the seeded calendar day and time to a visitor far east of UTC', () => {
    const originalTz = process.env.TZ
    // Noon UTC is already midnight of the next day in New Zealand.
    process.env.TZ = 'Pacific/Auckland'
    try {
      const decision = demo('northwind-offer')
      render(<DecisionDetail decision={decision} readOnly timeZone="UTC" />)
      expect(screen.getByText(/Recorded August 15, 2025 at 12:00 PM UTC/)).toBeInTheDocument()
      expect(screen.getByText(/Sealed August 15, 2025 at 12:05 PM UTC/)).toBeInTheDocument()
      // Outcome dates (OutcomeHistory) and correction dates use the same zone.
      expect(screen.getByText('Apr 24, 2026')).toBeInTheDocument()
    } finally {
      process.env.TZ = originalTz
    }
  })
})

describe('DecisionDetail seal', () => {
  it('shows the roundel and seal panel on a sealed record', () => {
    render(<DecisionDetail decision={demo('northwind-offer')} readOnly timeZone="UTC" />)
    expect(screen.getByRole('img', { name: /^Sealed, fingerprint / })).toBeInTheDocument()
    expect(screen.getByText('The seal')).toBeInTheDocument()
    expect(screen.queryByText('Core fields are sealed')).toBeNull()
  })

  it('counts approved corrections against the seal', () => {
    render(<DecisionDetail decision={demo('on-call-redesign')} readOnly timeZone="UTC" />)
    expect(screen.getByText('1 approved typo correction since sealing. The seal covers the original text.')).toBeInTheDocument()
  })

  it('highlights the changed word when the demo tamper test is on', async () => {
    render(<DecisionDetail decision={demo('northwind-offer')} readOnly timeZone="UTC" tamperTest />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Try changing a word/ }))
    expect(screen.getByText('weak').tagName).toBe('MARK')
  })

  it('offers no tamper test without tamperTest', () => {
    render(<DecisionDetail decision={demo('northwind-offer')} readOnly timeZone="UTC" />)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('marks the seal provisional inside the edit window', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ attachments: [] })))
    const fresh = { ...demo('northwind-offer'), isLocked: false, lockedAt: null, createdAt: new Date() }
    render(<DecisionDetail decision={fresh} collaboration={{ currentUserId: 'u1', shares: [], discussions: [] }} />)
    expect(screen.getByText(/^Seal final at \d{2}:\d{2} UTC$/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Sealed/ })).toBeNull()
    expect(screen.getByText('Edit window open')).toBeInTheDocument()
  })
})

