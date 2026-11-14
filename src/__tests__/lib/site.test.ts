import { describe, expect, it } from 'vitest'
import { docHref, DOCS, GITHUB_URL, LIVE_URL, siteUrl } from '@/lib/site'

describe('site constants', () => {
  it('prefers the configured app URL', () => {
    expect(siteUrl({ NEXT_PUBLIC_APP_URL: 'https://example.test' }).origin).toBe('https://example.test')
  })

  it('falls back to the Vercel production host, then localhost', () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app' }).origin).toBe('https://x.vercel.app')
    expect(siteUrl({}).origin).toBe('http://localhost:3000')
  })

  it('links docs to the repository on GitHub', () => {
    expect(GITHUB_URL).toBe('https://github.com/atikulmunna/decision-archaeology')
    expect(LIVE_URL).toBe('https://decision-archaeology.vercel.app/')
    expect(docHref('ai.md')).toBe('https://github.com/atikulmunna/decision-archaeology/blob/master/docs/ai.md')
    expect(DOCS.map((doc) => doc.file)).toEqual(['architecture.md', 'the-seal.md', 'calibration.md', 'ai.md', 'testing.md'])
  })
})
