import type { ReactElement } from 'react'
import { tokens } from '@/lib/design/tokens'

/** The link preview card, drawn by next/og (Satori), so only inline flex styles and the default font. */

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_ALT = 'Decision Archaeology: keep the reasoning, excavate it later.'

const ink = tokens.light.ink
const signal = tokens.light.signal
const paper = tokens.light.paper
const muted = tokens.dark.muted

export function ogImageElement(title?: string): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background: ink,
        color: paper,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: muted }}>
          Decision archive · Time-sealed reasoning
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>
          Decision Archaeology
        </div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 40, lineHeight: 1.2, color: paper }}>
          Keep the reasoning. Excavate it later.
        </div>
        {title && (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 40,
              padding: '10px 20px',
              fontSize: 30,
              background: signal,
              color: ink,
            }}
          >
            {title}
          </div>
        )}
      </div>
      <div
        style={{
          width: 260,
          height: 260,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 130,
          border: `6px solid ${signal}`,
          color: signal,
        }}
      >
        <div style={{ display: 'flex', fontSize: 44, letterSpacing: 6 }}>SEALED</div>
        <div style={{ display: 'flex', marginTop: 12, fontSize: 22, letterSpacing: 4, color: paper }}>SHA-256</div>
      </div>
    </div>
  )
}
