import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

/** Sets navigator.clipboard for one test and returns a function that puts the original back. */
function setClipboard(value: unknown) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
  return () => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else delete (navigator as unknown as Record<string, unknown>).clipboard
  }
}

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

  it('keeps the download URL alive after the click so slower browsers can save the file', () => {
    vi.useFakeTimers()
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:seal'), revokeObjectURL: revoke }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      render(<SealPanel record={specimen} />)
      fireEvent.click(screen.getByRole('button', { name: 'Show what is sealed' }))
      fireEvent.click(screen.getByRole('button', { name: 'Download' }))
      expect(revoke).not.toHaveBeenCalled()
      vi.runAllTimers()
      expect(revoke).toHaveBeenCalledWith('blob:seal')
    } finally {
      vi.useRealTimers()
    }
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

  it('hydrates the server markup without a mismatch in a browser without Web Crypto', async () => {
    const element = <SealPanel record={specimen} />
    const html = renderToString(element)
    vi.stubGlobal('crypto', {})
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const recoverable = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let root: ReturnType<typeof hydrateRoot> | undefined
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError: recoverable })
    })
    try {
      expect(recoverable).not.toHaveBeenCalled()
      expect(consoleError).not.toHaveBeenCalled()
      expect(within(container).getByRole('button', { name: 'Verify seal' })).toBeDisabled()
      expect(within(container).getByText('This browser cannot compute SHA-256.')).toBeInTheDocument()
    } finally {
      act(() => root?.unmount())
      container.remove()
    }
  })

  it('says so when the browser has no clipboard, instead of claiming it copied', async () => {
    const restore = setClipboard(undefined)
    try {
      render(<SealPanel record={specimen} />)
      fireEvent.click(screen.getByRole('button', { name: 'Show what is sealed' }))
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy. Select the text above instead.')
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
    } finally {
      restore()
    }
  })

  it('says so when the clipboard refuses', async () => {
    const restore = setClipboard({ writeText: () => Promise.reject(new Error('denied')) })
    try {
      render(<SealPanel record={specimen} />)
      fireEvent.click(screen.getByRole('button', { name: 'Show what is sealed' }))
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy. Select the text above instead.')
      expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull()
    } finally {
      restore()
    }
  })

  it('reports a hash that fails and lets the reader try again', async () => {
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no digest'))
    render(<SealPanel record={specimen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not compute the fingerprint in this browser.')
    expect(screen.getByRole('button', { name: 'Verify seal' })).toBeEnabled()
  })

  it('keeps the result region on the page before anything is verified', async () => {
    render(<SealPanel record={specimen} />)
    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: 'Verify seal' }))
    await screen.findByText('Seal verified')
    expect(screen.getByRole('status')).toBe(region)
  })

  it('says the shown text is not what was sealed while a word is changed', async () => {
    render(<TamperHarness />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Try changing a word/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Show what is sealed' }))
    expect(screen.queryByText(/The exact text that was hashed/)).toBeNull()
    expect(
      screen.getByText('One word is changed in your browser, so this is not the text that was sealed. Turn the change off to see it.')
    ).toBeInTheDocument()
  })

  it('does not date corrections against a retroactive seal', () => {
    render(<SealPanel record={{ ...specimen, sealedAt: new Date('2026-11-11T09:00:00.000Z') }} approvedCorrections={2} />)
    expect(screen.getByText('2 approved typo corrections. The seal covers the original text.')).toBeInTheDocument()
  })
})
