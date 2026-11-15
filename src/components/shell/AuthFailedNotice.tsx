import { ClerkFailed } from '@clerk/nextjs'
import { ReloadLink } from './ReloadLink'

/** Shown only if Clerk's code fails to load, so the placeholder card never sits there loading forever. */
export function AuthFailedNotice({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <ClerkFailed>
      <p role="alert" data-auth-failed className="text-sm leading-relaxed text-ink-2">
        {mode === 'sign-in' ? 'Sign-in could not load.' : 'Sign-up could not load.'}{' '}
        <ReloadLink mode={mode} />
      </p>
    </ClerkFailed>
  )
}
