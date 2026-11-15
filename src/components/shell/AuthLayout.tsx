import type { ReactNode } from 'react'
import Link from 'next/link'
import { preconnect } from 'react-dom'
import { clerkFrontendApiOrigin } from '@/lib/clerk-frontend-api'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { SpecimenCard } from './SpecimenCard'

export function AuthLayout({ heading, children }: { heading: string; children: ReactNode }) {
  // Start the connection to Clerk while the page is still arriving, so its card code downloads sooner.
  const clerkOrigin = clerkFrontendApiOrigin(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  if (clerkOrigin) preconnect(clerkOrigin, { crossOrigin: 'anonymous' })
  preconnect('https://img.clerk.com')

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-[1200px] gap-12 px-4 py-10 md:grid-cols-2 md:items-center">
        <section className="flex min-w-0 flex-col gap-8">
          <Link href="/" className="font-display text-[22px] leading-none">
            Decision Archaeology
          </Link>
          <div>
            <Eyebrow>Decision archive · Time-sealed reasoning</Eyebrow>
            <h1 className="mt-4 break-words font-display text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[48px]">
              {heading}
            </h1>
          </div>
          <div className="hidden md:block">
            <SpecimenCard />
          </div>
        </section>
        <section className="flex min-w-0 justify-center md:justify-end">{children}</section>
      </div>
    </div>
  )
}
