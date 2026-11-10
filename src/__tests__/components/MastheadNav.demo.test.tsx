import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let pathname = ''
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

import { MastheadNav } from '@/components/shell/MastheadNav'
import { DEMO_NAV_LINKS } from '@/lib/routes'

describe('MastheadNav with demo links', () => {
  it('marks only Calibration on /demo/calibration', () => {
    pathname = '/demo/calibration'
    render(<MastheadNav links={DEMO_NAV_LINKS} />)
    expect(screen.getAllByRole('link', { name: 'Calibration' })[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Archive' })[0]).not.toHaveAttribute('aria-current')
  })

  it('marks Archive on a demo decision page', () => {
    pathname = '/demo/decisions/demo-0001'
    render(<MastheadNav links={DEMO_NAV_LINKS} />)
    expect(screen.getAllByRole('link', { name: 'Archive' })[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Reports' })[0]).not.toHaveAttribute('aria-current')
  })
})
