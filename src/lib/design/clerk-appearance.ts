/**
 * Styles Clerk's sign-in, sign-up and account UI with Field Archive token classes.
 * Every class carries Tailwind's important modifier (`!`) because Clerk injects its
 * own component styles, which otherwise win over utility classes.
 */
export const clerkAppearance = {
  variables: {
    borderRadius: '2px',
    fontFamily: 'var(--font-sans)',
  },
  elements: {
    cardBox: 'shadow-none! rounded-sm! border! border-rule!',
    card: 'bg-surface! shadow-none! rounded-none!',
    headerTitle: 'font-display! font-normal! text-[28px]! text-ink!',
    headerSubtitle: 'text-muted!',
    socialButtonsBlockButton: 'border! border-rule! bg-surface! text-ink! rounded-sm! shadow-none! hover:bg-sunken!',
    socialButtonsBlockButtonText: 'text-ink!',
    dividerLine: 'bg-rule!',
    dividerText: 'text-muted!',
    formFieldLabel: 'text-ink-2!',
    formFieldAction: 'text-signal-ink!',
    formFieldInput: 'bg-surface! border! border-rule! text-ink! rounded-sm! shadow-none!',
    formButtonPrimary:
      'bg-none! bg-primary! text-on-primary! shadow-none! rounded-sm! font-mono! uppercase! tracking-[0.09em]! text-xs! hover:opacity-90!',
    footer: 'bg-none! bg-paper!',
    footerActionText: 'text-muted!',
    footerActionLink: 'text-signal-ink! hover:text-ink!',
    identityPreviewText: 'text-ink!',
    userButtonPopoverCard: 'bg-surface! border! border-rule! rounded-sm! shadow-none!',
    userButtonPopoverActionButton: 'text-ink! hover:bg-sunken!',
  },
}
