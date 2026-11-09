import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupplementaryNotesEditor } from '@/components/decisions/SupplementaryNotesEditor'

const ERROR_COPY = 'Could not save your notes. Your text is still here, so you can try again.'

describe('SupplementaryNotesEditor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows Saved after a successful save', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<SupplementaryNotesEditor decisionId="d1" initialNotes="" />)

    await userEvent.type(screen.getByRole('textbox'), 'New reflection')
    await userEvent.click(screen.getByRole('button', { name: 'Save notes' }))

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/decisions/d1',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('shows an error and keeps the text when the server fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) })
    )
    render(<SupplementaryNotesEditor decisionId="d1" initialNotes="" />)

    await userEvent.type(screen.getByRole('textbox'), 'Keep me')
    await userEvent.click(screen.getByRole('button', { name: 'Save notes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_COPY)
    expect(screen.getByRole('textbox')).toHaveValue('Keep me')
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('shows the error when the network request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<SupplementaryNotesEditor decisionId="d1" initialNotes="" />)

    await userEvent.type(screen.getByRole('textbox'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save notes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR_COPY)
  })
})
