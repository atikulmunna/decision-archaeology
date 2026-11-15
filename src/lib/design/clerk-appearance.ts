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
    headerSubtitle: 'text-ink-2!',
    socialButtonsBlockButton: 'border! border-rule! bg-surface! text-ink! rounded-sm! shadow-none! hover:bg-sunken!',
    socialButtonsBlockButtonText: 'text-ink! font-mono! text-[11px]! uppercase! tracking-[0.09em]!',
    dividerLine: 'bg-rule!',
    dividerText: 'text-muted! font-mono! text-[11px]! uppercase! tracking-[0.09em]!',
    formFieldLabel: 'text-ink-2! font-mono! text-[11px]! uppercase! tracking-[0.09em]!',
    formFieldAction: 'text-signal-ink!',
    formFieldInput:
      'bg-surface! border! border-rule! text-ink! rounded-sm! shadow-none! focus:border-ink! focus:shadow-[0_0_0_3px_var(--color-signal)]!',
    formButtonPrimary:
      'bg-none! bg-primary! text-on-primary! shadow-none! rounded-sm! font-mono! uppercase! tracking-[0.09em]! text-xs! hover:opacity-90!',
    // The card's footer sits on the card surface under a rule, not in a grey band.
    footer: 'bg-none! bg-surface! border-t! border-rule!',
    footerActionText: 'text-muted!',
    footerActionLink: 'text-ink! underline! underline-offset-4! hover:text-ink-2!',
    // Later steps: the email being verified, the code boxes and the other ways to sign in.
    identityPreview: 'border! border-rule! bg-sunken! rounded-sm! shadow-none!',
    identityPreviewText: 'text-ink!',
    identityPreviewEditButton: 'text-signal-ink!',
    otpCodeFieldInput: 'border! border-rule! bg-surface! text-ink! rounded-sm! focus:border-ink!',
    formResendCodeLink: 'text-signal-ink!',
    alternativeMethodsBlockButton: 'border! border-rule! bg-surface! text-ink! rounded-sm! shadow-none! hover:bg-sunken!',
    userButtonPopoverCard: 'bg-surface! border! border-rule! rounded-sm! shadow-none!',
    userButtonPopoverActionButton: 'text-ink! hover:bg-sunken!',
  },
}
