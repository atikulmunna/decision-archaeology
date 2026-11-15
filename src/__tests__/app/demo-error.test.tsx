import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import DemoError from '@/app/(demo)/error'

describe('the demo error page', () => {
  it('keeps a visitor inside the demo, with a retry and a way back to the archive', () => {
    const reset = vi.fn()
    render(<DemoError error={Object.assign(new Error('boom'), { digest: 'abc123' })} reset={reset} />)
    expect(screen.getByRole('alert')).toHaveTextContent('This part of the demo could not load.')
    expect(screen.getByRole('link', { name: 'Back to the demo archive' })).toHaveAttribute('href', '/demo')
    // Nothing points a visitor at the app or at server logs they cannot read.
    expect(screen.queryByText(/server logs/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'New decision' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledOnce()
  })
})
