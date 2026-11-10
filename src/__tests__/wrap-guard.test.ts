import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

// Any element that preserves user whitespace must also break long words,
// or a pasted URL scrolls the whole page sideways on a 390px phone.
const ROOT = path.resolve(__dirname, '../..')
const DIRS = ['src/components', 'src/app']

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'api' ? [] : tsxFiles(full)
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

describe('wrap guard', () => {
  it('pairs every whitespace-pre-wrap with a word-breaking utility', () => {
    const offenders = DIRS.flatMap((dir) => tsxFiles(path.join(ROOT, dir))).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /whitespace-pre-wrap/.test(line) && !/break-words|wrap-anywhere|wrap-break-word/.test(line))
        .map(({ index }) => `${path.relative(ROOT, file).split(path.sep).join('/')}:${index + 1}`)
    )
    expect(offenders).toEqual([])
  })
})
