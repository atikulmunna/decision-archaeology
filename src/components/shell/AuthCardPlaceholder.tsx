import { AUTH_COPY } from '@/lib/design/clerk-localization'

const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const field = 'h-[34px] rounded-sm border border-rule'
// Sign-in asks for an email; sign-up for an email and a password (with usernames switched off in Clerk).
const FIELDS = { 'sign-in': 1, 'sign-up': 2 } as const

/**
 * A stand-in for Clerk's card, sent with the page so the form area is never empty while Clerk's own code
 * downloads. Same frame, width and roughly the same height, so the real card replaces it without a jump.
 */
export function AuthCardPlaceholder({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const copy = AUTH_COPY[mode]
  return (
    <div className="w-full overflow-hidden rounded-sm border border-rule bg-surface group-has-[[data-auth-failed]]:hidden">
      <p role="status" className="sr-only">
        {mode === 'sign-in' ? 'Loading sign-in' : 'Loading sign-up'}
      </p>
      {/* Clerk's card needs JavaScript; without it, say so instead of showing a card that never loads. */}
      <noscript>
        <p className="px-10 pt-6 text-center text-sm text-ink-2">
          {mode === 'sign-in' ? 'Signing in' : 'Signing up'} needs JavaScript. Turn it on and reload the page.
        </p>
      </noscript>
      <div aria-hidden="true">
        <div className="flex flex-col gap-7 px-10 pb-10 pt-8">
          <div className="text-center">
            <p className="font-display text-[28px] leading-tight text-ink">{copy.title}</p>
            <p className="mt-1 text-sm text-ink-2">{copy.subtitle}</p>
          </div>
          <div className={field} />
          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-rule" />
            <span className={`${mono} text-muted`}>or</span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          {Array.from({ length: FIELDS[mode] }, (_, index) => (
            <div key={index} data-field className="flex flex-col gap-2">
              <span className="h-3 w-28 rounded-sm bg-sunken" />
              <div className={field} />
            </div>
          ))}
          <div className="h-[30px] rounded-sm bg-primary opacity-30 motion-safe:animate-pulse" />
        </div>
        <p className="border-t border-rule px-10 py-4 text-center text-sm text-muted">
          {copy.actionText} <span className="text-ink underline underline-offset-4">{copy.actionLink}</span>
        </p>
        <div className="h-11 border-t border-rule" />
      </div>
    </div>
  )
}
