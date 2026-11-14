import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const SRC = path.resolve(__dirname, '../..')
// The only code allowed to read a letter's body: the reading library and the draft routes.
const ALLOWED = ['lib/letters.ts', 'app/api/decisions/[id]/route.ts']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

const relative = (file: string) => path.relative(SRC, file).split(path.sep).join('/')

describe('letter privacy', () => {
  it('only letters.ts and the draft routes select the letter body', () => {
    const readers = sourceFiles(SRC)
      .filter((file) => /letter\.(findFirst|findUnique|findMany)\(\{[\s\S]{0,300}?body: true/.test(readFileSync(file, 'utf8')))
      .map(relative)
    expect(readers.sort()).toEqual([...ALLOWED].sort())
  })

  it('never includes a whole letter row anywhere', () => {
    const wholeRows = sourceFiles(SRC)
      .filter((file) => /letter: true|include: \{[^}]*letter: \{ (include|where)/.test(readFileSync(file, 'utf8')))
      .map(relative)
    expect(wholeRows).toEqual([])
  })
})
