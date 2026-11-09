import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatalogNumber } from '@/components/ui/CatalogNumber'

describe('CatalogNumber', () => {
  it('renders a formatted catalog number', () => {
    render(<CatalogNumber value={42} />)
    expect(screen.getByText('DA-0042').className).toMatch(/font-mono/)
  })

  it('renders nothing for drafts', () => {
    const { container } = render(<CatalogNumber value={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
