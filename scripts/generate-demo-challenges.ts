/**
 * One-off: runs the live Devil's Advocate prompt over the fictional demo decisions and writes
 * src/lib/demo/challenges.json. Only demo data leaves the machine.
 * Run with `npm run demo:challenges` (needs OPENROUTER_API_KEY in .env.local).
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateDemoChallengeFile } from '@/lib/demo/challenge-file'
import { DemoChallengeFileSchema } from '@/lib/demo/challenges'

const OUT_FILE = path.resolve(process.cwd(), 'src/lib/demo/challenges.json')
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)

async function main() {
  const file = DemoChallengeFileSchema.parse(await generateDemoChallengeFile())
  const text = JSON.stringify(file)
  if (PICTOGRAPHIC.test(text)) throw new Error('The questions contain emoji.')
  if (DASH.test(text)) throw new Error('The questions contain an em or en dash.')

  writeFileSync(OUT_FILE, `${JSON.stringify(file, null, 2)}\n`)
  console.log(`Wrote ${OUT_FILE}`)
  for (const [key, entry] of Object.entries(file.challenges)) {
    console.log(`${key} (${entry.model}):`)
    for (const question of entry.questions) console.log(`  - ${question}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
