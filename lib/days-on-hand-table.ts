import { supplyLines, type PaceAtWindow, type SupplyLine } from "@/lib/supply"
import type { Books } from "@/lib/types"

export type DaysOnHandTableRow = {
  line: SupplyLine
  totalSold: number
  pace30: PaceAtWindow
  pace90: PaceAtWindow
  pace180: PaceAtWindow
}

type ShipmentEvent = { atMs: number; bottles: number }

function buildShipmentIndex(books: Books) {
  const index = new Map<string, ShipmentEvent[]>()
  const push = (wineId: string, at: string, bottles: number) => {
    const atMs = new Date(at).getTime()
    const list = index.get(wineId)
    if (list) list.push({ atMs, bottles })
    else index.set(wineId, [{ atMs, bottles }])
  }
  for (const movement of books.movements) {
    if (movement.type !== "ship") continue
    push(movement.wineId, movement.at, movement.bottles)
  }
  for (const line of books.orderHistory ?? []) {
    push(line.wineId, line.at, line.bottles)
  }
  return index
}

function totalSoldByWineId(index: Map<string, ShipmentEvent[]>) {
  const totals = new Map<string, number>()
  for (const [wineId, events] of index) {
    let total = 0
    for (const event of events) total += event.bottles
    totals.set(wineId, total)
  }
  return totals
}

function shippedInWindow(events: ShipmentEvent[] | undefined, windowDays: number, nowMs: number) {
  if (!events?.length) return 0
  const start = nowMs - windowDays * 24 * 60 * 60 * 1000
  let total = 0
  for (const event of events) {
    if (event.atMs >= start) total += event.bottles
  }
  return total
}

function paceAtWindowFromIndex(
  onHand: number,
  events: ShipmentEvent[] | undefined,
  windowDays: number,
  nowMs: number,
): PaceAtWindow {
  const shippedWindow = shippedInWindow(events, windowDays, nowMs)
  const dailyRate = shippedWindow > 0 ? shippedWindow / windowDays : null
  const daysRemaining =
    dailyRate && dailyRate > 0 ? onHand / dailyRate : onHand > 0 ? null : 0
  return { windowDays, shippedWindow, dailyRate, daysRemaining }
}

export function buildDaysOnHandTableRows(books: Books, now = new Date()): DaysOnHandTableRow[] {
  const shipmentIndex = buildShipmentIndex(books)
  const soldTotals = totalSoldByWineId(shipmentIndex)
  const nowMs = now.getTime()
  return supplyLines(books, now)
    .filter((line) => line.wine.active)
    .map((line) => {
      const events = shipmentIndex.get(line.wine.id)
      const onHand = line.onHand
      return {
        line,
        totalSold: soldTotals.get(line.wine.id) ?? 0,
        pace30: paceAtWindowFromIndex(onHand, events, 30, nowMs),
        pace90: paceAtWindowFromIndex(onHand, events, 90, nowMs),
        pace180: paceAtWindowFromIndex(onHand, events, 180, nowMs),
      }
    })
}

export function shipmentPostingCount(books: Books) {
  return books.movements.filter((movement) => movement.type === "ship").length
}
