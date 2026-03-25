import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'

const PRINCIPLES = [
  {
    title: 'Capture before hindsight',
    body: 'Log the reasoning, alternatives, and uncertainty while the decision is still alive. The record keeps your original thinking intact.',
  },
  {
    title: 'Track what actually happened',
    body: 'Outcome updates turn vague memories into evidence. Over time you build a feedback loop, not just a journal.',
  },
  {
    title: 'See patterns across decisions',
    body: 'Bias reports and calibration views help you notice recurring assumptions, overconfidence, and where your calls tend to drift.',
  },
]

const FEATURE_COLUMNS = [
  {
    heading: 'Decision Capture',
    points: [
      'Structured reasoning prompts',
      '5-minute time capsule lock window',
      'Attachments, tags, and confidence scoring',
    ],
  },
  {
    heading: 'Reflection Layer',
    points: [
      'Outcome history over time',
      'Correction requests with audit trail',
      'Supplementary notes that preserve the original record',
    ],
  },
  {
    heading: 'Pattern Intelligence',
    points: [
      'Bias reports after 10 logged decisions',
      'Calibration scoring from predictions vs reality',
      'Searchable archive with structured filters',
    ],
  },
]

export default async function Home() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4efe6_0%,#f8fafc_40%,#ffffff_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(217,119,6,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,116,144,0.20),_transparent_34%),radial-gradient(circle_at_center,_rgba(15,23,42,0.06),_transparent_52%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">
              🏺
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Decision Archaeology
              </p>
              <p className="text-xs text-slate-500">Personal decision intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={userId ? '/decisions' : '/sign-in'}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {userId ? 'Open app' : 'Sign in'}
            </Link>
            <Link
              href={userId ? '/decisions/new' : '/sign-up'}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {userId ? 'Log a decision' : 'Get started'}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-12 lg:py-16">
          <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Structured reasoning archive
              </p>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight text-slate-950 sm:text-6xl">
                Preserve why you made the decision, not just what happened after.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Decision Archaeology helps you log important choices before hindsight rewrites them, revisit the original reasoning later, and spot long-term patterns in your judgment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={userId ? '/decisions/new' : '/sign-up'}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {userId ? 'Log your next decision' : 'Start your archive'}
                </Link>
                <Link
                  href={userId ? '/decisions' : '/sign-in'}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {userId ? 'Go to dashboard' : 'I already have an account'}
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                  <p className="text-2xl font-semibold text-slate-950">5 min</p>
                  <p className="mt-1 text-sm text-slate-600">final edit window before the decision becomes a time capsule</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                  <p className="text-2xl font-semibold text-slate-950">10+</p>
                  <p className="mt-1 text-sm text-slate-600">decisions unlock bias reports and a clearer pattern signal</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                  <p className="text-2xl font-semibold text-slate-950">0 hindsight</p>
                  <p className="mt-1 text-sm text-slate-600">inside the locked record once the decision window closes</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full bg-amber-200/50 blur-2xl lg:block" />
              <div className="absolute -right-4 bottom-10 hidden h-32 w-32 rounded-full bg-cyan-200/60 blur-2xl lg:block" />

              <div className="relative rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Example decision
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      Should I accept the senior role at Acme?
                    </h2>
                  </div>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    Career
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reasoning snapshot</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      The opportunity compounds my future options, but only if the team quality is real and the extra responsibility does not erase the lifestyle gains.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Prediction</p>
                      <p className="mt-2 text-sm leading-6 text-amber-950">
                        I expect the move to feel stressful for one quarter, then clearly worthwhile inside a year.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Outcome layer</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-950">
                        Log what actually happened later, compare it to your original call, and keep the revision history visible.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Long-term value</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      One decision is a record. Ten decisions become a pattern. That is when calibration and bias reporting start becoming genuinely useful.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-20 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
                <h3 className="text-lg font-semibold text-slate-950">{principle.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{principle.body}</p>
              </div>
            ))}
          </section>

          <section className="mt-20 rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_20px_70px_rgba(15,23,42,0.16)] sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                What the product already does
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Built for reflective people who want evidence, not just vibes, about their decisions.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {FEATURE_COLUMNS.map((column) => (
                <div key={column.heading} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold">{column.heading}</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {column.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="text-amber-300">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
