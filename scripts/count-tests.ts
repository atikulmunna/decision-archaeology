/**
 * Writes src/generated/test-stats.json, the test numbers on the case study page. Runs before every build and
 * after every install, so the numbers always come from the code and never get typed by hand.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { summarizeTestFiles } from '../src/lib/test-count'

const root = path.resolve(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const files = walk(path.join(root, 'src', '__tests__')).map((file) => ({ path: file, source: readFileSync(file, 'utf8') }))
const stats = summarizeTestFiles(files)
const out = path.join(root, 'src', 'generated', 'test-stats.json')
mkdirSync(path.dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(stats)}\n`)
console.log(`test stats: ${stats.files} files, ${stats.cases} tests`)
