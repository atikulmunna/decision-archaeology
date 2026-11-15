import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BiasReportCard } from '@/components/ai/BiasReportCard'
import type { BiasEntry } from '@/lib/ai-schema'

const bias: BiasEntry = {
  name: 'Anchoring Bias',
  severity: 'MILD',
  evidence: 'First offers set the frame.',
  affectedDecisions: ['Refinance'],
  reframe: 'Gather a second anchor.',
}

afterEach(() => {
  vi.restoreAllMocks()
})

function submitFlag() {
  render(
    <ul>
      <BiasReportCard bias={bias} reportId="r1" index={0} />
    </ul>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Flag' }))
  fireEvent.click(screen.getByRole('button', { name: 'Submit flag' }))
}

describe('BiasReportCard flagging', () => {
  it('marks the finding flagged once the server accepts it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })))
    submitFlag()
    expect(await screen.findByText('Flagged')).toBeInTheDocument()
  })

  it('keeps the form and says so when the server refuses the flag', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 500 }))
    submitFlag()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not flag this finding. Try again.')
    expect(screen.queryByText('Flagged')).toBeNull()
    expect(screen.getByRole('button', { name: 'Submit flag' })).toBeEnabled()
  })

  it('clears the failure when the reader cancels and opens the form again', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    submitFlag()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Flag' }))
    expect(screen.getByRole('button', { name: 'Submit flag' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('says so when the request never reaches the server', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    submitFlag()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not flag this finding. Try again.')
    expect(screen.queryByText('Flagged')).toBeNull()
  })
})
