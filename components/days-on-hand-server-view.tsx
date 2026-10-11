import Link from "next/link"
import { SidebarOrderHistory } from "@/components/sidebar-order-history"
import { formatCount, wineName } from "@/lib/format"
import type { DaysOnHandTableRow } from "@/lib/days-on-hand-table"
import {
  daysOnHandHref,
  paceForWindowDaysExport as paceForWindowDays,
  sortKeyForRate,
  sortKeyForSold,
  sortKeyForWindow,
  toggleSortHref,
  type DaysOnHandQuery,
} from "@/lib/days-on-hand-query"
import { inventoryProductHref } from "@/lib/inventory-routes"
import {
  DAYS_ON_HAND_TABLE_WINDOWS,
  formatBottlesPerDayTable,
  formatDaysOnHandTable,
  formatDaysRemaining,
} from "@/lib/supply"
import { cn } from "@/lib/utils"

const BAND_FILTER_LABELS: Record<DaysOnHandQuery["band"], string> = {
  all: "All products",
  urgent: "≤ 14 days",
  tight: "15–45 days",
  comfortable: "45+ days",
  out: "Out at pace",
  unknown: "No sales pace",
  idle: "No stock",
}

export function DaysOnHandServerView({
  rows,
  filtered,
  summary,
  query,
  orderLineCount,
  orderHistoryImportedAt,
  salesPaceWindowDays,
  shipmentCount,
}: {
  rows: DaysOnHandTableRow[]
  filtered: DaysOnHandTableRow[]
  summary: {
    withPace: number
    withoutPace: number
    medianDays: number | null
    urgent: number
  }
  query: DaysOnHandQuery
  orderLineCount: number
  orderHistoryImportedAt: string | null
  salesPaceWindowDays: number
  shipmentCount: number
}) {
  const inStockCount = rows.filter((row) => row.line.onHand > 0).length
  const tablePool = query.showNoStock ? rows.length : inStockCount
  const wineries = [...new Set(rows.map((row) => row.line.wine.producer.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  )

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
          orderHistoryImportedAt={orderHistoryImportedAt}
          salesPaceWindowDays={salesPaceWindowDays}
        />
      </section>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Search label or SKU…"
            className="h-8 max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Producer
          <select
            name="winery"
            defaultValue={query.winery}
            className="h-8 min-w-[12rem] rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
          >
            <option value="all">All producers</option>
            {wineries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Band
          <select
            name="band"
            defaultValue={query.band}
            className="h-8 w-[11rem] rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
          >
            {Object.entries(BAND_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {query.sortKey !== "days30" ? <input type="hidden" name="sortKey" value={query.sortKey} /> : null}
        {query.sortDir !== "asc" ? <input type="hidden" name="sortDir" value={query.sortDir} /> : null}
        {query.showNoStock ? <input type="hidden" name="showNoStock" value="1" /> : null}
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Apply filters
        </button>
        <Link
          href={daysOnHandHref(query, { showNoStock: !query.showNoStock })}
          className="inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted"
        >
          {query.showNoStock ? "Including no-stock SKUs" : "Hiding no-stock SKUs"}
        </Link>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {tablePool} active SKUs
          {!query.showNoStock && rows.length > inStockCount
            ? ` (${formatCount(rows.length - inStockCount)} hidden)`
            : null}
        </p>
      </form>

      {orderLineCount === 0 && shipmentCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Upload order history to calculate days on hand</p>
          <p className="mx-auto mt-2 max-w-lg leading-6">
            The dashboard needs recent sales volume per SKU. Upload a CSV in the sidebar, or post shipments from live
            inventory.
          </p>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[76rem] text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th rowSpan={2} className="px-4 py-3 text-left align-bottom font-medium">
                <SortLink label="Product" href={toggleSortHref(query, "product")} active={query.sortKey === "product"} dir={query.sortDir} align="left" />
              </th>
              <th rowSpan={2} className="px-2 py-3 text-center align-bottom font-medium">
                <SortLink label="On hand" href={toggleSortHref(query, "onHand")} active={query.sortKey === "onHand"} dir={query.sortDir} />
              </th>
              <th rowSpan={2} className="px-2 py-3 text-center align-bottom font-medium">
                <SortLink label="Total sold" href={toggleSortHref(query, "totalSold")} active={query.sortKey === "totalSold"} dir={query.sortDir} />
              </th>
              {DAYS_ON_HAND_TABLE_WINDOWS.map((days) => (
                <th key={`group-${days}`} colSpan={3} className="border-l border-border px-2 py-2 text-center font-medium">
                  {days}-day period
                </th>
              ))}
            </tr>
            <tr>
              {DAYS_ON_HAND_TABLE_WINDOWS.flatMap((days) => [
                <th key={`sold-${days}`} className="border-l border-border px-2 py-2 font-medium">
                  <SortLink label="Sold" href={toggleSortHref(query, sortKeyForSold(days))} active={query.sortKey === sortKeyForSold(days)} dir={query.sortDir} />
                </th>,
                <th key={`rate-${days}`} className="px-2 py-2 font-medium">
                  <SortLink label="Bt/day" href={toggleSortHref(query, sortKeyForRate(days))} active={query.sortKey === sortKeyForRate(days)} dir={query.sortDir} />
                </th>,
                <th key={`doh-${days}`} className="px-2 py-2 font-medium">
                  <SortLink label="DOH" href={toggleSortHref(query, sortKeyForWindow(days))} active={query.sortKey === sortKeyForWindow(days)} dir={query.sortDir} />
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.line.wine.id} className="border-t border-border">
                <td className="px-4 py-3 text-left">
                  <Link href={inventoryProductHref(row.line.wine.id)} className="font-medium hover:underline">
                    {wineName(row.line.wine)}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">{row.line.wine.sku}</p>
                </td>
                <td className="px-2 py-3 text-center tabular-nums">{formatCount(row.line.onHand)}</td>
                <td className="px-2 py-3 text-center tabular-nums">{formatCount(row.totalSold)}</td>
                {DAYS_ON_HAND_TABLE_WINDOWS.flatMap((days) => {
                  const pace = paceForWindowDays(row, days)
                  return [
                    <td key={`${row.line.wine.id}-sold-${days}`} className="border-l border-border px-2 py-3 text-center tabular-nums">
                      {formatCount(pace.shippedWindow)}
                    </td>,
                    <td key={`${row.line.wine.id}-rate-${days}`} className="px-2 py-3 text-center tabular-nums">
                      {formatBottlesPerDayTable(pace.dailyRate)}
                    </td>,
                    <td key={`${row.line.wine.id}-doh-${days}`} className="px-2 py-3 text-center tabular-nums font-medium">
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

function SortLink({
  label,
  href,
  active,
  dir,
  align = "center",
}: {
  label: string
  href: string
  active: boolean
  dir: "asc" | "desc"
  align?: "left" | "center"
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground",
        align === "center" ? "justify-center" : "text-left",
        active && "text-foreground",
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span>{label}</span>
      <span className="text-[10px] tabular-nums text-muted-foreground" aria-hidden>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </Link>
  )
}
