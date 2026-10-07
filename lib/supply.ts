import { winePosition } from "./inventory"
import type { Books, Wine } from "./types"

export const VELOCITY_WINDOW_DAYS = 30

/** Fixed windows shown on the days-on-hand dashboard table. */
export const DAYS_ON_HAND_TABLE_WINDOWS = [30, 90, 180] as const

export function salesPaceWindowDays(books: Books) {
  const days = books.salesPaceWindowDays ?? VELOCITY_WINDOW_DAYS
  return days >= 7 && days <= 365 ? days : VELOCITY_WINDOW_DAYS
}

export type SupplyUrgency = "critical" | "warning" | "watch" | "ok" | "unknown"

export type SupplyLine = {
  wine: Wine
  available: number
  onHand: number
  committed: number
  shippedWindow: number
  dailyRate: number | null
  daysRemaining: number | null
  urgency: SupplyUrgency
  suggestedReorderBottles: number
  reorderBy: Date | null
}

export type PartnerRollup = {
  partner: string
  alertCount: number
  wines: SupplyLine[]
}

export function partnerName(wine: Wine) {
  return wine.partner.trim() || wine.producer.trim() || "Unassigned partner"
}

export type PaceAtWindow = {
  windowDays: number
  shippedWindow: number
  dailyRate: number | null
  daysRemaining: number | null
}

export function paceAtWindow(
  books: Books,
  wine: Wine,
  windowDays: number,
  now = new Date(),
): PaceAtWindow {
  const position = winePosition(books, wine.id)
  const shippedWindow = bottlesShippedInWindow(books, wine.id, windowDays, now)
  const dailyRate = shippedWindow > 0 ? shippedWindow / windowDays : null
  const daysRemaining =
    dailyRate && dailyRate > 0
      ? position.free / dailyRate
      : position.free > 0
        ? null
        : 0
  return { windowDays, shippedWindow, dailyRate, daysRemaining }
}

export function bottlesShippedInWindow(books: Books, wineId: string, windowDays: number, now = new Date()) {
  const start = now.getTime() - windowDays * 24 * 60 * 60 * 1000
  let total = 0
  for (const movement of books.movements) {
    if (movement.wineId !== wineId || movement.type !== "ship") continue
    if (new Date(movement.at).getTime() < start) continue
    total += movement.bottles
  }
  for (const line of books.orderHistory ?? []) {
    if (line.wineId !== wineId) continue
    if (new Date(line.at).getTime() < start) continue
    total += line.bottles
  }
  return total
}

export function supplyLine(books: Books, wine: Wine, now = new Date()): SupplyLine {
  const position = winePosition(books, wine.id)
  const windowDays = salesPaceWindowDays(books)
  const shippedWindow = bottlesShippedInWindow(books, wine.id, windowDays, now)
  const dailyRate =
    shippedWindow > 0 ? shippedWindow / windowDays : null
  const daysRemaining =
    dailyRate && dailyRate > 0 ? position.free / dailyRate : position.free > 0 ? null : 0

  const urgency = classifyUrgency(wine, position.free, daysRemaining, dailyRate)
  const targetCover = wine.targetDaysOfStock
  const suggestedReorderBottles =
    dailyRate && dailyRate > 0
      ? Math.max(0, Math.ceil(dailyRate * targetCover - position.free))
      : position.free <= 0
        ? wine.bottlesPerCase * 6
        : 0

  let reorderBy: Date | null = null
  if (dailyRate && dailyRate > 0 && daysRemaining !== null) {
    const daysUntilPo = daysRemaining - wine.leadTimeDays
    reorderBy = new Date(now)
    reorderBy.setDate(reorderBy.getDate() + Math.floor(daysUntilPo))
  }

  return {
    wine,
    available: position.free,
    onHand: position.onHand,
    committed: position.allocated,
    shippedWindow,
    dailyRate,
    daysRemaining,
    urgency,
    suggestedReorderBottles,
    reorderBy,
  }
}

function classifyUrgency(
  wine: Wine,
  available: number,
  daysRemaining: number | null,
  dailyRate: number | null,
  options?: { ignoreMute?: boolean },
): SupplyUrgency {
  if (!options?.ignoreMute && wine.reorderAlertsMuted) return "ok"
  if (!wine.active) return "ok"
  if (available <= 0 && dailyRate && dailyRate > 0) return "critical"
  if (available <= 0) return "warning"
  if (dailyRate === null || dailyRate <= 0) return "unknown"
  if (daysRemaining === null) return "unknown"
  if (daysRemaining <= wine.leadTimeDays) return "critical"
  if (daysRemaining <= wine.leadTimeDays + 7) return "warning"
  if (daysRemaining <= wine.targetDaysOfStock) return "watch"
  return "ok"
}

export function supplyLines(books: Books, now = new Date()) {
  return books.wines.filter((wine) => wine.active).map((wine) => supplyLine(books, wine, now))
}

export function reorderAlerts(books: Books, now = new Date()) {
  return supplyLines(books, now)
    .filter((line) => !line.wine.reorderAlertsMuted)
    .filter((line) => line.urgency === "critical" || line.urgency === "warning")
    .sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || compareDays(a, b))
}

/** Muted SKUs that would still trigger a reorder alert if alerts were on. */
export function snoozedReorderAlerts(books: Books, now = new Date()) {
  return books.wines
    .filter((wine) => wine.active && wine.reorderAlertsMuted)
    .map((wine) => supplyLine(books, wine, now))
    .filter((line) => {
      const urgency = classifyUrgency(
        line.wine,
        line.available,
        line.daysRemaining,
        line.dailyRate,
        { ignoreMute: true },
      )
      return urgency === "critical" || urgency === "warning"
    })
    .sort((a, b) => compareDays(a, b))
}

export function partnerRollups(books: Books, now = new Date()): PartnerRollup[] {
  const map = new Map<string, SupplyLine[]>()
  for (const line of reorderAlerts(books, now)) {
    const key = partnerName(line.wine)
    const list = map.get(key) ?? []
    list.push(line)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([partner, wines]) => ({
      partner,
      alertCount: wines.length,
      wines: wines.sort((a, b) => compareDays(a, b)),
    }))
    .sort((a, b) => b.alertCount - a.alertCount || a.partner.localeCompare(b.partner))
}

export function alertCount(books: Books, now = new Date()) {
  return reorderAlerts(books, now).length
}

function urgencyRank(urgency: SupplyUrgency) {
  if (urgency === "critical") return 0
  if (urgency === "warning") return 1
  if (urgency === "watch") return 2
  if (urgency === "unknown") return 3
  return 4
}

function compareDays(a: SupplyLine, b: SupplyLine) {
  const left = a.daysRemaining ?? Number.POSITIVE_INFINITY
  const right = b.daysRemaining ?? Number.POSITIVE_INFINITY
  return left - right || a.wine.label.localeCompare(b.wine.label)
}

export function formatDaysRemaining(days: number | null) {
  if (days === null) return "—"
  if (!Number.isFinite(days)) return "—"
  if (days <= 0) return "0 days"
  if (days >= 365) return "365+ days"
  return `${Math.round(days * 10) / 10} days`
}

/** Days-on-hand table: whole days only, rounded down. */
export function formatDaysOnHandTable(days: number | null) {
  if (days === null) return "—"
  if (!Number.isFinite(days)) return "—"
  if (days <= 0) return "0 days"
  if (days >= 365) return "365+ days"
  return `${Math.floor(days)} days`
}

export function formatBottlesPerDayTable(rate: number | null) {
  if (rate === null || rate <= 0) return "—"
  if (rate >= 100) return String(Math.floor(rate))
  return String(Math.floor(rate * 10) / 10)
}

export type DaysOnHandBand = "out" | "urgent" | "tight" | "comfortable" | "idle" | "unknown"

export function daysOnHandBand(line: SupplyLine): DaysOnHandBand {
  return daysOnHandBandFromPace(line.available, line.dailyRate, line.daysRemaining)
}

export function daysOnHandBandFromPace(
  available: number,
  dailyRate: number | null,
  daysRemaining: number | null,
): DaysOnHandBand {
  if (available <= 0 && dailyRate && dailyRate > 0) return "out"
  if (available <= 0) return "idle"
  if (!dailyRate || dailyRate <= 0) return "unknown"
  if (daysRemaining === null) return "unknown"
  if (daysRemaining <= 14) return "urgent"
  if (daysRemaining <= 45) return "tight"
  return "comfortable"
}

export function daysOnHandSummary(books: Books, now = new Date()) {
  const lines = supplyLines(books, now).filter((line) => line.wine.active)
  let withPace = 0
  let withoutPace = 0
  let urgent = 0
  const pacedDays: number[] = []
  for (const line of lines) {
    const pacePrimary = paceAtWindow(books, line.wine, VELOCITY_WINDOW_DAYS, now)
    const band = daysOnHandBandFromPace(line.available, pacePrimary.dailyRate, pacePrimary.daysRemaining)
    if (band === "unknown" || band === "idle") {
      withoutPace += 1
      continue
    }
    withPace += 1
    if (pacePrimary.daysRemaining !== null && Number.isFinite(pacePrimary.daysRemaining)) {
      pacedDays.push(pacePrimary.daysRemaining)
    }
    if (band === "out" || band === "urgent") urgent += 1
  }
  pacedDays.sort((a, b) => a - b)
  const medianDays =
    pacedDays.length === 0
      ? null
      : pacedDays.length % 2 === 1
        ? pacedDays[(pacedDays.length - 1) / 2]
        : (pacedDays[pacedDays.length / 2 - 1] + pacedDays[pacedDays.length / 2]) / 2
  return { withPace, withoutPace, urgent, medianDays, total: lines.length }
}
