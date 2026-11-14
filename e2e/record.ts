/**
 * Records the README media into docs/media: the seal GIF (Verify, then the tamper test) and a few screenshots.
 * Not a test. Needs a production server: npm run build && npx next start -p 3100, then npm run record.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Locator, type Page } from '@playwright/test'
import { applyPalette, GIFEncoder, quantize } from 'gifenc'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const OUT = path.resolve(__dirname, '..', 'docs', 'media')
const SEAL_PAGE = '/demo/decisions/demo-0007?view=then'

const SCREENSHOTS: Array<{ file: string; path: string }> = [
  { file: 'landing.png', path: '/' },
  { file: 'tour.png', path: '/demo/decisions/demo-0007?view=then&tour=2' },
  { file: 'then-now.png', path: '/demo/decisions/demo-0007?view=now' },
  { file: 'strata.png', path: '/demo?view=strata' },
  { file: 'case-study.png', path: '/how-it-works' },
]

// Runs in the browser, so it stays plain JavaScript in a string (the TypeScript loader would add helpers to a
// function it serialises). PNG in, RGBA out, both as base64.
const DECODE_PNG = `async (base64) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0)
  const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data
  let binary = ''
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000))
  return { width: bitmap.width, height: bitmap.height, rgba: btoa(binary) }
}`

type Frame = { png: Buffer; delay: number }

async function serverAnswers(): Promise<boolean> {
  try {
    return (await fetch(`${BASE}/demo`)).ok
  } catch {
    return false
  }
}

async function openSeal(page: Page): Promise<Locator> {
  await page.goto(`${BASE}${SEAL_PAGE}`)
  await page.waitForLoadState('networkidle')
  const seal = page.getByRole('region', { name: 'Seal' })
  await seal.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  return seal
}

async function playSealScript(seal: Locator, capture: (delay: number) => Promise<void>): Promise<void> {
  await capture(1400)
  await seal.getByRole('button', { name: 'Verify seal' }).click()
  await seal.getByRole('status').waitFor()
  await capture(2400)
  await seal.getByRole('checkbox', { name: 'Try changing a word (demo)' }).check()
  await capture(1600)
  await seal.getByRole('button', { name: 'Verify seal' }).click()
  await seal.getByText('Does not match').waitFor()
  await capture(3200)
}

async function recordSealGif(page: Page, decoder: Page): Promise<void> {
  // A dry run finds the tallest state, so every frame shares one clip.
  let seal = await openSeal(page)
  let tallest = 0
  await playSealScript(seal, async () => {
    tallest = Math.max(tallest, (await seal.boundingBox())?.height ?? 0)
  })

  seal = await openSeal(page)
  const box = await seal.boundingBox()
  if (!box) throw new Error('The seal panel is not on screen')
  const pad = 16
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: tallest + pad * 2 }

  const frames: Frame[] = []
  await playSealScript(seal, async (delay) => {
    frames.push({ png: await page.screenshot({ clip }), delay })
  })

  const gif = GIFEncoder()
  for (const frame of frames) {
    const decoded = (await decoder.evaluate(`(${DECODE_PNG})(${JSON.stringify(frame.png.toString('base64'))})`)) as {
      width: number
      height: number
      rgba: string
    }
    const rgba = new Uint8Array(Buffer.from(decoded.rgba, 'base64'))
    const palette = quantize(rgba, 256)
    gif.writeFrame(applyPalette(rgba, palette), decoded.width, decoded.height, { palette, delay: frame.delay })
  }
  gif.finish()
  writeFileSync(path.join(OUT, 'seal-verify.gif'), gif.bytes())
  console.log(`seal-verify.gif: ${frames.length} frames, ${Math.round(clip.width)} by ${Math.round(clip.height)}`)
}

async function main(): Promise<void> {
  if (!(await serverAnswers())) {
    console.error(`Nothing answers at ${BASE}. Start a production server first: npm run build && npx next start -p 3100`)
    process.exit(1)
  }
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    const page = await context.newPage()
    const decoder = await context.newPage()

    for (const shot of SCREENSHOTS) {
      await page.goto(`${BASE}${shot.path}`)
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: path.join(OUT, shot.file) })
      console.log(shot.file)
    }

    await page.setViewportSize({ width: 960, height: 900 })
    await recordSealGif(page, decoder)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
