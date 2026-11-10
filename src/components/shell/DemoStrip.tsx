import Link from 'next/link'

/** The thin band under the demo masthead that says what the visitor is looking at. */
export function DemoStrip({ cta }: { cta: { href: string; label: string } }) {
  return (
    <div className="border-b border-rule bg-highlight">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-ink">Demo archive · Fictional data · Read-only</p>
        <Link
          href={cta.href}
          className="font-mono text-[11px] uppercase tracking-[0.09em] text-ink underline underline-offset-4 hover:no-underline"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  )
}
