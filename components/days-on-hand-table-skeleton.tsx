export function DaysOnHandTableSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`doh-kpi-${index}`} className="h-28 animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
        ))}
      </section>
      <div className="flex flex-wrap gap-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-[28rem] w-full animate-pulse rounded-xl bg-card ring-1 ring-foreground/10" />
      <p className="text-center text-sm text-muted-foreground">Loading days on hand table…</p>
    </div>
  )
}
