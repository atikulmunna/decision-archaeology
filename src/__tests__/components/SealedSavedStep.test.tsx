import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SealedNotice } from '@/components/decisions/SealedNotice'

const HASH = '3f9ac21e77d0b1e49c0f51aa8b043f9ac21e77d0b1e49c0f51aa8b04aaaa8b04'

describe('SealedNotice', () => {
  it('stamps the roundel when the record locks', () => {
    render(<SealedNotice hash={HASH} catalogNumber={12} />)
    const badge = screen.getByRole('img', { name: 'Sealed, fingerprint 3f9a…8b04' })
    expect(badge.getAttribute('class')).toContain('motion-safe:animate-seal-stamp')
    expect(screen.getByText('SEALED · DA-0012 · SHA-256 ·')).toBeInTheDocument()
    expect(screen.getByText('Sealed. Supplementary notes and outcomes can still be added.')).toBeInTheDocument()
  })

  it('falls back to text when the response carried no seal', () => {
    render(<SealedNotice hash={null} catalogNumber={12} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Sealed. Supplementary notes and outcomes can still be added.')).toBeInTheDocument()
  })
})
