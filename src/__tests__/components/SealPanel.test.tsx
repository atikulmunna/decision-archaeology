import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SealPanel } from '@/components/seal/SealPanel'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'
import { buildSealPayload, sealFields } from '@/lib/seal'
import { tamperReasoning } from '@/lib/tamper'

const specimen = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function TamperHarness() {
  const [tampered, setTampered] = useState(false)
  const record = tampered ? { ...specimen, reasoning: tamperReasoning(specimen.reasoning).text } : specimen
  return <SealPanel record={record} tampered={tampered} onTamperedChange={setTampered} />
}

describe('SealPanel', () => {
  it('states when the record was sealed, in UTC', () => {
    render(<SealPanel record={specimen} />)
    expect(screen.getByText('The seal')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A SHA-256 fingerprint of everything that locked, taken when this decision was sealed on Aug 15, 2025 at 12:05 UTC.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText(specimen.sealHash!)).toBeInTheDocument()
  })

  it('verifies an untouched record', async () => {
    render(<SealPanel record={specimen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByText('Seal verified')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nothing that locked has changed.')
  })

  it('fails verification after the tamper toggle and recovers when it is turned off', async () => {
    render(<TamperHarness />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Try changing a word/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByText('Does not match')).toBeInTheDocument()
    expect(screen.getByText(/One word changed in your browser/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Changing a word/ }))
    expect(screen.queryByText('Does not match')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByText('Seal verified')).toBeInTheDocument()
  })

  it('has no tamper toggle without onTamperedChange', () => {
    render(<SealPanel record={specimen} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('downloads exactly the sealed payload', async () => {
    const blobs: Blob[] = []
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn((blob: Blob) => {
        blobs.push(blob)
        return 'blob:seal'
      }),
      revokeObjectURL: vi.fn(),
    }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<SealPanel record={specimen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show what is sealed' }))
    await userEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(await blobs[0].text()).toBe(buildSealPayload(specimen))
    expect(screen.getByText(/sha256sum DA-0007-seal\.json/)).toBeInTheDocument()
  })

  it('verifies text stored with Windows line endings', async () => {
    const crlf = { ...specimen, reasoning: specimen.reasoning.replace('. ', '.' + String.fromCharCode(13, 10)) }
    const sealed = { ...crlf, ...(await sealFields(crlf, crlf.createdAt)) }
    render(<SealPanel record={sealed} />)
    await userEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByText('Seal verified')).toBeInTheDocument()
  })

  it('shows approved corrections against the seal', () => {
    render(<SealPanel record={specimen} approvedCorrections={1} />)
    expect(
      screen.getByText('1 approved typo correction since sealing. The seal covers the original text.')
    ).toBeInTheDocument()
  })

  it('explains unsealed and imported records without a Verify button', () => {
    const { rerender } = render(<SealPanel record={{ ...specimen, sealHash: null, sealedAt: null }} />)
    expect(screen.getByText('Not sealed. This decision was recorded before seals existed.')).toBeInTheDocument()
    rerender(<SealPanel record={{ ...specimen, sealHash: null, sealedAt: null, isImported: true }} />)
    expect(
      screen.getByText('Imported, not sealed. Imported records are exempt from the time lock.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify seal' })).toBeNull()
  })

  it('says when a seal was taken retroactively', () => {
    render(<SealPanel record={{ ...specimen, sealedAt: new Date('2026-11-11T09:00:00.000Z') }} />)
    expect(
      screen.getByText(
        'Sealed retroactively on Nov 11, 2026. It covers the content as it was then, not the wording at finalization.'
      )
    ).toBeInTheDocument()
  })

  it('marks the seal provisional inside the edit window', () => {
    render(<SealPanel record={{ ...specimen, isLocked: false }} />)
    expect(
      screen.getByText('Provisional: this fingerprint becomes final when the edit window closes at 12:05 UTC.')
    ).toBeInTheDocument()
  })

  it('disables Verify when the browser has no Web Crypto', () => {
    vi.stubGlobal('crypto', {})
    render(<SealPanel record={specimen} />)
    expect(screen.getByRole('button', { name: 'Verify seal' })).toBeDisabled()
    expect(screen.getByText('This browser cannot compute SHA-256.')).toBeInTheDocument()
  })
})
