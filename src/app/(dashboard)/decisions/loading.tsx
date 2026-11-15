import { Skeleton } from '@/components/ui/Skeleton'

function DecisionRowSkeleton() {
  return (
    <div className="border-b border-rule py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-3 h-6 w-2/3" />
        </div>
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}

export default function DecisionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* A label on a plain div is never read out; a status message is. No aria-busy around it,
          since some screen readers hold back what is inside a busy region. */}
      <p role="status" className="sr-only">
        Loading the archive
      </p>
      <div className="border-b-[1.5px] border-ink pb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-44" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="flex flex-col">
        {Array.from({ length: 4 }).map((_, index) => (
          <DecisionRowSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
