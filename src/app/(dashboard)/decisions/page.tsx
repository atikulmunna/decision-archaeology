import Link from 'next/link'

export const metadata = {
  title: 'Decisions — Decision Archaeology',
}

export default function DecisionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Decisions</h1>
        <Link
          href="/decisions/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Decision
        </Link>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <span className="text-4xl">🏺</span>
        <p className="mt-3 font-semibold text-gray-700">No decisions yet</p>
        <p className="mt-1 text-sm text-gray-400">
          Start logging decisions to build your reasoning archive.
        </p>
        <Link
          href="/decisions/new"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Log your first decision
        </Link>
      </div>
    </div>
  )
}
