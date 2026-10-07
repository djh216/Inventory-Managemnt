"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatBottles,
  formatClock,
  formatDay,
  MOVEMENT_LABEL,
  pacificDayKey,
  wineName,
} from "@/lib/format"
import type { Books, MovementType } from "@/lib/types"
import { MOVEMENT_TYPES } from "@/lib/types"

export function LedgerView({
  books,
  initialWineId,
}: {
  books: Books
  initialWineId?: string
}) {
  const [type, setType] = useState<MovementType | "all">("all")
  const [wineId, setWineId] = useState(initialWineId ?? "all")
  const [trackedWine, setTrackedWine] = useState(initialWineId)
  const [query, setQuery] = useState("")

  if (initialWineId && initialWineId !== trackedWine) {
    setTrackedWine(initialWineId)
    setWineId(initialWineId)
  }

  const needle = query.trim().toLowerCase()
  const rows = [...books.movements]
    .filter((movement) => {
      if (type !== "all" && movement.type !== type) return false
      if (wineId !== "all" && movement.wineId !== wineId) return false
      if (!needle) return true
      return `${movement.reference} ${movement.account} ${movement.note}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => b.at.localeCompare(a.at))

  const rowsWithDays = rows.map((movement, index) => {
    const day = pacificDayKey(movement.at)
    const previous = index === 0 ? "" : pacificDayKey(rows[index - 1].at)
    return { movement, showDay: day !== previous }
  })

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Ledger</p>
        <h1 className="mt-1 font-heading text-4xl tracking-tight">Postings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Receipts, shipments, holds, transfers, and count corrections. The floor count on the desk is the book balance; this list is the recent activity behind it.
        </p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reference, account, or note"
          aria-label="Search postings"
          className="lg:max-w-sm"
        />
        <Select
          items={{
            all: "All types",
            ...Object.fromEntries(MOVEMENT_TYPES.map((item) => [item, MOVEMENT_LABEL[item]])),
          }}
          value={type}
          onValueChange={(value) => setType((value as MovementType | "all") ?? "all")}
        >
          <SelectTrigger className="w-full lg:w-40" aria-label="Posting type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MOVEMENT_TYPES.map((item) => (
              <SelectItem key={item} value={item}>
                {MOVEMENT_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            all: "All wines",
            ...Object.fromEntries(books.wines.map((wine) => [wine.id, wineName(wine)])),
          }}
          value={wineId}
          onValueChange={(value) => setWineId(value ?? "all")}
        >
          <SelectTrigger className="w-full lg:w-72" aria-label="Wine">
            <SelectValue placeholder="All wines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All wines</SelectItem>
            {[...books.wines]
              .sort((a, b) => wineName(a).localeCompare(wineName(b)))
              .map((wine) => (
                <SelectItem key={wine.id} value={wine.id}>
                  {wineName(wine)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground lg:ml-auto">{rows.length} postings</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-2xl tracking-tight">No postings in this cut</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear the filters to see the full ledger.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setType("all")
              setWineId("all")
              setQuery("")
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-2 py-3 font-medium">Type</th>
                <th className="px-2 py-3 font-medium">Wine</th>
                <th className="px-2 py-3 font-medium">Where</th>
                <th className="px-2 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithDays.map(({ movement, showDay }) => {
                const wine = books.wines.find((item) => item.id === movement.wineId)
                const from = books.locations.find((item) => item.id === movement.locationId)
                const to = books.locations.find((item) => item.id === movement.toLocationId)
                const where =
                  movement.type === "transfer" && to
                    ? `${from?.name ?? "House"} → ${to.name}`
                    : (from?.name ?? "House")
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
                    <td className="px-2 py-3">{MOVEMENT_LABEL[movement.type]}</td>
                    <td className="px-2 py-3">
                      {wine ? (
                        <Link href={`/catalog?wine=${wine.id}`} className="hover:underline">
                          {wine.producer}
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {wine.cuvee} {wine.vintage ?? "NV"}
                          </span>
                        </Link>
                      ) : (
                        "Removed wine"
                      )}
                    </td>
                    <td className="px-2 py-3">{where}</td>
                    <td className="px-2 py-3 tabular-nums">
                      {wine ? quantityText(movement.type, movement.bottles, wine.bottlesPerCase) : movement.bottles}
                    </td>
                    <td className="px-4 py-3">
                      <p>{movement.reference}</p>
                      {movement.account ? (
                        <p className="text-xs text-muted-foreground">{movement.account}</p>
                      ) : null}
                      {movement.note ? (
                        <p className="text-xs text-muted-foreground">{movement.note}</p>
                      ) : null}
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

function quantityText(type: MovementType, bottles: number, perCase: number) {
  if (type === "receive") return `+${formatBottles(bottles, perCase)}`
  if (type === "ship") return `−${formatBottles(bottles, perCase)}`
  if (type === "adjust") {
    const sign = bottles > 0 ? "+" : "−"
    return `${sign}${formatBottles(Math.abs(bottles), perCase)}`
  }
  if (type === "allocate") return `${formatBottles(bottles, perCase)} held`
  if (type === "release") return `${formatBottles(bottles, perCase)} released`
  return formatBottles(bottles, perCase)
}
