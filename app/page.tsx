import { redirect } from "next/navigation"
import { DaysOnHandServerView } from "@/components/days-on-hand-server-view"
import { buildDaysOnHandTableRows, shipmentPostingCount } from "@/lib/days-on-hand-table"
import { filterAndSortDaysOnHandRows, parseDaysOnHandQuery } from "@/lib/days-on-hand-query"
import { inventoryHref, parseInventoryView } from "@/lib/inventory-routes"
import { daysOnHandSummary, salesPaceWindowDays } from "@/lib/supply"
import { loadBooks } from "@/lib/store"

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
  const books = await loadBooks()
  const now = new Date()
  const rows = buildDaysOnHandTableRows(books, now)
  const filtered = filterAndSortDaysOnHandRows(rows, query)

  return (
    <div data-page="wide" data-sidebar="wide" className="w-full">
      <DaysOnHandServerView
        rows={rows}
        filtered={filtered}
        summary={daysOnHandSummary(books, now)}
        query={query}
        orderLineCount={books.orderHistory?.length ?? 0}
        orderHistoryImportedAt={books.orderHistoryImportedAt ?? null}
        salesPaceWindowDays={salesPaceWindowDays(books)}
        shipmentCount={shipmentPostingCount(books)}
      />
    </div>
  )
}
