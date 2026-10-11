import { Suspense } from "react"
import { redirect } from "next/navigation"
import { DaysOnHandPageContent } from "@/components/days-on-hand-page-content"
import { DaysOnHandTableSkeleton } from "@/components/days-on-hand-table-skeleton"
import { producersFromInventoryUpload } from "@/lib/csv-import"
import { parseDaysOnHandQuery } from "@/lib/days-on-hand-query"
import { inventoryHref, parseInventoryView } from "@/lib/inventory-routes"

export const metadata = {
  title: "Days on hand",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  if (params.view || params.wine || params.sort || params.house) {
    redirect(
      inventoryHref(parseInventoryView(typeof params.view === "string" ? params.view : undefined), {
        wine: typeof params.wine === "string" ? params.wine : undefined,
        sort: typeof params.sort === "string" ? params.sort : undefined,
        house: typeof params.house === "string" ? params.house : undefined,
      }),
    )
  }

  const query = parseDaysOnHandQuery(params)
  const producerOptions = producersFromInventoryUpload()

  return (
    <div data-page="wide" data-sidebar="wide" className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sales pace</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Days on hand</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload order history to set each product&apos;s sales pace. The table shows days on hand at 30-, 90-, and
            180-day windows with bottles sold, daily pace, and days on hand per period.
          </p>
        </div>
      </header>
      <Suspense fallback={<DaysOnHandTableSkeleton />}>
        <DaysOnHandPageContent query={query} producerOptions={producerOptions} />
      </Suspense>
    </div>
  )
}
