import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

      {/* Page content */}
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
