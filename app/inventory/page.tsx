import { Suspense } from "react"
import { InventoryView } from "@/components/inventory-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { parseInventoryView } from "@/lib/inventory-routes"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Live inventory",
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    wine?: string
    sort?: string
    house?: string
  }>
}) {
  return (
    <Suspense fallback={<PageSkeleton label="live inventory" />}>
      <InventoryLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function InventoryLoader({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    wine?: string
    sort?: string
    house?: string
  }>
}) {
  const [books, params] = await Promise.all([loadBooks(), searchParams])
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())
  return (
    <InventoryView
      books={books}
      today={today}
      view={parseInventoryView(params.view)}
      initialWineId={params.wine}
      initialSort={params.sort}
      initialHouse={params.house}
    />
  )
}
