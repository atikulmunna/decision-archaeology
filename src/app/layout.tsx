import type { Metadata } from 'next'
import { IBM_Plex_Mono, Instrument_Serif, Inter_Tight } from 'next/font/google'
import { cookies } from 'next/headers'
import { ClerkProvider } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/design/clerk-appearance'
import { parseThemePreference, THEME_COOKIE, THEME_INIT_SCRIPT } from '@/lib/design/theme'
import { siteUrl } from '@/lib/site'
import './globals.css'

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})
const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' })
const mono = IBM_Plex_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-plex-mono' })

const DESCRIPTION =
  'Decision Archaeology records why you chose, before hindsight rewrites it. Each decision is sealed, then measured against what actually happened.'

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: 'Decision Archaeology',
  description: DESCRIPTION,
  // The preview images come from the opengraph-image files beside the pages. No title or description here:
  // Next fills those from each page's own metadata, and a root value would win over every page.
  openGraph: { siteName: 'Decision Archaeology', type: 'website' },
  twitter: { card: 'summary_large_image' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <ClerkProvider appearance={clerkAppearance}>
      {/* Font variables live on <html> so the :root-level tokens (--font-sans etc.) can resolve them. */}
      <html
        lang="en"
        data-theme={preference === 'system' ? undefined : preference}
        className={`${display.variable} ${sans.variable} ${mono.variable}`}
        suppressHydrationWarning
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
