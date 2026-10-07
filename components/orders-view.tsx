"use client"

import Link from "next/link"
import { formatClock, formatCount, formatDay, pacificDayKey, wineName } from "@/lib/format"
import { bottlesShippedInWindow, VELOCITY_WINDOW_DAYS } from "@/lib/supply"
import type { Books } from "@/lib/types"

export function OrdersView({ books }: { books: Books }) {
  const ships = books.movements
    .filter((movement) => movement.type === "ship")
    .sort((a, b) => b.at.localeCompare(a.at))

  const rows = ships.map((movement, index) => {
    const day = pacificDayKey(movement.at)
    const previous = index === 0 ? "" : pacificDayKey(ships[index - 1].at)
    return { movement, showDay: day !== previous }
  })

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Order tracking</p>
        <h1 className="mt-1 font-heading text-4xl tracking-tight">Outbound orders</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every shipment posting is treated as a customer order. The last {VELOCITY_WINDOW_DAYS} days of shipments
          drive daily depletion and days-of-supply on the desk.
        </p>
      </header>

      {ships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-2xl tracking-tight">No orders posted yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Post a shipment from Stock or the catalog to start building velocity and reorder alerts.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-2 py-3 font-medium">Wine</th>
                <th className="px-2 py-3 font-medium">Account</th>
                <th className="px-2 py-3 font-medium">Bottles</th>
                <th className="px-4 py-3 font-medium">{VELOCITY_WINDOW_DAYS}d total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ movement, showDay }) => {
                const wine = books.wines.find((item) => item.id === movement.wineId)
                if (!wine) return null
                return (
                  <tr key={movement.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {showDay ? (
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {formatDay(movement.at)}
                        </p>
                      ) : null}
                      <p className={showDay ? "mt-1" : ""}>{formatClock(movement.at)}</p>
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/catalog?wine=${wine.id}`} className="hover:underline">
                        {wineName(wine)}
                      </Link>
                    </td>
                    <td className="px-2 py-3">{movement.account || "—"}</td>
                    <td className="px-2 py-3 tabular-nums">{formatCount(movement.bottles)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCount(bottlesShippedInWindow(books, wine.id, VELOCITY_WINDOW_DAYS))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
