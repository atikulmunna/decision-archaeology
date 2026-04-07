'use client'

import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
        Dashboard Error
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-gray-950">
        We couldn&apos;t load this dashboard view.
      </h1>
      <p className="mt-4 text-sm leading-7 text-gray-600">
        The rest of the app is still intact. Try reloading this page, and if it keeps failing, check the server logs using the digest below.
      </p>
      {error.digest && (
        <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Error digest: <span className="font-mono text-gray-900">{error.digest}</span>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Retry
        </button>
        <Link
          href="/decisions/new"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          New decision
        </Link>
      </div>
    </div>
  )
}
