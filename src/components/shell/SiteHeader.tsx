import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import type { ThemePreference } from '@/lib/design/theme'
import { GITHUB_URL } from '@/lib/site'

const navLink = 'font-mono text-[11px] uppercase tracking-[0.09em] text-ink-2 hover:text-ink'

/** The header of the public site pages (the landing page and the case study). */
export function SiteHeader({ signedIn, preference }: { signedIn: boolean; preference: ThemePreference }) {
  return (
    <header className="border-b-[1.5px] border-ink">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-[22px] leading-none">
          Decision Archaeology
        </Link>
        <div className="flex items-center gap-2">
          {/* Shown from md up so the header never overflows a phone. The footer always carries both. */}
          <span className="hidden items-center gap-4 pr-2 md:inline-flex">
            <Link href="/how-it-works" className={navLink}>
              How it works
            </Link>
            <a href={GITHUB_URL} rel="noreferrer" className={navLink}>
              GitHub
            </a>
          </span>
          <ThemeToggle initialPreference={preference} />
          <Button href={signedIn ? '/decisions' : '/sign-in'} variant="secondary" size="sm">
            {signedIn ? 'Open app' : 'Sign in'}
          </Button>
          <span className="hidden sm:inline-flex">
            <Button href={signedIn ? '/decisions/new' : '/sign-up'} size="sm">
              {signedIn ? 'Log a decision' : 'Get started'}
            </Button>
          </span>
        </div>
      </div>
    </header>
  )
}
