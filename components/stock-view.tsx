"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MovementDialog } from "@/components/movement-dialog"
import { SupplyPill } from "@/components/supply-pill"
import { supplyLine } from "@/lib/supply"
import { WineDetail } from "@/components/wine-detail"
import { formatCount } from "@/lib/format"
import { fullestFreeLocation, lineAt, lineFree, winePosition } from "@/lib/inventory"
import type { Books, PostingPreset } from "@/lib/types"
import { cn } from "@/lib/utils"

export function StockView({ books, initialHouse }: { books: Books; initialHouse?: string }) {
  const knownHouse = books.locations.some((location) => location.id === initialHouse)
    ? initialHouse ?? "all"
    : "all"
  const [house, setHouse] = useState(knownHouse)
  const [trackedHouse, setTrackedHouse] = useState(initialHouse)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [postOpen, setPostOpen] = useState(false)
  const [preset, setPreset] = useState<PostingPreset | null>(null)
  const [session, setSession] = useState(0)

  if (
    initialHouse &&
    initialHouse !== trackedHouse &&
    books.locations.some((location) => location.id === initialHouse)
  ) {
    setTrackedHouse(initialHouse)
    setHouse(initialHouse)
  }

  const needle = query.trim().toLowerCase()
  const rows = books.wines
    .filter((wine) => {
      if (house !== "all") {
        const line = lineAt(books, wine.id, house)
        const bottles = (line?.onHandBottles ?? 0) + (line?.allocatedBottles ?? 0)
        const anywhere = winePosition(books, wine.id).onHand + winePosition(books, wine.id).allocated
        if (bottles === 0 && anywhere > 0) return false
      }
      if (!needle) return true
      return `${wine.producer} ${wine.cuvee} ${wine.sku} ${wine.appellation}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => a.producer.localeCompare(b.producer) || a.cuvee.localeCompare(b.cuvee))

  const selected = books.wines.find((wine) => wine.id === selectedId) ?? null

  function request(next: PostingPreset) {
    setPreset(next)
    setSession((value) => value + 1)
    setPostOpen(true)
  }

  function choose(wineId: string) {
    setSelectedId(wineId)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("stock-detail")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Stock</p>
        <h1 className="mt-1 font-heading text-4xl tracking-tight">Floor stock</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Bottle counts from the upload: on hand, committed, and available. Shipments only draw from available bottles.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the floor"
          aria-label="Search stock"
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          <HouseChip active={house === "all"} onClick={() => setHouse("all")}>
            All houses
          </HouseChip>
          {books.locations.map((location) => (
            <HouseChip
              key={location.id}
              active={house === location.id}
              onClick={() => setHouse(location.id)}
            >
              {location.name}
            </HouseChip>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-heading text-2xl tracking-tight">This house is clear</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No wine on the book matches that house and search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Wine</th>
                  {books.locations.map((location) => (
                    <th key={location.id} className="px-2 py-3 font-medium">
                      <span className="block">{location.name}</span>
                      <span className="mt-0.5 block font-normal normal-case tracking-normal text-muted-foreground">
                        On hand (bottles)
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-3 font-medium">
                    <span className="block">Available</span>
                    <span className="mt-0.5 block font-normal normal-case tracking-normal text-muted-foreground">
                      (bottles)
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wine) => {
                  const position = winePosition(books, wine.id)
                  const active = selected?.id === wine.id
                  return (
                    <tr
                      key={wine.id}
                      onClick={() => choose(wine.id)}
                      className={cn(
                        "cursor-pointer border-t border-border hover:bg-muted/60",
                        active && "bg-accent",
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{wine.producer}</p>
                        <p className="text-xs text-muted-foreground">
                          {wine.cuvee} {wine.vintage ?? "NV"}
                        </p>
                      </td>
                      {books.locations.map((location) => {
                        const line = lineAt(books, wine.id, location.id)
                        const onHand = line?.onHandBottles ?? 0
                        const held = line?.allocatedBottles ?? 0
                        const available = line ? lineFree(line) : 0
                        return (
                          <td key={location.id} className="px-2 py-3 align-top tabular-nums">
                            <span>{formatCount(onHand)}</span>
                            {held > 0 ? (
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                {formatCount(held)} committed · {formatCount(available)} avail.
                              </span>
                            ) : null}
                          </td>
                        )
                      })}
                      <td className="px-2 py-3 tabular-nums">{formatCount(position.free)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <SupplyPill urgency={supplyLine(books, wine).urgency} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              request({
                                type: position.free > 0 ? "ship" : "receive",
                                wineId: wine.id,
                                locationId:
                                  house !== "all" ? house : fullestFreeLocation(books, wine.id),
                              })
                            }}
                          >
                            Post
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <aside
          id="stock-detail"
          className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          {selected ? (
            <WineDetail books={books} wine={selected} onAction={request} />
          ) : (
            <div className="flex min-h-48 flex-col justify-end">
              <p className="font-heading text-2xl tracking-tight">Pick a line</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open a wine to receive, ship, hold, or correct the count.
              </p>
            </div>
          )}
        </aside>
      </div>

      <MovementDialog
        key={session}
        books={books}
        open={postOpen}
        onOpenChange={setPostOpen}
        preset={preset}
      />
    </div>
  )
}

function HouseChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs ring-1 ring-foreground/15",
        active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
