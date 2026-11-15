import type { ComponentProps } from 'react'
import type { ClerkProvider } from '@clerk/nextjs'

/** The words on the sign-in and sign-up cards. The placeholder card shows the same title and subtitle. */
export const AUTH_COPY = {
  'sign-in': {
    title: 'Sign in',
    subtitle: 'Open your archive.',
    actionText: 'No account yet?',
    actionLink: 'Start your archive',
  },
  'sign-up': {
    title: 'Start your archive',
    subtitle: 'Keep the reasoning. Excavate it later.',
    actionText: 'Already have an archive?',
    actionLink: 'Sign in',
  },
} as const

/** Clerk's card copy in the site's own voice instead of Clerk's defaults. */
// satisfies, not a type annotation: a misspelled key written here is an error, and the exact shape stays
// visible. Keys spread in from AUTH_COPY skip that check, so keep its four names as Clerk spells them.
export const clerkLocalization = {
  signIn: { start: { ...AUTH_COPY['sign-in'] } },
  signUp: { start: { ...AUTH_COPY['sign-up'] } },
  dividerText: 'or',
} satisfies NonNullable<ComponentProps<typeof ClerkProvider>['localization']>
