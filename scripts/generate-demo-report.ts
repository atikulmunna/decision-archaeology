/**
 * One-off: runs the live OpenRouter report pipeline over the fictional demo
 * archive and writes src/lib/demo/report.json. Only demo data leaves the machine.
 * Run with `npm run demo:report` (needs OPENROUTER_API_KEY in .env.local).
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateDemoReportFile, unknownAffectedDecisions } from '@/lib/demo/report-file'
import { DEMO_SEEDS } from '@/lib/demo/seed'

const OUT_FILE = path.resolve(process.cwd(), 'src/lib/demo/report.json')
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u

async function main() {
  const file = await generateDemoReportFile()

  const unknown = unknownAffectedDecisions(
    file,
    DEMO_SEEDS.map((seed) => seed.title)
  )
  if (unknown.length > 0) {
    throw new Error(`The report names decisions that are not in the seed: ${unknown.join('; ')}`)
  }
  if (PICTOGRAPHIC.test(JSON.stringify(file))) {
    throw new Error('The report contains emoji.')
  }

  writeFileSync(OUT_FILE, `${JSON.stringify(file, null, 2)}\n`)
  console.log(`Wrote ${OUT_FILE}`)
  console.log(`Models: ${file.modelsUsed.join(', ')}`)
  console.log(`Findings: ${file.findings.length}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
