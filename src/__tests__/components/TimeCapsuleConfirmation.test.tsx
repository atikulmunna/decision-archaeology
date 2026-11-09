import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeCapsuleConfirmation } from '@/components/decisions/TimeCapsuleConfirmation'
import type { CreateDecisionInput } from '@/lib/validations/decision'

const validInput = {
  title: 'Accept the senior role at Northwind',
  summary: 'Deciding whether to take the senior engineering role offered by Northwind.',
  context: 'Current role is stable but growth has stalled for two review cycles.',
  alternatives: 'Stay and push for promotion, or interview elsewhere for six months.',
  chosenOption: 'Accept the Northwind offer and start in April.',
  reasoning: 'The role compounds future options if the team is as strong as it seemed.',
  customTags: [],
} as CreateDecisionInput

describe('TimeCapsuleConfirmation', () => {
  it('previews the catalog number the record will be sealed as', () => {
    render(
      <TimeCapsuleConfirmation
        data={validInput}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
        loading={false}
        upcomingCatalogNumber={43}
      />
    )
    expect(screen.getByText(/Will be sealed as/)).toHaveTextContent('Will be sealed as DA-0043')
  })
})
