import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaseStudySeal } from '@/components/case-study/CaseStudySeal'
import { getDemoDecision } from '@/lib/demo/queries'

describe('CaseStudySeal', () => {
  it('verifies the real seal, then fails it once a word is changed', async () => {
    render(<CaseStudySeal record={getDemoDecision('demo-0007')!} />)
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Seal verified')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Try changing a word (demo)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Does not match')
  })
})
