import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LetterSection } from '@/components/decisions/LetterSection'
import { letterFingerprint } from '@/lib/letter-rules'

const day = (s: string) => new Date(`${s}T00:00:00.000Z`)

describe('LetterSection', () => {
  it('shows nothing without a letter', () => {
    const { container } = render(<LetterSection letter={{ state: 'none' }} fingerprint={null} revisitHref="/decisions/d7/revisit" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a sealed letter by its day and short fingerprint, never its text', () => {
    render(<LetterSection letter={{ state: 'sealed', opensAt: day('2027-03-01') }} fingerprint={'ab12'.repeat(16)} revisitHref="/decisions/d7/revisit" />)
    expect(screen.getByRole('heading', { name: 'A letter to future you' })).toBeInTheDocument()
    expect(screen.getByText('Sealed until Mar 1, 2027')).toBeInTheDocument()
    expect(screen.getByText(/ab12/)).toBeInTheDocument()
  })

  it('points a ready letter to the revisit', () => {
    render(<LetterSection letter={{ state: 'ready', opensAt: day('2027-03-01') }} fingerprint={'a'.repeat(64)} revisitHref="/decisions/d7/revisit" />)
    expect(screen.getByText(/Your letter is ready\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open it in your revisit.' })).toHaveAttribute('href', '/decisions/d7/revisit')
  })

  it('shows an open letter and checks it against its seal', async () => {
    const body = 'Dear me, remember the commute.'
    const sha256 = await letterFingerprint(body)
    const { unmount } = render(
      <LetterSection letter={{ state: 'open', opensAt: day('2027-03-01'), openedAt: day('2027-03-02'), sha256, body }} fingerprint={sha256} revisitHref="/x" />
    )
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(await screen.findByText('Matches its seal')).toBeInTheDocument()
    unmount()
    render(
      <LetterSection letter={{ state: 'open', opensAt: day('2027-03-01'), openedAt: day('2027-03-02'), sha256: '0'.repeat(64), body }} fingerprint={'0'.repeat(64)} revisitHref="/x" />
    )
    expect(await screen.findByText('Does not match its seal')).toBeInTheDocument()
  })
})
