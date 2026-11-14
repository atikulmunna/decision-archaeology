import Link from 'next/link'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { SiteFooter } from '@/components/shell/SiteFooter'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { SpecimenCard } from '@/components/shell/SpecimenCard'
import { parseThemePreference, THEME_COOKIE } from '@/lib/design/theme'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { SPECIMEN_KEY } from '@/lib/demo/seed'
import { DEMO_ROUTES } from '@/lib/routes'
import { TOUR_START_HREF } from '@/lib/tour'

export default async function Home() {
  const { userId } = await auth()
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)
  const signedIn = Boolean(userId)
  const specimen = DEMO_ROUTES.decision(demoDecisionIdForKey(SPECIMEN_KEY))

  const moments = [
    {
      n: '01',
      title: 'The seal',
      body: 'Five minutes after you log a decision, everything that locked is fingerprinted with SHA-256. Your browser can recheck that fingerprint at any time, and changing a single word breaks it.',
      href: `${specimen}?view=then`,
      cta: 'Verify a seal',
    },
    {
      n: '02',
      title: 'Then vs Now',
      body: 'The sealed record sits beside what actually happened. Each assumption gets a verdict, and each forecast gets a score.',
      href: `${specimen}?view=now`,
      cta: 'Compare Then and Now',
    },
    {
      n: '03',
      title: 'The strata',
      body: 'The whole archive laid down as layers of time, one lane per domain. Outcomes settle just above the decisions they belong to.',
      href: `${DEMO_ROUTES.archive}?view=strata`,
      cta: 'Dig through the strata',
    },
  ]

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader signedIn={signedIn} preference={preference} />

      <main className="mx-auto max-w-[1200px] px-4">
        <section className="grid gap-12 border-b border-rule py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="min-w-0">
            <Eyebrow>Decision archive · Time-sealed reasoning</Eyebrow>
            <h1 className="mt-5 break-words font-display text-[40px] leading-[1.02] tracking-[-0.015em] sm:text-[64px]">
              Keep the reasoning.
              <br />
              <span className="italic">Excavate it later.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2">
              Decision Archaeology records why you chose, before hindsight rewrites it. Each decision is sealed five
              minutes after you log it, then measured against what actually happened.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={TOUR_START_HREF} size="lg">
                Take the 60-second tour
              </Button>
              <Button href={DEMO_ROUTES.archive} variant="secondary" size="lg">
                Explore the demo
              </Button>
              <Button href={signedIn ? '/decisions' : '/sign-up'} variant="ghost" size="lg">
                {signedIn ? 'Open archive' : 'Start your archive'}
              </Button>
            </div>
          </div>
          <SpecimenCard href={specimen} />
        </section>

        <section aria-labelledby="three-moments" className="border-b border-rule py-16">
          <Eyebrow>Inside the demo</Eyebrow>
          <h2 id="three-moments" className="mt-3 font-display text-[32px] leading-tight sm:text-[40px]">
            Three moments
          </h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {moments.map((moment) => (
              <li key={moment.n} className="flex flex-col border-t-[1.5px] border-ink pt-4">
                <span className="font-mono text-[11px] tracking-[0.09em] text-muted">{moment.n}</span>
                <h3 className="mt-2 font-display text-[28px] leading-tight">{moment.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{moment.body}</p>
                <Link
                  href={moment.href}
                  className="mt-4 font-mono text-[11px] uppercase tracking-[0.09em] text-ink underline underline-offset-4 hover:text-ink-2"
                >
                  {moment.cta}
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-3xl text-sm leading-relaxed text-ink-2">
            Also in the archive: forecasts scored with a Brier score, field notes kept around each decision, a
            Devil&apos;s Advocate that questions you before you seal, and letters to your future self that open on
            their day.{' '}
            <Link href="/how-it-works" className="text-ink underline underline-offset-4">
              See how it works
            </Link>
          </p>
        </section>

        <section className="flex flex-col items-start gap-6 py-16 md:flex-row md:items-end md:justify-between">
          <p className="max-w-2xl font-display text-[32px] leading-tight sm:text-[40px]">
            One decision is a record. Ten become a pattern.
          </p>
          <Button href={signedIn ? '/decisions/new' : '/sign-up'} size="lg">
            {signedIn ? 'Log a decision' : 'Start your archive'}
          </Button>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
