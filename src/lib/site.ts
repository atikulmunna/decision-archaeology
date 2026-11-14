/** Where the project lives: the source, the live app, and the explanation docs. */

export const GITHUB_URL = 'https://github.com/atikulmunna/decision-archaeology'
export const LIVE_URL = 'https://decision-archaeology.vercel.app/'

export const DOCS: readonly { file: string; title: string }[] = [
  { file: 'architecture.md', title: 'Architecture' },
  { file: 'the-seal.md', title: 'The seal' },
  { file: 'calibration.md', title: 'Calibration' },
  { file: 'ai.md', title: 'AI pipelines' },
  { file: 'testing.md', title: 'Testing' },
]

export function docHref(file: string): string {
  return `${GITHUB_URL}/blob/master/docs/${file}`
}

/** The absolute base for link previews: the configured app URL, else the Vercel production host, else localhost. */
export function siteUrl(env: Record<string, string | undefined> = process.env): URL {
  if (env.NEXT_PUBLIC_APP_URL) return new URL(env.NEXT_PUBLIC_APP_URL)
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`)
  return new URL('http://localhost:3000')
}
