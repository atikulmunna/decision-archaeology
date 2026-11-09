import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { contrastRatio } from '@/lib/design/contrast'
import { CONTRAST_PAIRS, THEMES, TOKEN_NAMES, tokens, type TokenName } from '@/lib/design/tokens'

const CSS_PATH = path.resolve(__dirname, '../../../app/globals.css')

function readThemeBlock(css: string, selector: string): Record<TokenName, string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`selector ${selector} not found`)
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const block = css.slice(open + 1, close)
  const values: Partial<Record<TokenName, string>> = {}
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    const name = match[1] as TokenName
    if ((TOKEN_NAMES as readonly string[]).includes(name)) values[name] = match[2].toUpperCase()
  }
  return values as Record<TokenName, string>
}

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })
})

describe('design tokens', () => {
  it.each(THEMES)('every text pair reaches 4.5:1 in %s', (theme) => {
    const failures = CONTRAST_PAIRS.map(([fg, bg]) => ({
      pair: `${fg} on ${bg}`,
      ratio: contrastRatio(tokens[theme][fg], tokens[theme][bg]),
    })).filter((r) => r.ratio < 4.5)
    expect(failures).toEqual([])
  })

  it('globals.css declares every token with the same value per theme', () => {
    const css = readFileSync(CSS_PATH, 'utf8')
    expect(readThemeBlock(css, ':root')).toEqual(tokens.light)
    expect(readThemeBlock(css, '[data-theme="dark"]')).toEqual(tokens.dark)
  })

  it('disables motion for reduced-motion users and styles focus with signal-ink', () => {
    const css = readFileSync(CSS_PATH, 'utf8')
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--signal-ink\)/)
  })
})
