import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { Stat } from '@/components/ui/Stat'

describe('display primitives', () => {
  it('maps badge tones to tokens', () => {
    render(
      <>
        <Badge>Plain</Badge>
        <Badge tone="signal">Sealed</Badge>
      </>
    )
    expect(screen.getByText('Plain').className).toMatch(/bg-sunken/)
    expect(screen.getByText('Sealed').className).toMatch(/bg-signal/)
    expect(screen.getByText('Sealed').className).toMatch(/text-on-signal/)
  })

  it('announces only danger callouts as alerts', () => {
    render(
      <>
        <Callout tone="danger" title="Save failed">Try again.</Callout>
        <Callout title="Heads up">Info.</Callout>
      </>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed')
    expect(screen.getByRole('status')).toHaveTextContent('Heads up')
  })

  it('lets long unbroken titles wrap', () => {
    render(<PageHeader title="https://example.com/a-very-long-unbroken-url-pasted-as-a-decision-title" meta="DA-0042" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toMatch(/break-words/)
    expect(heading.className).toMatch(/min-w-0/)
    expect(screen.getByText('DA-0042')).toBeInTheDocument()
  })

  it('renders stats and empty states', () => {
    render(
      <>
        <Stat label="Sealed" value={48} />
        <EmptyState
          title="No decisions yet"
          description="Log your first one."
          action={<a href="/decisions/new">Log a decision</a>}
        />
      </>
    )
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText('No decisions yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log a decision' })).toBeInTheDocument()
  })

  it('hides skeletons from assistive tech and pulses only when motion is allowed', () => {
    const { container } = render(<Skeleton className="h-4" />)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el.className).toMatch(/motion-safe:animate-pulse/)
  })

  it('renders cards as the requested element and eyebrows as mono labels', () => {
    render(
      <Card as="article">
        <Eyebrow>Reasoning</Eyebrow>
      </Card>
    )
    expect(screen.getByRole('article').className).toMatch(/border-rule/)
    expect(screen.getByText('Reasoning').className).toMatch(/font-mono/)
  })
})
