"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { MovementDialog } from "@/components/movement-dialog"
import { StatusPill } from "@/components/marks"
import { COLOR_LABEL } from "@/lib/format"
import {
  formatBottles,
  formatCases,
  formatMoney,
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
          <h1 className="mt-1 font-heading text-4xl tracking-tight">This morning&apos;s books</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Floor counts for the Oakland bonded warehouse, the Napa cold room, and Fillmore will-call.
            {" "}
            {picture.activeCount} active wines, {formatCases(picture.onHandCases)} cases on the floor.
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
          label="On the floor"
          value={`${formatCases(picture.onHandCases)} cs`}
          detail={`${formatMoney(picture.costValue)} at cost`}
        />
        <Figure
          label="Free to sell"
          value={`${formatCases(picture.freeCases)} cs`}
          detail={`${formatCases(picture.allocatedCases)} cs held for accounts`}
        />
        <Figure
          label="Wholesale value"
          value={formatMoney(picture.priceValue)}
          detail="If the free and held cases all sell"
        />
        <Figure
          label="Needs a buy"
          value={String(picture.reorderCount)}
          detail={picture.reorderCount === 1 ? "Line under its reorder point" : "Lines under their reorder point"}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {picture.houses.map((house) => {
          const width = Math.min(100, Math.round(house.fill * 100))
          return (
            <Link
              key={house.location.id}
              href={`/stock?house=${house.location.id}`}
              className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 hover:ring-foreground/20"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-xl tracking-tight">{house.location.name}</h2>
                <p className="text-xs text-muted-foreground">{house.location.city}</p>
              </div>
              <p className="mt-3 font-heading text-2xl tabular-nums">{formatCases(house.cases)} cs</p>
              <p className="text-xs text-muted-foreground">
                {formatMoney(house.costValue)} at cost · {house.location.capacityCases.toLocaleString("en-US")} cs capacity
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", house.fill > 0.9 ? "bg-low" : "bg-healthy")}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {width}% of the house
              </p>
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
            {COLOR_LABEL[entry.color]} · {formatCases(entry.cases)} cs
          </span>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
            <h2 className="font-heading text-2xl tracking-tight">Needs a buy</h2>
            <Link href="/catalog?sort=risk" className="text-xs underline-offset-2 hover:underline">
              See them in the catalog
            </Link>
          </div>
          {picture.reorderLines.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              Every active wine is above its reorder point.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Wine</th>
                    <th className="px-2 py-2 font-medium">Free</th>
                    <th className="px-2 py-2 font-medium">Reorder</th>
                    <th className="px-2 py-2 font-medium">Short</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {picture.reorderLines.map((line) => (
                    <tr key={line.wine.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link href={`/catalog?wine=${line.wine.id}`} className="font-medium hover:underline">
                          {line.wine.producer}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {line.wine.cuvee} {line.wine.vintage ?? "NV"}
                        </p>
                      </td>
                      <td className="px-2 py-3 tabular-nums">
                        {formatBottles(line.free, line.wine.bottlesPerCase)}
                      </td>
                      <td className="px-2 py-3 tabular-nums">{line.wine.reorderCases} cs</td>
                      <td className="px-2 py-3 tabular-nums">
                        {formatBottles(line.short, line.wine.bottlesPerCase)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={line.status} />
                      </td>
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
            Recent activity. The floor count above is the book balance.
          </p>
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
