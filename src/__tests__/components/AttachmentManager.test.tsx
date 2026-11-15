import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentManager } from '@/components/decisions/AttachmentManager'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AttachmentManager', () => {
  it('opens the file picker from the keyboard', async () => {
    render(<AttachmentManager />)
    const add = screen.getByRole('button', { name: 'Add files' })
    const picker = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    add.focus()
    expect(add).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(picker).toHaveBeenCalledOnce()
  })

  it('keeps keyboard focus on the button while an upload runs, and announces it', async () => {
    // The draft is still being created, so the upload stays in progress.
    const { container } = render(<AttachmentManager onRequireDecisionId={() => new Promise(() => {})} />)
    const add = screen.getByRole('button', { name: 'Add files' })
    add.focus()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'note.pdf', { type: 'application/pdf' })] } })
    const uploading = await screen.findByRole('button', { name: 'Uploading...' })
    expect(uploading).toHaveFocus()
    expect(uploading).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Uploading attachments')
    // A second press while it uploads does nothing.
    const picker = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(uploading)
    expect(picker).not.toHaveBeenCalled()
  })
})
