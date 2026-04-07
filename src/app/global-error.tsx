'use client'

import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
              Application Error
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-950">
              Something went wrong while loading the app.
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Please try again. If this keeps happening, check the server logs and use the digest below to trace the failure.
            </p>
            {error.digest && (
              <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Error digest: <span className="font-mono text-gray-900">{error.digest}</span>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Return home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
