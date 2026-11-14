import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DOCS, LIVE_URL } from '@/lib/site'

const ROOT = path.resolve(__dirname, '../..')
const read = (file: string) => fs.readFileSync(path.join(ROOT, file))
const text = (file: string) => read(file).toString('utf8').replace(/\r\n/g, '\n')

describe('README and docs', () => {
  it('has every explanation doc, each opening with a title', () => {
    for (const doc of DOCS) expect(text(`docs/${doc.file}`).startsWith('# '), doc.file).toBe(true)
  })

  it('keeps the README to about a page that links everything', () => {
    const readme = text('README.md')
    for (const doc of DOCS) expect(readme, doc.file).toContain(`docs/${doc.file}`)
    expect(readme).toContain('(LICENSE)')
    expect(readme).toContain('docs/media/seal-verify.gif')
    expect(readme).toContain(LIVE_URL)
    expect(readme).toContain('/how-it-works')
    expect(readme).not.toMatch(/^#+ Roadmap/m)
    expect(readme.trimEnd().split('\n').length).toBeLessThanOrEqual(110)
  })

  it('is MIT licensed by atikulmunna', () => {
    const licence = text('LICENSE')
    expect(licence.startsWith('MIT License')).toBe(true)
    expect(licence).toContain('2026 atikulmunna')
  })
})

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const SCREENSHOTS = ['landing.png', 'then-now.png', 'strata.png', 'tour.png', 'case-study.png']

describe('recorded media', () => {
  it('keeps the seal GIF in docs/media, small enough for the README', () => {
    const gif = read('docs/media/seal-verify.gif')
    expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a')
    expect(gif.length).toBeLessThan(3_000_000)
  })

  it('keeps the screenshots as real PNG files', () => {
    for (const file of SCREENSHOTS) {
      expect(read(`docs/media/${file}`).subarray(0, 8).equals(PNG_SIGNATURE), file).toBe(true)
    }
  })
})
