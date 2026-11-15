import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentManager } from '@/components/decisions/AttachmentManager'

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
})
