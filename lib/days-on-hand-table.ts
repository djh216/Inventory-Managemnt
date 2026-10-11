import {
  paceAtWindow,
  supplyLines,
  totalBottlesSold,
  type PaceAtWindow,
  type SupplyLine,
} from "@/lib/supply"
import type { Books } from "@/lib/types"

export type DaysOnHandTableRow = {
  line: SupplyLine
  totalSold: number
  pace30: PaceAtWindow
  pace90: PaceAtWindow
  pace180: PaceAtWindow
}

export function buildDaysOnHandTableRows(books: Books, now = new Date()): DaysOnHandTableRow[] {
  return supplyLines(books, now)
    .filter((line) => line.wine.active)
    .map((line) => ({
      line,
      totalSold: totalBottlesSold(books, line.wine.id),
      pace30: paceAtWindow(books, line.wine, 30, now, "onHand"),
      pace90: paceAtWindow(books, line.wine, 90, now, "onHand"),
      pace180: paceAtWindow(books, line.wine, 180, now, "onHand"),
    }))
}

export function shipmentPostingCount(books: Books) {
  return books.movements.filter((movement) => movement.type === "ship").length
}
