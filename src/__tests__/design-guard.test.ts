import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

// Field Archive design rules: colors come only from tokens, never raw Tailwind
// palette classes or hex values, and icons are lucide-react, never emoji.
const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
// API routes are skipped: their only markup is inline-styled email HTML, a separate medium the tokens cannot reach.
const SKIP = new Set([path.join(SRC, '__tests__'), path.join(SRC, 'generated'), path.join(SRC, 'app', 'api')])

const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|from|via|to|fill|stroke|outline|divide|placeholder|decoration|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g
// Any hex color inside a Tailwind arbitrary value, e.g. text-[#f00] or bg-[linear-gradient(...,#fff,...)]
const ARBITRARY_HEX = /\[[^\]"'\s]*#[0-9a-fA-F]{3,8}[^\]"'\s]*\]/g
const EMOJI = /\p{Extended_Pictographic}/gu

// A hex color as a string literal, e.g. stroke="#e5e7eb" or a ternary of hex values in an SVG prop.
const QUOTED_HEX = /(['"`])#[0-9a-fA-F]{3,8}\1/g
// The token map is the one place hex values are allowed.
const TOKEN_SOURCE = 'src/lib/design/tokens.ts'

export function findDesignViolations(source: string): string[] {
  return [
    ...(source.match(PALETTE_CLASS) ?? []),
    ...(source.match(ARBITRARY_HEX) ?? []),
    ...(source.match(QUOTED_HEX) ?? []),
    ...(source.match(EMOJI) ?? []),
  ]
}

/** Every .tsx and .ts source file (class names also live in .ts helpers such as outcome color maps). */
function allSourceFiles(dir = SRC): string[] {
  if (SKIP.has(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return allSourceFiles(full)
    const isSource = (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.d.ts')
    return isSource ? [path.relative(ROOT, full).split(path.sep).join('/')] : []
  })
}

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8')

describe('design guard', () => {
  it('detects each violation type', () => {
    expect(findDesignViolations('className="bg-gray-50"')).toHaveLength(1)
    expect(findDesignViolations('className="text-[#ff0000]"')).toHaveLength(1)
    expect(findDesignViolations('className="bg-[linear-gradient(180deg,#f4efe6_0%,#fff_100%)]"')).toHaveLength(1)
    expect(findDesignViolations('<span>\u{1F512}</span>')).toHaveLength(1)
    expect(findDesignViolations('<circle stroke="#e5e7eb" />')).toHaveLength(1)
    expect(findDesignViolations("stroke={ok ? '#10b981' : '#ef4444'}")).toHaveLength(2)
    expect(findDesignViolations('className="bg-paper text-ink"')).toEqual([])
  })

  it('finds no violations in any source file', () => {
    const offenders = allSourceFiles()
      .filter((file) => file !== TOKEN_SOURCE)
      .filter((file) => findDesignViolations(read(file)).length > 0)
    expect(offenders).toEqual([])
  })
})
