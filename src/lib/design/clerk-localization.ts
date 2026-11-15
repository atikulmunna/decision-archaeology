import type { ComponentProps } from 'react'
import type { ClerkProvider } from '@clerk/nextjs'

/** The words on Clerk's sign-in and sign-up cards, in the site's own voice instead of Clerk's defaults. */
export const clerkLocalization: ComponentProps<typeof ClerkProvider>['localization'] = {
  signIn: {
    start: {
      title: 'Sign in',
      subtitle: 'Open your archive.',
      actionText: 'No account yet?',
      actionLink: 'Start your archive',
    },
  },
  signUp: {
    start: {
      title: 'Start your archive',
      subtitle: 'Keep the reasoning. Excavate it later.',
      actionText: 'Already have an archive?',
      actionLink: 'Sign in',
    },
  },
  dividerText: 'or',
}
