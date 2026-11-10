import { auth } from '@clerk/nextjs/server'
import { DemoStrip } from '@/components/shell/DemoStrip'
import { Masthead } from '@/components/shell/Masthead'
import { PageContainer } from '@/components/shell/PageContainer'
import { DEMO_NAV_LINKS } from '@/lib/routes'

/** The public demo shell. It reads only whether a session exists, never any user data. */
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const signedIn = Boolean(userId)
  const mastheadCta = signedIn
    ? { href: '/decisions', label: 'Open your archive' }
    : { href: '/sign-up', label: 'Start your archive' }
  const stripCta = signedIn ? mastheadCta : { href: '/sign-up', label: 'Start your own' }

  return (
    <div className="min-h-screen bg-paper">
      <Masthead links={DEMO_NAV_LINKS} homeHref="/demo" cta={mastheadCta} showUserButton={false} />
      <DemoStrip cta={stripCta} />
      <main>
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  )
}
