import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')
const read = (file: string) => fs.readFileSync(path.join(ROOT, file))

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
