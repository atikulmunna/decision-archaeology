import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BIAS_REPORT_THRESHOLD } from '@/lib/onboarding'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { clerkId: userId } })
    : null
  const decisionCount = dbUser
    ? await prisma.decisionRecord.count({ where: { userId: dbUser.id, isDraft: false } })
    : 0
  const remaining = Math.max(BIAS_REPORT_THRESHOLD - decisionCount, 0)
  const progressPct = Math.min(100, Math.round((decisionCount / BIAS_REPORT_THRESHOLD) * 100))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <Link href="/decisions" className="flex items-center gap-2">
          <span className="text-xl">🏺</span>
          <span className="font-semibold text-gray-900">Decision Archaeology</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/ai/reports"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            🧠 Reports
          </Link>
          <Link
            href="/calibration"
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            🎯 Calibration
          </Link>
          <Link
            href="/decisions/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + New Decision
          </Link>
          <UserButton />
        </div>
      </header>

      {dbUser && decisionCount < BIAS_REPORT_THRESHOLD && (
        <div className="border-b border-indigo-100 bg-indigo-50">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-indigo-800">
                {decisionCount} of {BIAS_REPORT_THRESHOLD} decisions logged
                {' '}
                <span className="text-indigo-600">• {remaining} more to unlock your first Bias Report</span>
              </p>
              <Link href="/decisions/new" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                Log one now →
              </Link>
            </div>
            <div className="h-2 rounded-full bg-indigo-200">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
