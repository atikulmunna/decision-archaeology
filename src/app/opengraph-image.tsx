import { ImageResponse } from 'next/og'
import { OG_ALT, OG_SIZE, ogImageElement } from '@/lib/og-image'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = OG_ALT

export default function OpengraphImage() {
  return new ImageResponse(ogImageElement(), size)
}
