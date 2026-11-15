import { ClerkFailed } from '@clerk/nextjs'

/** Shown only if Clerk's code fails to load, so the placeholder card never sits there loading forever. */
export function AuthFailedNotice({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const path = `/${mode}`
  return (
    <ClerkFailed>
      <p role="alert" data-auth-failed className="text-sm leading-relaxed text-ink-2">
        {mode === 'sign-in' ? 'Sign-in could not load.' : 'Sign-up could not load.'}{' '}
        {/* A full reload, not a client navigation, so Clerk's script is fetched again. */}
        <a href={path} className="text-ink underline underline-offset-4">
          Reload the page
        </a>
      </p>
    </ClerkFailed>
  )
}
