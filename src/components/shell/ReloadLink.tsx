'use client'

/**
 * A plain link back to the page the visitor is on, query included, so a reload after Clerk fails keeps
 * where they were heading (redirect_url) and any step of the flow. A plain <a>, not a client navigation,
 * so Clerk's script is fetched again. Only rendered in the browser, inside ClerkFailed.
 */
export function ReloadLink({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const base = `/${mode}`
  const here = typeof window === 'undefined' ? null : window.location
  const path = here && (here.pathname === base || here.pathname.startsWith(`${base}/`)) ? here.pathname : base
  return (
    <a href={`${path}${here?.search ?? ''}`} className="text-ink underline underline-offset-4">
      Reload the page
    </a>
  )
}
