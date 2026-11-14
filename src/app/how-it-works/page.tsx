import Link from 'next/link'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { CaseStudySeal } from '@/components/case-study/CaseStudySeal'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { StrataColumn } from '@/components/decisions/StrataColumn'
import { SiteFooter } from '@/components/shell/SiteFooter'
import { SiteHeader } from '@/components/shell/SiteHeader'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { caseStudyData } from '@/lib/case-study'
import { DEMO_NOW } from '@/lib/demo/clock'
import { parseThemePreference, THEME_COOKIE } from '@/lib/design/theme'
import { DEMO_ROUTES } from '@/lib/routes'
import { docHref, DOCS, GITHUB_URL } from '@/lib/site'
import { TEST_STATS } from '@/lib/test-stats'
import { TOUR_START_HREF } from '@/lib/tour'

export const metadata = {
  title: 'How it works | Decision Archaeology',
  description:
    'An engineering case study: SHA-256 seals verified in the browser, Then vs Now, a strata timeline, Brier-scored forecasts and schema-checked AI.',
}

const PHASES = 12
const SEAL_VERSIONS = [
  { version: 'da-seal-v1', covers: 'the base record: every field that locks.' },
  { version: 'da-seal-v2', covers: 'adds the forecasts, used only when a record has them.' },
  { version: 'da-seal-v3', covers: "adds the Devil's Advocate step: its outcome, the model, and the questions when they were asked." },
  { version: 'da-seal-v4', covers: "adds a letter's opening day and the SHA-256 of its text, never the text itself." },
]

const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const prose = 'max-w-3xl text-base leading-relaxed text-ink-2'
const sectionTitle = 'font-display text-[32px] leading-tight sm:text-[40px]'
const subTitle = 'font-display text-[24px] leading-tight'
const demoLink = `${mono} mt-4 inline-block text-ink underline underline-offset-4 hover:text-ink-2`

export default async function HowItWorks() {
  const { userId } = await auth()
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)
  const { record, reviews, revisit, payload, version, brier, scored, strata } = caseStudyData()
  const decisionHref = DEMO_ROUTES.decision(record.id)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader signedIn={Boolean(userId)} preference={preference} />

      <main className="mx-auto max-w-[1200px] px-4">
        <div className="border-b border-rule py-16">
          <Eyebrow>Case study</Eyebrow>
          <h1 className="mt-5 font-display text-[40px] leading-[1.02] tracking-[-0.015em] sm:text-[64px]">How it works</h1>
          <p className={`mt-6 ${prose}`}>
            A decision journal that seals your reasoning before the outcome arrives, then measures it against what
            happened. Everything below is live: the components are the ones the app uses, fed by the demo archive.
          </p>
        </div>

        <section aria-labelledby="problem" className="border-b border-rule py-12">
          <h2 id="problem" className={sectionTitle}>
            The problem
          </h2>
          <p className={`mt-4 ${prose}`}>
            Hindsight rewrites why we chose. Once an outcome is known, memory quietly edits the reasoning to fit it:
            the good calls feel obvious and the bad ones feel like bad luck. Decision Archaeology keeps the reasoning
            as it was, sealed before the outcome, so it can be compared honestly later. The demo belongs to Rowan
            Hale, a fictional engineer turned founder, with eighteen months of decisions.
          </p>
        </section>

        <section aria-labelledby="moments" className="border-b border-rule py-12">
          <h2 id="moments" className={sectionTitle}>
            Three moments
          </h2>
          <div className="mt-8 flex flex-col gap-12">
            <article className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h3 className={subTitle}>The seal</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">
                  Verify recomputes the fingerprint of DA-0007 in your browser and compares it with the one stored at
                  sealing. Tick the box to change one word of the reasoning, then verify again.
                </p>
                <Link href={`${decisionHref}?view=then`} className={demoLink}>
                  Open in the demo
                </Link>
              </div>
              <div className="min-w-0">
                <CaseStudySeal record={record} />
              </div>
            </article>

            <article className="flex flex-col gap-6">
              <div>
                <h3 className={subTitle}>Then vs Now</h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">
                  The sealed record beside what happened: assumptions with verdicts, forecasts with their resolutions,
                  outcomes as they arrived. Switch between the two.
                </p>
                <Link href={`${decisionHref}?view=now`} className={demoLink}>
                  Open in the demo
                </Link>
              </div>
              <div className="min-w-0 rounded-sm border border-rule bg-paper p-4">
                <DecisionDetail
                  decision={record}
                  readOnly
                  timeZone="UTC"
                  now={DEMO_NOW}
                  reviews={reviews}
                  initialView="now"
                  syncUrl={false}
                  revisit={revisit}
                />
              </div>
            </article>

            <article className="flex flex-col gap-6">
              <div>
                <h3 className={subTitle}>The strata</h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">
                  Every decision laid down in time, one lane per domain, with outcomes settled just above the decisions
                  they belong to. Select a decision to open it in the demo.
                </p>
                <Link href={`${DEMO_ROUTES.archive}?view=strata`} className={demoLink}>
                  Open in the demo
                </Link>
              </div>
              <div className="min-w-0">
                <StrataColumn layout={strata} routes={DEMO_ROUTES} pageParams="" cappedTotal={null} yearBase={DEMO_ROUTES.archive} />
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="hood" className="border-b border-rule py-12">
          <h2 id="hood" className={sectionTitle}>
            Under the hood
          </h2>
          <div className="mt-8 flex flex-col gap-10">
            <div>
              <h3 className={subTitle}>The seal</h3>
              <p className={`mt-3 ${prose}`}>
                When the five-minute edit window closes, the server builds a canonical payload: every field that locks,
                in a fixed key order, with text normalised to Unicode NFC and line endings unified. It takes the
                SHA-256 of that text with Web Crypto. The browser runs the same code, so Verify needs no server at all.
                This is the payload of DA-0007, exactly as it is hashed:
              </p>
              <pre className="mt-4 max-h-80 overflow-auto rounded-sm border border-rule bg-surface p-4 font-mono text-[12px] leading-relaxed text-ink">
                <code>{payload}</code>
              </pre>
              <ul className="mt-4 flex max-w-3xl flex-col gap-2 text-sm leading-relaxed text-ink-2">
                {SEAL_VERSIONS.map((item) => (
                  <li key={item.version}>
                    <code className="font-mono text-ink">{item.version}</code> {item.covers}
                  </li>
                ))}
              </ul>
              <p className={`mt-4 ${prose}`}>
                A newer version is used only when its new field exists, so every older seal still verifies byte for
                byte. DA-0007 carries a letter, so it uses <code className="font-mono text-ink">{version}</code>.
              </p>
            </div>

            <div>
              <h3 className={subTitle}>Calibration</h3>
              <p className={`mt-3 ${prose}`}>
                A forecast is a yes or no statement with a probability from 5% to 95% and a date to resolve by. Once
                resolved it is scored with the Brier score,{' '}
                <code className="font-mono text-ink">mean of (p - o)²</code>, where p is the stated probability and o
                is 1 if it happened and 0 if it did not. Zero is perfect, and always answering 50% scores 0.25. Across{' '}
                {scored} scored forecasts, Rowan scores{' '}
                <strong className="font-medium text-ink">{brier === null ? 'nothing yet' : brier.toFixed(2)}</strong>.
                Reliability bands then compare each stated probability with how often those forecasts came true.
              </p>
            </div>

            <div>
              <h3 className={subTitle}>AI</h3>
              <p className={`mt-3 ${prose}`}>
                Every AI call goes through one client and OpenRouter&apos;s Auto Router, which picks a model per
                request. The response format is a strict JSON Schema generated from a Zod schema. The reply is
                validated again with Zod, and an invalid one gets a single repair attempt before the call fails. A
                cost tier steers the router per task, and each result credits the model that actually answered. Two
                pipelines use it: pattern reports across the archive, and the Devil&apos;s Advocate questions asked
                before sealing.
              </p>
            </div>

            <div>
              <h3 className={subTitle}>Integrity</h3>
              <p className={`mt-3 ${prose}`}>
                The rules live on the server, never only in the form. A decision locks five minutes after it is
                logged; after that only typo corrections with an audit trail are possible, and the seal keeps covering
                the original text. Writes that could race use conditional updates, so a late autosave never lands on
                a sealed record. Letters are hidden by construction: one module reads their text, and a test scans the
                source to keep it that way.
              </p>
            </div>

            <div>
              <h3 className={subTitle}>Testing</h3>
              <p className={`mt-3 ${prose}`}>
                Vitest and Testing Library cover the pure modules, the API routes and the components, including tests
                that no function crosses from a server page to a client component. Guards scan the source for raw
                colours, dashes and letter reads. Playwright smoke tests drive the production build in Chrome: the
                tour, the seal check, and the main pages at phone and desktop widths.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="numbers" className="border-b border-rule py-12">
          <h2 id="numbers" className={sectionTitle}>
            By the numbers
          </h2>
          <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { label: 'Test files', value: TEST_STATS.files },
              { label: 'Tests', value: TEST_STATS.cases },
              { label: 'Build phases', value: PHASES },
              { label: 'Seal versions', value: SEAL_VERSIONS.length },
            ].map((item) => (
              <div key={item.label} className="border-t-[1.5px] border-ink pt-3">
                <dt className={`${mono} text-muted`}>{item.label}</dt>
                <dd className="mt-2 font-display text-[40px] leading-none">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted">Test counts come from the source at build time.</p>
        </section>

        <section aria-labelledby="explore" className="py-12">
          <h2 id="explore" className={sectionTitle}>
            Keep exploring
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={TOUR_START_HREF} size="lg">
              Take the tour
            </Button>
            <Button href={DEMO_ROUTES.archive} variant="secondary" size="lg">
              Explore the demo
            </Button>
            <Button href={GITHUB_URL} variant="ghost" size="lg">
              Source on GitHub
            </Button>
          </div>
          <h3 className={`mt-10 ${mono} text-muted`}>The docs</h3>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {DOCS.map((doc) => (
              <li key={doc.file}>
                <a href={docHref(doc.file)} rel="noreferrer" className="text-sm text-ink underline underline-offset-4">
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
