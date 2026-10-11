import { DaysOnHandServerView } from "@/components/days-on-hand-server-view"
import { buildDaysOnHandTableRows, shipmentPostingCount } from "@/lib/days-on-hand-table"
import {
  filterAndSortDaysOnHandRows,
  paginateDaysOnHandRows,
  type DaysOnHandQuery,
} from "@/lib/days-on-hand-query"
import { daysOnHandSummary, salesPaceWindowDays } from "@/lib/supply"
import { loadBooks } from "@/lib/store"

export async function DaysOnHandPageContent({
  query,
  producerOptions,
}: {
  query: DaysOnHandQuery
  producerOptions: string[]
}) {
  const books = await loadBooks()
  const now = new Date()
  const rows = buildDaysOnHandTableRows(books, now)
  const filtered = filterAndSortDaysOnHandRows(rows, query)
  const page = paginateDaysOnHandRows(filtered, query)

  return (
    <DaysOnHandServerView
      rows={rows}
      filtered={filtered}
      tableRows={page.rows}
      pagination={page}
      summary={daysOnHandSummary(books, now)}
      query={query}
      producerOptions={producerOptions}
      orderLineCount={books.orderHistory?.length ?? 0}
      orderHistoryImportedAt={books.orderHistoryImportedAt ?? null}
      salesPaceWindowDays={salesPaceWindowDays(books)}
      shipmentCount={shipmentPostingCount(books)}
    />
  )
}
