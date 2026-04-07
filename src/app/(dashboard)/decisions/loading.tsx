function DecisionListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-indigo-100" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-indigo-50" />
          </div>
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export default function DecisionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-indigo-200" />
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="h-4 w-60 animate-pulse rounded bg-indigo-200" />
        <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-indigo-200" />
      </div>

      <DecisionListSkeleton />
    </div>
  )
}

