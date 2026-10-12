import { producerFromInventoryLabel } from "@/lib/csv-import"
import { daysOnHandBandFromPace } from "@/lib/supply"
import type { DaysOnHandTableRow } from "@/lib/days-on-hand-table"
import type { PaceAtWindow } from "@/lib/supply"

export type DaysOnHandSortKey =
  | "product"
  | "onHand"
  | "totalSold"
  | "sold30"
  | "rate30"
  | "days30"
  | "sold90"
  | "rate90"
  | "days90"
  | "sold180"
  | "rate180"
  | "days180"

export type DaysOnHandSortDir = "asc" | "desc"

export type DaysOnHandFilterBand = "all" | "urgent" | "tight" | "comfortable" | "out" | "unknown" | "idle"

export const DAYS_ON_HAND_PAGE_SIZE = 50

export type DaysOnHandQuery = {
  q: string
  winery: string
  band: DaysOnHandFilterBand
  sortKey: DaysOnHandSortKey
  sortDir: DaysOnHandSortDir
  showNoStock: boolean
  page: number
}

const SORT_KEYS = new Set<string>([
  "product",
  "onHand",
  "totalSold",
  "sold30",
  "rate30",
  "days30",
  "sold90",
  "rate90",
  "days90",
  "sold180",
  "rate180",
  "days180",
])

const BANDS = new Set<string>(["all", "urgent", "tight", "comfortable", "out", "unknown", "idle"])

export function parseDaysOnHandQuery(raw: Record<string, string | string[] | undefined>): DaysOnHandQuery {
  const pick = (key: string) => {
    const value = raw[key]
    return typeof value === "string" ? value : ""
  }
  const sortKeyRaw = pick("sortKey")
  const bandRaw = pick("band")
  return {
    q: pick("q"),
    winery: pick("winery") || "all",
    band: BANDS.has(bandRaw) ? (bandRaw as DaysOnHandFilterBand) : "all",
    sortKey: SORT_KEYS.has(sortKeyRaw) ? (sortKeyRaw as DaysOnHandSortKey) : "days30",
    sortDir: pick("sortDir") === "desc" ? "desc" : "asc",
    showNoStock: pick("showNoStock") === "1",
    page: Math.max(1, Number.parseInt(pick("page"), 10) || 1),
  }
}

export function daysOnHandHref(query: DaysOnHandQuery, patch: Partial<DaysOnHandQuery> = {}) {
  const next = { ...query, ...patch }
  const params = new URLSearchParams()
  if (next.q.trim()) params.set("q", next.q.trim())
  if (next.winery !== "all") params.set("winery", next.winery)
  if (next.band !== "all") params.set("band", next.band)
  if (next.sortKey !== "days30") params.set("sortKey", next.sortKey)
  if (next.sortDir !== "asc") params.set("sortDir", next.sortDir)
  if (next.showNoStock) params.set("showNoStock", "1")
  if (next.page > 1) params.set("page", String(next.page))
  const serialized = params.toString()
  return serialized ? `/?${serialized}` : "/"
}

export function toggleSortHref(query: DaysOnHandQuery, key: DaysOnHandSortKey) {
  if (query.sortKey === key) {
    return daysOnHandHref(query, { sortKey: key, sortDir: query.sortDir === "asc" ? "desc" : "asc" })
  }
  return daysOnHandHref(query, { sortKey: key, sortDir: defaultSortDir(key) })
}

export function filterAndSortDaysOnHandRows(rows: DaysOnHandTableRow[], query: DaysOnHandQuery) {
  const matched = rows.filter((row) => {
    if (!query.showNoStock && row.line.onHand <= 0) return false
    if (query.winery !== "all" && producerFromInventoryLabel(row.line.wine.label) !== query.winery) {
      return false
    }
    const statusBand = daysOnHandBandFromPace(
      row.line.onHand,
      row.pace30.dailyRate,
      row.pace30.daysRemaining,
    )
    if (query.band !== "all" && statusBand !== query.band) return false
    if (!query.q.trim()) return true
    const hay = `${row.line.wine.label} ${row.line.wine.sku} ${row.line.wine.producer}`.toLowerCase()
    return hay.includes(query.q.trim().toLowerCase())
  })
  return sortTableRows(matched, query.sortKey, query.sortDir)
}

export type DaysOnHandPageSlice = {
  page: number
  pageSize: number
  totalPages: number
  totalRows: number
  rows: DaysOnHandTableRow[]
}

export function paginateDaysOnHandRows(
  rows: DaysOnHandTableRow[],
  query: DaysOnHandQuery,
): DaysOnHandPageSlice {
  const pageSize = DAYS_ON_HAND_PAGE_SIZE
  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const page = Math.min(query.page, totalPages)
  const start = (page - 1) * pageSize
  return {
    page,
    pageSize,
    totalPages,
    totalRows,
    rows: rows.slice(start, start + pageSize),
  }
}

function sortKeyForWindow(days: number): DaysOnHandSortKey {
  if (days === 30) return "days30"
  if (days === 90) return "days90"
  return "days180"
}

export function sortKeyForSold(days: number): DaysOnHandSortKey {
  if (days === 30) return "sold30"
  if (days === 90) return "sold90"
  return "sold180"
}

export function sortKeyForRate(days: number): DaysOnHandSortKey {
  if (days === 30) return "rate30"
  if (days === 90) return "rate90"
  return "rate180"
}

export { sortKeyForWindow }

function paceForWindowDays(row: DaysOnHandTableRow, days: number): PaceAtWindow {
  if (days === 30) return row.pace30
  if (days === 90) return row.pace90
  return row.pace180
}

function paceForSortKey(row: DaysOnHandTableRow, key: DaysOnHandSortKey): PaceAtWindow | null {
  if (key === "days30" || key === "sold30" || key === "rate30") return row.pace30
  if (key === "days90" || key === "sold90" || key === "rate90") return row.pace90
  if (key === "days180" || key === "sold180" || key === "rate180") return row.pace180
  return null
}

function isWindowMetricSort(key: DaysOnHandSortKey) {
  return key !== "product" && key !== "onHand" && key !== "totalSold"
}

function defaultSortDir(key: DaysOnHandSortKey): DaysOnHandSortDir {
  if (key === "product" || key.startsWith("days")) return "asc"
  return "desc"
}

function sortTableRows(rows: DaysOnHandTableRow[], key: DaysOnHandSortKey, dir: DaysOnHandSortDir) {
  const mul = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    if (dir === "desc" && isWindowMetricSort(key)) {
      const paceOrder = compareNoPaceLast(
        paceForSortKey(a, key)?.dailyRate ?? null,
        paceForSortKey(b, key)?.dailyRate ?? null,
      )
      if (paceOrder !== 0) return paceOrder
    }
    return mul * compareSortKey(a, b, key) || a.line.wine.label.localeCompare(b.line.wine.label)
  })
}

function compareNoPaceLast(aRate: number | null, bRate: number | null) {
  const aNoPace = aRate === null || aRate <= 0
  const bNoPace = bRate === null || bRate <= 0
  if (aNoPace === bNoPace) return 0
  return aNoPace ? 1 : -1
}

function compareSortKey(a: DaysOnHandTableRow, b: DaysOnHandTableRow, key: DaysOnHandSortKey) {
  if (key === "product") {
    return (
      a.line.wine.label.localeCompare(b.line.wine.label) ||
      a.line.wine.sku.localeCompare(b.line.wine.sku)
    )
  }
  if (key === "onHand") return a.line.onHand - b.line.onHand
  if (key === "totalSold") return a.totalSold - b.totalSold
  if (key === "sold30") return a.pace30.shippedWindow - b.pace30.shippedWindow
  if (key === "sold90") return a.pace90.shippedWindow - b.pace90.shippedWindow
  if (key === "sold180") return a.pace180.shippedWindow - b.pace180.shippedWindow
  if (key === "rate30") return compareNullableNumber(a.pace30.dailyRate, b.pace30.dailyRate)
  if (key === "rate90") return compareNullableNumber(a.pace90.dailyRate, b.pace90.dailyRate)
  if (key === "rate180") return compareNullableNumber(a.pace180.dailyRate, b.pace180.dailyRate)
  if (key === "days30") return compareDaysRemaining(a.pace30.daysRemaining, b.pace30.daysRemaining)
  if (key === "days90") return compareDaysRemaining(a.pace90.daysRemaining, b.pace90.daysRemaining)
  if (key === "days180") return compareDaysRemaining(a.pace180.daysRemaining, b.pace180.daysRemaining)
  return 0
}

function compareNullableNumber(left: number | null, right: number | null) {
  const leftMissing = left === null || left <= 0
  const rightMissing = right === null || right <= 0
  if (leftMissing !== rightMissing) return leftMissing ? 1 : -1
  if (leftMissing || left === null || right === null) return 0
  return left - right
}

function compareDaysRemaining(left: number | null, right: number | null) {
  const leftMissing = left === null || !Number.isFinite(left)
  const rightMissing = right === null || !Number.isFinite(right)
  if (leftMissing !== rightMissing) return leftMissing ? 1 : -1
  if (leftMissing) return 0
  return (left as number) - (right as number)
}

export function paceForWindowDaysExport(row: DaysOnHandTableRow, days: number) {
  return paceForWindowDays(row, days)
}
