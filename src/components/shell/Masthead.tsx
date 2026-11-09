import Link from 'next/link'
import { cookies } from 'next/headers'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { parseThemePreference, THEME_COOKIE } from '@/lib/design/theme'
import { MastheadNav } from './MastheadNav'
import { ThemeToggle } from './ThemeToggle'

export async function Masthead() {
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <header className="relative border-b-[1.5px] border-ink bg-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/decisions" className="font-display text-[22px] leading-none text-ink">
          Decision Archaeology
        </Link>
        <MastheadNav cta={<Button href="/decisions/new" size="sm">Log decision</Button>} />
        <div className="flex items-center gap-2">
          <ThemeToggle initialPreference={preference} />
          <span className="hidden md:inline-flex">
            <Button href="/decisions/new" size="sm">
              Log decision
            </Button>
          </span>
          <UserButton />
        </div>
      </div>
    </header>
  )
}
