import { describe, expect, it } from 'vitest'
import { clerkAppearance } from '@/lib/design/clerk-appearance'

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
})
