import Link from 'next/link'
import { GITHUB_URL } from '@/lib/site'

const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'

/** The footer of the public site pages. */
export function SiteFooter() {
  return (
    <footer className="border-t-[1.5px] border-ink">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-5">
        <p className={`${mono} text-muted`}>Decision Archaeology · Sealed records stay sealed</p>
        <nav aria-label="Site" className="flex items-center gap-4">
          <Link href="/how-it-works" className={`${mono} text-ink-2 hover:text-ink`}>
            How it works
          </Link>
          <a href={GITHUB_URL} rel="noreferrer" className={`${mono} text-ink-2 hover:text-ink`}>
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
