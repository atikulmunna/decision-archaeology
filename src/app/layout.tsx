import type { Metadata } from 'next'
import { IBM_Plex_Mono, Instrument_Serif, Inter_Tight } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})
const sans = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' })
const mono = IBM_Plex_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-plex-mono' })

export const metadata: Metadata = {
  title: 'Decision Archaeology',
  description:
    'Structured decision logging platform with outcome tracking, AI-powered bias detection, and calibration scoring.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
