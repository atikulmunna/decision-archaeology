import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

// Project writing rule: no em dash (U+2014) or en dash (U+2013) anywhere in copy, docs or comments.
const BANNED = /[\u2013\u2014]/
const ROOT = path.resolve(__dirname, '../..')
const SCAN_DIRS = ['src']
const SCAN_FILES = ['README.md', 'docs/VERCEL_DEPLOYMENT.md']
const SKIP_DIRS = new Set([path.join(ROOT, 'src', 'generated')])
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.md'])

function collectFiles(dir: string): string[] {
  if (SKIP_DIRS.has(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(full)
    return EXTENSIONS.has(path.extname(entry.name)) ? [full] : []
  })
}

function findDashes(): string[] {
  const files = [
    ...SCAN_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir))),
    ...SCAN_FILES.map((file) => path.join(ROOT, file)).filter((file) => fs.existsSync(file)),
  ]
  return files.flatMap((file) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (BANNED.test(line) ? [`${path.relative(ROOT, file)}:${i + 1}`] : []))
  )
}

describe('copy style', () => {
  it('contains no em or en dashes', () => {
    expect(findDashes()).toEqual([])
  })
})
