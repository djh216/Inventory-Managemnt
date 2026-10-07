export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-9 w-64 max-w-full rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-card ring-1 ring-foreground/10" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-card ring-1 ring-foreground/10" />
      <p className="sr-only">Loading {label}</p>
    </div>
  )
}
