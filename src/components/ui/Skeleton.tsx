export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-sm bg-sunken motion-safe:animate-pulse ${className}`} />
}
