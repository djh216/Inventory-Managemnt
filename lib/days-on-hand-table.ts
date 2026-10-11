import { paceAtWindow, supplyLines, type PaceAtWindow, type SupplyLine } from "@/lib/supply"
import type { Books } from "@/lib/types"

export type DaysOnHandTableRow = {
  line: SupplyLine
  totalSold: number
  pace30: PaceAtWindow
  pace90: PaceAtWindow
  pace180: PaceAtWindow
}

function totalSoldByWineId(books: Books) {
  const totals = new Map<string, number>()
  for (const movement of books.movements) {
    if (movement.type !== "ship") continue
    totals.set(movement.wineId, (totals.get(movement.wineId) ?? 0) + movement.bottles)
  }
  for (const line of books.orderHistory ?? []) {
    totals.set(line.wineId, (totals.get(line.wineId) ?? 0) + line.bottles)
  }
  return totals
}

export function buildDaysOnHandTableRows(books: Books, now = new Date()): DaysOnHandTableRow[] {
  const soldTotals = totalSoldByWineId(books)
  return supplyLines(books, now)
    .filter((line) => line.wine.active)
    .map((line) => ({
      line,
      totalSold: soldTotals.get(line.wine.id) ?? 0,
      pace30: paceAtWindow(books, line.wine, 30, now, "onHand"),
      pace90: paceAtWindow(books, line.wine, 90, now, "onHand"),
      pace180: paceAtWindow(books, line.wine, 180, now, "onHand"),
    }))
}

export function shipmentPostingCount(books: Books) {
  return books.movements.filter((movement) => movement.type === "ship").length
}
