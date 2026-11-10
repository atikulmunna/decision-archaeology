import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpecimenCard } from '@/components/shell/SpecimenCard'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'
import { SPECIMEN_EXCERPT, SPECIMEN_KEY } from '@/lib/demo/seed'
import { DEMO_ROUTES } from '@/lib/routes'

describe('SpecimenCard', () => {
  it('shows the real specimen record and links to it', () => {
    const specimen = getDemoDecision(demoDecisionIdForKey(SPECIMEN_KEY))!
    render(<SpecimenCard href={DEMO_ROUTES.decision(specimen.id)} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/demo/decisions/demo-0007')
    expect(screen.getByText('Accept the senior role at Northwind?')).toBeInTheDocument()
    expect(screen.getByText('DA-0007')).toBeInTheDocument()
    expect(screen.getByText('15.08.2025')).toBeInTheDocument()
    expect(screen.getByText(SPECIMEN_EXCERPT).tagName).toBe('MARK')
    expect(screen.getByText('70% confident')).toBeInTheDocument()
    expect(screen.getByText('Outcome: as expected')).toBeInTheDocument()
    expect(screen.getByText('Career')).toBeInTheDocument()
  })

  it('renders without a link on the auth pages', () => {
    render(<SpecimenCard />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Accept the senior role at Northwind?')).toBeInTheDocument()
  })
})
