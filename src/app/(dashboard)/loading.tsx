function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-gray-100" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-amber-100" />
          <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-indigo-200" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="h-4 w-56 animate-pulse rounded bg-indigo-200" />
            <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-indigo-200" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-24 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-lg bg-indigo-200" />
          </div>

          <div className="grid gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    </div>
  )
}

