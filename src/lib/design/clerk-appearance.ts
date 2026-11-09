/** Styles Clerk's sign-in, sign-up and account UI with Field Archive token classes. */
export const clerkAppearance = {
  variables: {
    borderRadius: '2px',
    fontFamily: 'var(--font-sans)',
  },
  elements: {
    card: 'bg-surface border border-rule rounded-sm shadow-none',
    headerTitle: 'font-display text-ink font-normal',
    headerSubtitle: 'text-muted',
    socialButtonsBlockButton: 'border border-rule bg-surface text-ink hover:bg-sunken rounded-sm',
    dividerLine: 'bg-rule',
    dividerText: 'text-muted',
    formFieldLabel: 'text-ink-2',
    formFieldInput: 'bg-surface border border-rule text-ink rounded-sm',
    formButtonPrimary: 'bg-primary text-on-primary hover:opacity-90 rounded-sm font-mono uppercase tracking-[0.09em] text-xs shadow-none',
    footer: 'bg-paper',
    footerActionText: 'text-muted',
    footerActionLink: 'text-signal-ink hover:text-ink',
    identityPreviewText: 'text-ink',
    userButtonPopoverCard: 'bg-surface border border-rule rounded-sm',
    userButtonPopoverActionButton: 'text-ink hover:bg-sunken',
  },
}
