import { IBM_Plex_Mono, Instrument_Serif, Inter_Tight } from 'next/font/google'

// One place for the brand fonts: the root layout and the global error page (which renders
// outside the layout) both put these variables on <html>, so the :root font tokens resolve.
const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})
const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' })
const mono = IBM_Plex_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-plex-mono' })

export const fontVariables = `${display.variable} ${sans.variable} ${mono.variable}`
