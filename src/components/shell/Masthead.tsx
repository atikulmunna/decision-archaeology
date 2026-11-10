import Link from 'next/link'
import { cookies } from 'next/headers'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { parseThemePreference, THEME_COOKIE } from '@/lib/design/theme'
import { APP_NAV_LINKS, type NavLink } from '@/lib/routes'
import { MastheadNav } from './MastheadNav'
import { ThemeToggle } from './ThemeToggle'

type MastheadProps = {
  links?: readonly NavLink[]
  homeHref?: string
  cta?: { href: string; label: string }
  showUserButton?: boolean
}

export async function Masthead({
  links = APP_NAV_LINKS,
  homeHref = '/decisions',
  cta = { href: '/decisions/new', label: 'Log decision' },
  showUserButton = true,
}: MastheadProps = {}) {
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <header className="relative border-b-[1.5px] border-ink bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
        <Link href={homeHref} className="font-display text-[22px] leading-none text-ink">
          Decision Archaeology
        </Link>
        <MastheadNav links={links} cta={<Button href={cta.href} size="sm">{cta.label}</Button>} />
        <div className="flex items-center gap-2">
          <ThemeToggle initialPreference={preference} />
          <span className="hidden md:inline-flex">
            <Button href={cta.href} size="sm">
              {cta.label}
            </Button>
          </span>
          {showUserButton && <UserButton />}
        </div>
      </div>
    </header>
  )
}
