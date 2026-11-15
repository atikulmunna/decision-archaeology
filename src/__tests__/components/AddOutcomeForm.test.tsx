import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AddOutcomeForm } from '@/components/decisions/AddOutcomeForm'
import { OUTCOME_LABELS } from '@/lib/outcomes'

describe('AddOutcomeForm rating choices', () => {
  it('wraps long labels instead of cutting them off on a phone', () => {
    render(<AddOutcomeForm decisionId="d1" onAdded={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Log an outcome update/ }))
    for (const label of Object.values(OUTCOME_LABELS)) {
      const text = screen.getByText(label)
      // Two columns at 390px leave about 130px per label: "Slightly better than expected" must wrap.
      expect(text.className, label).not.toMatch(/\btruncate\b/)
      expect(screen.getByRole('button', { name: label }).className, label).toMatch(/\btext-left\b/)
    }
  })
})
