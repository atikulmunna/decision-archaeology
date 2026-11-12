import Link from 'next/link'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { SpecimenCard } from '@/components/shell/SpecimenCard'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { parseThemePreference, THEME_COOKIE } from '@/lib/design/theme'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { SPECIMEN_KEY } from '@/lib/demo/seed'
import { DEMO_ROUTES } from '@/lib/routes'

const STEPS = [
  {
    n: '01',
    title: 'Capture before hindsight',
    body: 'Write down the options, the reasoning and what you expect while the decision is still live.',
  },
  {
    n: '02',
    title: 'Seal',
    body: 'Five minutes later the record locks. Typos can be corrected with an audit trail; the reasoning cannot be rewritten.',
  },
  {
    n: '03',
    title: 'Excavate',
    body: 'Log outcomes as they arrive and compare them with the sealed record, one decision or a hundred at a time.',
  },
]

const FEATURES = [
  { title: 'Structured capture', body: 'Guided prompts for context, alternatives, values and uncertainty.' },
  { title: 'The five-minute seal', body: 'A server-enforced lock with typo-only corrections and an audit trail.' },
  { title: 'Outcome history', body: 'Every update is kept beside the original; nothing is overwritten.' },
  { title: 'Calibration', body: 'See how often your stated confidence matched what happened.' },
  { title: 'AI pattern reports', body: 'Recurring biases and assumptions, analyzed through OpenRouter.' },
  { title: 'Export and import', body: 'Your archive stays portable as JSON or CSV.' },
]

export default async function Home() {
  const { userId } = await auth()
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)
  const signedIn = Boolean(userId)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b-[1.5px] border-ink">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display text-[22px] leading-none">
            Decision Archaeology
          </Link>
          <div className="flex items-center gap-2">
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
              <Button href={DEMO_ROUTES.archive} size="lg">
                Explore the demo
              </Button>
              <Button href={`${DEMO_ROUTES.archive}?view=strata`} variant="ghost" size="lg">
                See the strata
              </Button>
              <Button href={signedIn ? '/decisions' : '/sign-up'} variant="secondary" size="lg">
                {signedIn ? 'Open archive' : 'Start your archive'}
              </Button>
            </div>
          </div>
          <SpecimenCard href={DEMO_ROUTES.decision(demoDecisionIdForKey(SPECIMEN_KEY))} />
        </section>

        <section aria-labelledby="how-it-works" className="border-b border-rule py-16">
          <Eyebrow>
            <span id="how-it-works">How it works</span>
          </Eyebrow>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t-[1.5px] border-ink pt-4">
                <span className="font-mono text-[11px] tracking-[0.09em] text-muted">{step.n}</span>
                <h2 className="mt-2 font-display text-[28px] leading-tight">{step.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features" className="border-b border-rule py-16">
          <Eyebrow>
            <span id="features">What is in the archive</span>
          </Eyebrow>
          <dl className="mt-8 grid gap-x-12 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-1 border-b border-rule py-4 sm:flex-row sm:gap-6">
                <dt className="font-mono text-[11px] uppercase tracking-[0.09em] text-ink sm:w-44 sm:shrink-0 sm:pt-1">
                  {feature.title}
                </dt>
                <dd className="text-sm leading-relaxed text-ink-2">{feature.body}</dd>
              </div>
            ))}
          </dl>
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

      <footer className="border-t-[1.5px] border-ink">
        <p className="mx-auto max-w-[1200px] px-4 py-5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
          Decision Archaeology · Sealed records stay sealed
        </p>
      </footer>
    </div>
  )
}
