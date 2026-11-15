import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Instrument_Serif: () => ({ variable: 'font-var-display' }),
  Inter_Tight: () => ({ variable: 'font-var-sans' }),
  IBM_Plex_Mono: () => ({ variable: 'font-var-mono' }),
}))

import DashboardLoading from '@/app/(dashboard)/loading'
import ArchiveLoading from '@/app/(dashboard)/decisions/loading'
import GlobalError from '@/app/global-error'

describe('loading screens', () => {
  it('announce that the page is loading', () => {
    for (const Loading of [DashboardLoading, ArchiveLoading]) {
      const { unmount } = render(<Loading />)
      expect(screen.getByRole('status')).toHaveTextContent('Loading')
      unmount()
    }
  })
})

describe('the global error page', () => {
  it('loads the brand fonts, since it renders outside the root layout', () => {
    const markup = renderToStaticMarkup(<GlobalError error={new Error('boom')} reset={() => {}} />)
    const htmlTag = markup.match(/<html[^>]*>/)?.[0] ?? ''
    expect(htmlTag).toContain('font-var-display')
    expect(htmlTag).toContain('font-var-sans')
    expect(htmlTag).toContain('font-var-mono')
  })
})
