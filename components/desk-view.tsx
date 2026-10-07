"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { MovementDialog } from "@/components/movement-dialog"
import { SupplyPill } from "@/components/supply-pill"
import { formatCount, formatDay, wineName } from "@/lib/format"
import { winePosition } from "@/lib/inventory"
import {
  alertCount,
  formatDaysRemaining,
  partnerRollups,
  reorderAlerts,
  VELOCITY_WINDOW_DAYS,
} from "@/lib/supply"
import type { Books, PostingPreset } from "@/lib/types"

export function DeskView({ books, today }: { books: Books; today: string }) {
  const alerts = reorderAlerts(books)
  const partners = partnerRollups(books)
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<PostingPreset | null>(null)
  const [session, setSession] = useState(0)

  let onHand = 0
  let available = 0
  for (const wine of books.wines) {
    const position = winePosition(books, wine.id)
    onHand += position.onHand
    available += position.free
  }

  function request(next: PostingPreset) {
    setPreset(next)
    setSession((value) => value + 1)
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{today}</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Live inventory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track available bottles in real time, measure depletion from posted shipments, and see when to
            reorder from winery partners before stock runs out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => request({ type: "ship" })}>Post a shipment</Button>
          <Link href="/orders" className={buttonVariants({ variant: "outline" })}>
            Order history
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure label="Available now" value={formatCount(available)} detail="Bottles free to ship today" />
        <Figure label="On hand" value={formatCount(onHand)} detail="Includes committed inventory" />
        <Figure
          label="Reorder alerts"
          value={String(alertCount(books))}
          detail="SKUs at or inside partner lead time"
        />
        <Figure
          label="Velocity window"
          value={`${VELOCITY_WINDOW_DAYS} days`}
          detail="Shipments in this window set daily depletion"
        />
      </section>

      <section className="rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-4">
          <div>
            <h2 className="font-heading text-2xl tracking-tight">Reorder alerts</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Place winery POs when days of supply drop inside lead time ({alerts.length} active).
            </p>
          </div>
          <Link href="/catalog?sort=supply" className="text-xs underline-offset-2 hover:underline">
            Full catalog
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">
            No reorder alerts right now. Post customer shipments under Orders so the system can calculate
            days remaining; alerts appear when cover falls inside each wine&apos;s lead time.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Wine</th>
                  <th className="px-2 py-2 font-medium">Partner</th>
                  <th className="px-2 py-2 font-medium">Available</th>
                  <th className="px-2 py-2 font-medium">Daily orders</th>
                  <th className="px-2 py-2 font-medium">Days left</th>
                  <th className="px-2 py-2 font-medium">Order by</th>
                  <th className="px-2 py-2 font-medium">Suggested PO</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((line) => (
                  <tr key={line.wine.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link href={`/catalog?wine=${line.wine.id}`} className="font-medium hover:underline">
                        {wineName(line.wine)}
                      </Link>
                      <p className="font-mono text-[11px] text-muted-foreground">{line.wine.sku}</p>
                    </td>
                    <td className="px-2 py-3">{line.wine.partner}</td>
                    <td className="px-2 py-3 tabular-nums">{formatCount(line.available)}</td>
                    <td className="px-2 py-3 tabular-nums">
                      {line.dailyRate ? line.dailyRate.toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-3 tabular-nums">{formatDaysRemaining(line.daysRemaining)}</td>
                    <td className="px-2 py-3 tabular-nums">
                      {line.reorderBy ? formatDay(line.reorderBy.toISOString()) : "—"}
                    </td>
                    <td className="px-2 py-3 tabular-nums">{formatCount(line.suggestedReorderBottles)} bt</td>
                    <td className="px-4 py-3">
                      <SupplyPill urgency={line.urgency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {partners.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-2">
          {partners.slice(0, 4).map((group) => (
            <article key={group.partner} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <h3 className="font-heading text-xl tracking-tight">{group.partner}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.alertCount} {group.alertCount === 1 ? "wine needs" : "wines need"} a winery PO
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {group.wines.slice(0, 4).map((line) => (
                  <li key={line.wine.id} className="flex items-baseline justify-between gap-3">
                    <span className="line-clamp-1">{line.wine.cuvee || line.wine.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatDaysRemaining(line.daysRemaining)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : null}

      <MovementDialog key={session} books={books} open={open} onOpenChange={setOpen} preset={preset} />
    </div>
  )
}

function Figure({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}
