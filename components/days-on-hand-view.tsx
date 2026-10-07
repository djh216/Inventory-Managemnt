"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { SidebarOrderHistory } from "@/components/sidebar-order-history"
import { formatCount, wineName } from "@/lib/format"
import {
  DAYS_ON_HAND_TABLE_WINDOWS,
  daysOnHandBandFromPace,
  daysOnHandSummary,
  formatBottlesPerDayTable,
  formatDaysOnHandTable,
  formatDaysRemaining,
  paceAtWindow,
  salesPaceWindowDays,
  supplyLines,
  type DaysOnHandBand,
  type PaceAtWindow,
  type SupplyLine,
} from "@/lib/supply"
import type { Books } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type FilterBand = "all" | DaysOnHandBand
type SortKey =
  | "product"
  | "available"
  | "sold30"
  | "rate30"
  | "days30"
  | "sold90"
  | "rate90"
  | "days90"
  | "sold180"
  | "rate180"
  | "days180"
type SortDir = "asc" | "desc"

type TableRow = {
  line: SupplyLine
  pace30: PaceAtWindow
  pace90: PaceAtWindow
  pace180: PaceAtWindow
}

export function DaysOnHandView({ books }: { books: Books }) {
  const summary = daysOnHandSummary(books)
  const orderLineCount = books.orderHistory?.length ?? 0
  const paceWindowDays = salesPaceWindowDays(books)
  const rows = useMemo(() => buildTableRows(books), [books])

  const [query, setQuery] = useState("")
  const [band, setBand] = useState<FilterBand>("all")
  const [sortKey, setSortKey] = useState<SortKey>("days30")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [showNoStock, setShowNoStock] = useState(false)

  const inStockCount = useMemo(() => rows.filter((row) => row.line.available > 0).length, [rows])
  const tablePool = showNoStock ? rows.length : inStockCount

  const filtered = useMemo(() => {
    const matched = rows.filter((row) => {
      if (!showNoStock && row.line.available <= 0) return false
      const statusBand = daysOnHandBandFromPace(
        row.line.available,
        row.pace30.dailyRate,
        row.pace30.daysRemaining,
      )
      if (band !== "all" && statusBand !== band) return false
      if (!query.trim()) return true
      const hay = `${row.line.wine.label} ${row.line.wine.sku} ${row.line.wine.producer}`.toLowerCase()
      return hay.includes(query.trim().toLowerCase())
    })
    return sortTableRows(matched, sortKey, sortDir)
  }, [rows, band, query, sortKey, sortDir, showNoStock])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir(defaultSortDir(key))
  }

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sales pace</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Days on hand</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload order history to set each product&apos;s sales pace. The table shows days on hand at{" "}
            30-, 90-, and 180-day windows with bottles sold, daily pace, and days on hand per period.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="SKUs with pace" value={String(summary.withPace)} detail="Enough order history in the window" />
        <Kpi label="Need order data" value={String(summary.withoutPace)} detail="No sales in the pace window" />
        <Kpi
          label="Median days on hand"
          value={summary.medianDays === null ? "—" : formatDaysRemaining(summary.medianDays)}
          detail="Among SKUs with a calculated pace"
        />
        <Kpi label="≤ 14 days on hand" value={String(summary.urgent)} detail="Low cover at current pace" />
      </section>

      <section className="rounded-xl bg-sidebar p-4 text-sidebar-foreground ring-1 ring-sidebar-border md:hidden">
        <SidebarOrderHistory
          orderLineCount={orderLineCount}
          orderHistoryImportedAt={books.orderHistoryImportedAt ?? null}
          salesPaceWindowDays={paceWindowDays}
        />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search label or SKU…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Select value={band} onValueChange={(value) => setBand(value as FilterBand)}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            <SelectItem value="urgent">≤ 14 days</SelectItem>
            <SelectItem value="tight">15–45 days</SelectItem>
            <SelectItem value="comfortable">45+ days</SelectItem>
            <SelectItem value="out">Out at pace</SelectItem>
            <SelectItem value="unknown">No sales pace</SelectItem>
            <SelectItem value="idle">No stock</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={showNoStock ? "secondary" : "outline"}
          size="sm"
          aria-pressed={showNoStock}
          onClick={() => setShowNoStock((value) => !value)}
        >
          {showNoStock ? "Including no-stock SKUs" : "hiding no-stock skus"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {tablePool} active SKUs
          {!showNoStock && rows.length > inStockCount
            ? ` (${formatCount(rows.length - inStockCount)} hidden)`
            : null}
        </p>
      </section>

      {orderLineCount === 0 && shipsInBooks(books) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Upload order history to calculate days on hand</p>
          <p className="mx-auto mt-2 max-w-lg leading-6">
            The dashboard needs recent sales volume per SKU. Upload a CSV above, or post shipments from the catalog.
          </p>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[72rem] text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th rowSpan={2} className="px-4 py-3 text-left align-bottom font-medium">
                <SortableHeader
                  label="Product"
                  active={sortKey === "product"}
                  dir={sortDir}
                  onClick={() => toggleSort("product")}
                  asCell={false}
                  align="left"
                />
              </th>
              <th rowSpan={2} className="px-2 py-3 text-center align-bottom font-medium">
                <SortableHeader
                  label="Available"
                  active={sortKey === "available"}
                  dir={sortDir}
                  onClick={() => toggleSort("available")}
                  asCell={false}
                  align="center"
                />
              </th>
              {DAYS_ON_HAND_TABLE_WINDOWS.map((days) => (
                <th
                  key={`group-${days}`}
                  colSpan={3}
                  className="border-l border-border px-2 py-2 text-center font-medium"
                >
                  {days}-day period
                </th>
              ))}
            </tr>
            <tr>
              {DAYS_ON_HAND_TABLE_WINDOWS.flatMap((days) => [
                <SortableHeader
                  key={`sold-${days}`}
                  label="Sold"
                  active={sortKey === sortKeyForSold(days)}
                  dir={sortDir}
                  onClick={() => toggleSort(sortKeyForSold(days))}
                  className="border-l border-border"
                  align="center"
                />,
                <SortableHeader
                  key={`rate-${days}`}
                  label="Bt/day"
                  active={sortKey === sortKeyForRate(days)}
                  dir={sortDir}
                  onClick={() => toggleSort(sortKeyForRate(days))}
                  align="center"
                />,
                <SortableHeader
                  key={`doh-${days}`}
                  label="DOH"
                  active={sortKey === sortKeyForWindow(days)}
                  dir={sortDir}
                  onClick={() => toggleSort(sortKeyForWindow(days))}
                  align="center"
                />,
              ])}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
                <tr key={row.line.wine.id} className="border-t border-border">
                  <td className="px-4 py-3 text-left">
                    <Link href={`/catalog?wine=${row.line.wine.id}`} className="font-medium hover:underline">
                      {wineName(row.line.wine)}
                    </Link>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.line.wine.sku}</p>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums">{formatCount(row.line.available)}</td>
                  {DAYS_ON_HAND_TABLE_WINDOWS.flatMap((days) => {
                    const pace = paceForWindowDays(row, days)
                    return [
                      <td
                        key={`${row.line.wine.id}-sold-${days}`}
                        className="border-l border-border px-2 py-3 text-center tabular-nums"
                      >
                        {formatCount(pace.shippedWindow)}
                      </td>,
                      <td key={`${row.line.wine.id}-rate-${days}`} className="px-2 py-3 text-center tabular-nums">
                        {formatBottlesPerDayTable(pace.dailyRate)}
                      </td>,
                      <td
                        key={`${row.line.wine.id}-doh-${days}`}
                        className="px-2 py-3 text-center tabular-nums font-medium"
                      >
                        {formatDaysOnHandTable(pace.daysRemaining)}
                      </td>,
                    ]
                  })}
                </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">No products match this filter.</p>
        ) : null}
      </div>
    </div>
  )
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function shipsInBooks(books: Books) {
  return books.movements.filter((movement) => movement.type === "ship").length
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  className,
  asCell = true,
  align = "center",
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
  asCell?: boolean
  align?: "left" | "center"
}) {
  const control = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground",
        align === "center" ? "justify-center" : "text-left",
        active && "text-foreground",
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] tabular-nums text-muted-foreground" aria-hidden>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  )
  const wrapped = align === "center" && !asCell ? <div className="flex justify-center">{control}</div> : control
  if (!asCell) return wrapped
  return (
    <th
      className={cn(
        "px-2 py-2 font-medium",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      {align === "center" ? <div className="flex justify-center">{control}</div> : control}
    </th>
  )
}

function buildTableRows(books: Books): TableRow[] {
  return supplyLines(books)
    .filter((line) => line.wine.active)
    .map((line) => ({
      line,
      pace30: paceAtWindow(books, line.wine, 30),
      pace90: paceAtWindow(books, line.wine, 90),
      pace180: paceAtWindow(books, line.wine, 180),
    }))
}

function sortKeyForWindow(days: number): SortKey {
  if (days === 30) return "days30"
  if (days === 90) return "days90"
  return "days180"
}

function sortKeyForSold(days: number): SortKey {
  if (days === 30) return "sold30"
  if (days === 90) return "sold90"
  return "sold180"
}

function sortKeyForRate(days: number): SortKey {
  if (days === 30) return "rate30"
  if (days === 90) return "rate90"
  return "rate180"
}

function paceForWindowDays(row: TableRow, days: number): PaceAtWindow {
  if (days === 30) return row.pace30
  if (days === 90) return row.pace90
  return row.pace180
}

function paceForSortKey(row: TableRow, key: SortKey): PaceAtWindow | null {
  if (key === "days30" || key === "sold30" || key === "rate30") return row.pace30
  if (key === "days90" || key === "sold90" || key === "rate90") return row.pace90
  if (key === "days180" || key === "sold180" || key === "rate180") return row.pace180
  return null
}

function isWindowMetricSort(key: SortKey) {
  return key !== "product" && key !== "available"
}

function defaultSortDir(key: SortKey): SortDir {
  if (key === "product" || key.startsWith("days")) return "asc"
  return "desc"
}

function sortTableRows(rows: TableRow[], key: SortKey, dir: SortDir) {
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

/** No sales in the pace window sorts after SKUs with pace when sorting high → low. */
function compareNoPaceLast(aRate: number | null, bRate: number | null) {
  const aNoPace = aRate === null || aRate <= 0
  const bNoPace = bRate === null || bRate <= 0
  if (aNoPace === bNoPace) return 0
  return aNoPace ? 1 : -1
}

function compareSortKey(a: TableRow, b: TableRow, key: SortKey) {
  if (key === "product") {
    return (
      a.line.wine.label.localeCompare(b.line.wine.label) ||
      a.line.wine.sku.localeCompare(b.line.wine.sku)
    )
  }
  if (key === "available") return a.line.available - b.line.available
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

