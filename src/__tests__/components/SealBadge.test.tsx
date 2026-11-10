import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SealBadge } from '@/components/seal/SealBadge'

const HASH = '3f9ac21e77d0b1e49c0f51aa8b043f9ac21e77d0b1e49c0f51aa8b04aaaa8b04'

describe('SealBadge', () => {
  it('labels the roundel with the catalog number and short hash', () => {
    render(<SealBadge hash={HASH} catalogNumber={7} />)
    expect(screen.getByRole('img', { name: 'Sealed, fingerprint 3f9a…8b04' })).toBeInTheDocument()
    expect(screen.getByText('SEALED · DA-0007 · SHA-256 ·')).toBeInTheDocument()
    expect(screen.getByText('3f9a')).toBeInTheDocument()
    expect(screen.getByText('8b04')).toBeInTheDocument()
  })

  it('marks retroactive seals in the ring and the label', () => {
    render(<SealBadge hash={HASH} catalogNumber={7} retroactive />)
    expect(screen.getByRole('img', { name: 'Sealed retroactively, fingerprint 3f9a…8b04' })).toBeInTheDocument()
    expect(screen.getByText('SEALED RETROACTIVELY · DA-0007 ·')).toBeInTheDocument()
  })

  it('animates only when stamping', () => {
    const { rerender } = render(<SealBadge hash={HASH} catalogNumber={7} />)
    expect(screen.getByRole('img').getAttribute('class')).not.toContain('animate-seal-stamp')
    rerender(<SealBadge hash={HASH} catalogNumber={7} stamp />)
    expect(screen.getByRole('img').getAttribute('class')).toContain('motion-safe:animate-seal-stamp')
  })
})
