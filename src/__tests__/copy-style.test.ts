import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

// Project writing rule: no em dash (U+2014) or en dash (U+2013) anywhere in copy, docs or comments.
const BANNED = /[\u2013\u2014]/
const ROOT = path.resolve(__dirname, '../..')
const SCAN_DIRS = ['src', 'docs', 'e2e', 'scripts']
const SCAN_FILES = ['README.md', 'LICENSE', 'src/lib/demo/report.json']
// Generated code, and the local planning docs, which are never committed.
const SKIP_DIRS = new Set([path.join(ROOT, 'src', 'generated'), path.join(ROOT, 'docs', 'superpowers')])
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.md'])

function collectFiles(dir: string): string[] {
  if (SKIP_DIRS.has(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectFiles(full)
    return EXTENSIONS.has(path.extname(entry.name)) ? [full] : []
  })
}

function scannedFiles(): string[] {
  return [
    ...SCAN_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir))),
    ...SCAN_FILES.map((file) => path.join(ROOT, file)).filter((file) => fs.existsSync(file)),
  ]
}

function findDashes(): string[] {
  const files = scannedFiles()
  return files.flatMap((file) =>
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (BANNED.test(line) ? [`${path.relative(ROOT, file)}:${i + 1}`] : []))
  )
}

describe('copy style', () => {
  it('scans the docs, the e2e scripts, the build scripts and the licence, but not the local planning docs', () => {
    const scanned = scannedFiles().map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
    expect(scanned).toEqual(
      expect.arrayContaining(['README.md', 'LICENSE', 'docs/the-seal.md', 'docs/VERCEL_DEPLOYMENT.md', 'e2e/record.ts', 'scripts/count-tests.ts'])
    )
    expect(scanned.filter((file) => file.startsWith('docs/superpowers'))).toEqual([])
  })

  it('contains no em or en dashes', () => {
    expect(findDashes()).toEqual([])
  })
})
