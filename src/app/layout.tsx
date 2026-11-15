import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/design/clerk-appearance'
import { clerkLocalization } from '@/lib/design/clerk-localization'
import { fontVariables } from '@/lib/design/fonts'
import { THEME_INIT_SCRIPT } from '@/lib/design/theme'
import { siteUrl } from '@/lib/site'
import './globals.css'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
      {/* Font variables live on <html> so the :root-level tokens (--font-sans etc.) can resolve them.
          data-theme is left to the init script (it runs before first paint), so React never owns it:
          a refresh after switching to System cannot strip what the toggle set. */}
      <html
        lang="en"
        className={fontVariables}
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
