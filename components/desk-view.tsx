"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { MovementDialog } from "@/components/movement-dialog"
import { COLOR_LABEL } from "@/lib/format"
import {
  formatBottles,
  formatCases,
  formatCount,
  formatWhen,
  MOVEMENT_LABEL,
  wineName,
} from "@/lib/format"
import { snapshot } from "@/lib/inventory"
import type { Books, PostingPreset } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DeskView({ books, today }: { books: Books; today: string }) {
  const picture = snapshot(books)
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<PostingPreset | null>(null)
  const [session, setSession] = useState(0)
  const recent = [...books.movements].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
  const unavailable = picture.reorderLines.filter((line) => line.free <= 0 && line.onHand > 0)

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
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Inventory desk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Built from the Oct 6, 2026 upload ({formatCount(picture.skuCount)} SKUs). Quantities match the file:
            on hand, available, and the difference treated as committed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => request({ type: "receive" })}>Post a receipt</Button>
          <Link href="/catalog" className={buttonVariants({ variant: "outline" })}>
            Open the catalog
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Quantity on hand"
          value={formatCount(picture.onHandBottles)}
          detail={`${formatCases(picture.onHandCases)} cases equivalent (12-bottle default)`}
        />
        <Figure
          label="Quantity available"
          value={formatCount(picture.freeBottles)}
          detail="Free to sell or ship"
        />
        <Figure
          label="Committed"
          value={formatCount(picture.allocatedBottles)}
          detail="On hand minus available from the upload"
        />
        <Figure
          label="Unavailable SKUs"
          value={String(unavailable.length)}
          detail="On hand but nothing available to sell"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {picture.houses.map((house) => {
          const width = Math.min(100, Math.round(house.fill * 100))
          return (
            <Link
              key={house.location.id}
              href={`/stock?house=${house.location.id}`}
              className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:ring-foreground/20 lg:col-span-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-heading text-xl tracking-tight">{house.location.name}</h2>
                <p className="text-xs text-muted-foreground">Source: Cursor Initial Inventory Upload 10.6.26.csv</p>
              </div>
              <p className="mt-3 font-heading text-2xl tabular-nums">
                {formatCount(picture.onHandBottles)} bottles · {formatCases(house.cases)} cs eq.
              </p>
              <div className="mt-3 h-1.5 max-w-md rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", house.fill > 0.9 ? "bg-low" : "bg-healthy")}
                  style={{ width: `${width}%` }}
                />
              </div>
            </Link>
          )
        })}
      </section>

      <section className="flex flex-wrap gap-2">
        {picture.byColor.map((entry) => (
          <span
            key={entry.color}
            className="rounded-full bg-card px-3 py-1 text-xs ring-1 ring-foreground/10"
          >
            {COLOR_LABEL[entry.color]} · {formatCases(entry.cases)} cs eq.
          </span>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
            <h2 className="font-heading text-2xl tracking-tight">Largest commitments</h2>
            <Link href="/catalog?sort=held" className="text-xs underline-offset-2 hover:underline">
              See the catalog
            </Link>
          </div>
          {picture.heldLines.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              Every bottle in the upload is available.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Label</th>
                    <th className="px-2 py-2 font-medium">On hand</th>
                    <th className="px-2 py-2 font-medium">Available</th>
                    <th className="px-2 py-2 font-medium">Committed</th>
                  </tr>
                </thead>
                <tbody>
                  {picture.heldLines.map((line) => (
                    <tr key={line.wine.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link href={`/catalog?wine=${line.wine.id}`} className="font-medium hover:underline">
                          {wineName(line.wine)}
                        </Link>
                        <p className="font-mono text-[11px] text-muted-foreground">{line.wine.sku}</p>
                      </td>
                      <td className="px-2 py-3 tabular-nums">
                        {formatCount(line.onHand)}
                      </td>
                      <td className="px-2 py-3 tabular-nums">{formatCount(line.free)}</td>
                      <td className="px-2 py-3 tabular-nums">{formatCount(line.allocated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-2xl tracking-tight">Latest postings</h2>
            <Link href="/ledger" className="text-xs underline-offset-2 hover:underline">
              Open the ledger
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Activity after the upload. On-hand and available totals above stay the book balance.
          </p>
          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No postings yet. Receipts and shipments will show here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recent.map((movement) => {
                const wine = books.wines.find((item) => item.id === movement.wineId)
                const house = books.locations.find((item) => item.id === movement.locationId)
                if (!wine) return null
                return (
                  <li key={movement.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link href={`/catalog?wine=${wine.id}`} className="font-medium hover:underline">
                        {MOVEMENT_LABEL[movement.type]} · {wineName(wine)}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(movement.at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBottles(Math.abs(movement.bottles), wine.bottlesPerCase)} · {house?.name}
                      {movement.account ? ` · ${movement.account}` : ""} · {movement.reference}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <MovementDialog
        key={session}
        books={books}
        open={open}
        onOpenChange={setOpen}
        preset={preset}
      />
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
