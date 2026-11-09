import { Skeleton } from '@/components/ui/Skeleton'

/** Shown inside the dashboard layout (the Masthead is already rendered around it). */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="border-b-[1.5px] border-ink pb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-56" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border-b border-rule pb-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-3 h-6 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
      ))}
    </div>
  )
}
