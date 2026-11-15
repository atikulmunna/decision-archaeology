import { describe, expect, it } from 'vitest'
import { clerkAppearance } from '@/lib/design/clerk-appearance'
import { clerkLocalization } from '@/lib/design/clerk-localization'

describe('clerkAppearance', () => {
  it('marks every element class important so Clerk built-in styles cannot override the tokens', () => {
    const notImportant = Object.entries(clerkAppearance.elements).flatMap(([element, classes]) =>
      classes
        .split(/\s+/)
        .filter(Boolean)
        .filter((cls) => !cls.endsWith('!'))
        .map((cls) => `${element}: ${cls}`)
    )
    expect(notImportant).toEqual([])
  })

  it('styles the card wrapper and the primary button without shadows or gradients', () => {
    expect(clerkAppearance.elements.cardBox).toMatch(/shadow-none!/)
    expect(clerkAppearance.elements.formButtonPrimary).toMatch(/bg-none!/)
    expect(clerkAppearance.elements.formButtonPrimary).toMatch(/bg-primary!/)
  })

  it("sets labels, the divider and social buttons in the site's small uppercase mono", () => {
    for (const element of ['formFieldLabel', 'dividerText'] as const) {
      expect(clerkAppearance.elements[element]).toMatch(/font-mono!/)
      expect(clerkAppearance.elements[element]).toMatch(/uppercase!/)
    }
    expect(clerkAppearance.elements.socialButtonsBlockButtonText).toMatch(/font-mono!/)
  })

  it('keeps the footer on the card surface under a rule, not in a grey band', () => {
    expect(clerkAppearance.elements.footer).toMatch(/bg-surface!/)
    expect(clerkAppearance.elements.footer).toMatch(/border-rule!/)
    expect(clerkAppearance.elements.footer).not.toMatch(/bg-paper!/)
  })

  it('keeps text and the Back link of later steps readable in dark mode', () => {
    expect(clerkAppearance.elements.cardBox).toMatch(/text-ink!/)
    expect(clerkAppearance.elements).toHaveProperty('backLink')
    expect((clerkAppearance.elements as Record<string, string>).backLink).toMatch(/text-ink/)
  })

  it('marks the focused field and styles the code and identity steps too', () => {
    expect(clerkAppearance.elements.formFieldInput).toMatch(/focus:border-ink!/)
    expect(clerkAppearance.elements).toHaveProperty('otpCodeFieldInput')
    expect(clerkAppearance.elements).toHaveProperty('identityPreview')
  })
})

describe('clerkLocalization', () => {
  it("speaks in the site's voice on both cards", () => {
    expect(clerkLocalization?.signIn?.start).toMatchObject({
      title: 'Sign in',
      subtitle: 'Open your archive.',
      actionText: 'No account yet?',
      actionLink: 'Start your archive',
    })
    expect(clerkLocalization?.signUp?.start).toMatchObject({
      title: 'Start your archive',
      subtitle: 'Keep the reasoning. Excavate it later.',
      actionText: 'Already have an archive?',
      actionLink: 'Sign in',
    })
    expect(clerkLocalization?.dividerText).toBe('or')
  })
})
