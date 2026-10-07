"use client"

import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MovementDialog } from "@/components/movement-dialog"
import { ColorMark } from "@/components/marks"
import { SupplyPill } from "@/components/supply-pill"
import { EmptyWine, WineDetail } from "@/components/wine-detail"
import { WineFormDialog } from "@/components/wine-form-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCount, wineName } from "@/lib/format"
import { COLOR_LABEL } from "@/lib/format"
import { winePosition } from "@/lib/inventory"
import { formatDaysRemaining, supplyLine } from "@/lib/supply"
import type { Books, PostingPreset, WineColor } from "@/lib/types"
import { WINE_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

type SortKey = "producer" | "free" | "risk" | "held" | "supply"

export function CatalogView({
  books,
  initialWineId,
  initialSort,
}: {
  books: Books
  initialWineId?: string
  initialSort?: string
}) {
  const [query, setQuery] = useState("")
  const [color, setColor] = useState<WineColor | "all">("all")
  const [country, setCountry] = useState("all")
  const initialSortKey: SortKey =
    initialSort === "risk"
      ? "risk"
      : initialSort === "held"
        ? "held"
        : initialSort === "supply"
          ? "supply"
          : "producer"
  const [sort, setSort] = useState<SortKey>(initialSortKey)
  const [trackedSort, setTrackedSort] = useState(initialSort)
  const [selectedId, setSelectedId] = useState<string | null>(initialWineId ?? null)
  const [trackedWine, setTrackedWine] = useState(initialWineId)
  const [adding, setAdding] = useState(false)
  const [addSession, setAddSession] = useState(0)
  const [postOpen, setPostOpen] = useState(false)
  const [preset, setPreset] = useState<PostingPreset | null>(null)
  const [postSession, setPostSession] = useState(0)

  if (initialWineId && initialWineId !== trackedWine) {
    setTrackedWine(initialWineId)
    setSelectedId(initialWineId)
  }
  if (
    (initialSort === "risk" || initialSort === "held" || initialSort === "supply") &&
    initialSort !== trackedSort
  ) {
    setTrackedSort(initialSort)
    setSort(
      initialSort === "held" ? "held" : initialSort === "supply" ? "supply" : "risk",
    )
  }

  useEffect(() => {
    if (!initialWineId) return
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("wine-detail")?.scrollIntoView({ block: "start" })
    }
  }, [initialWineId])

  const countries = [...new Set(books.wines.map((wine) => wine.country))].sort((a, b) =>
    a.localeCompare(b),
  )
  const needle = query.trim().toLowerCase()
  const rows = books.wines
    .filter((wine) => {
      if (color !== "all" && wine.color !== color) return false
      if (country !== "all" && wine.country !== country) return false
      if (!needle) return true
      const haystack = [
        wine.label,
        wine.producer,
        wine.cuvee,
        wine.sku,
        wine.appellation,
        wine.varietal,
        wine.region,
        wine.vintage ? String(wine.vintage) : "nv",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
    .sort((a, b) => compareWines(books, a, b, sort))

  const explicit = books.wines.find((wine) => wine.id === selectedId) ?? null
  const selected = explicit ?? rows[0] ?? null

  function choose(wineId: string) {
    setSelectedId(wineId)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("wine-detail")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  function request(next: PostingPreset) {
    setPreset(next)
    setPostSession((value) => value + 1)
    setPostOpen(true)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Catalog</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">The book</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Live bottle counts with days-of-supply from posted shipments. Reorder alerts use each wine&apos;s winery lead time.
          </p>
        </div>
        <Button
          onClick={() => {
            setAddSession((value) => value + 1)
            setAdding(true)
          }}
        >
          Add a wine
        </Button>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search label, SKU, producer, appellation"
          className="lg:max-w-sm"
          aria-label="Search the catalog"
        />
        <Select
          items={{
            all: "All countries",
            ...Object.fromEntries(countries.map((name) => [name, name])),
          }}
          value={country}
          onValueChange={(value) => setCountry(value ?? "all")}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Country">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={{
            producer: "Producer",
            free: "Free to sell",
            value: "Value at cost",
            risk: "Reorder risk",
          }}
          value={sort}
          onValueChange={(value) => setSort((value as SortKey) || "producer")}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="producer">Producer</SelectItem>
            <SelectItem value="supply">Reorder urgency</SelectItem>
            <SelectItem value="free">Most available</SelectItem>
            <SelectItem value="held">Most committed</SelectItem>
            <SelectItem value="risk">Unavailable first</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground lg:ml-auto">
          {rows.length} {rows.length === 1 ? "wine" : "wines"}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        <FilterChip active={color === "all"} onClick={() => setColor("all")}>
          All colors
        </FilterChip>
        {WINE_COLORS.map((item) => (
          <FilterChip key={item} active={color === item} onClick={() => setColor(item)}>
            {COLOR_LABEL[item]}
          </FilterChip>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-heading text-2xl tracking-tight">Nothing matches</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another color, country, or producer.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("")
                setColor("all")
                setCountry("all")
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Wine</th>
                  <th className="px-2 py-3 font-medium">Appellation</th>
                  <th className="px-2 py-3 font-medium">On hand</th>
                  <th className="px-2 py-3 font-medium">Available</th>
                  <th className="px-2 py-3 font-medium">Committed</th>
                  <th className="px-2 py-3 font-medium">Days left</th>
                  <th className="px-4 py-3 font-medium">Alert</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wine) => {
                  const position = winePosition(books, wine.id)
                  const supply = supplyLine(books, wine)
                  const active = selected?.id === wine.id
                  return (
                    <tr
                      key={wine.id}
                      id={`wine-${wine.id}`}
                      onClick={() => choose(wine.id)}
                      className={cn(
                        "cursor-pointer border-t border-border hover:bg-muted/60",
                        active && "bg-accent",
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => choose(wine.id)}
                        >
                          <span className="font-medium line-clamp-2">{wineName(wine)}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                            {wine.sku}
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <span className="block">{wine.appellation}</span>
                        <span className="mt-0.5 block">
                          <ColorMark color={wine.color} />
                        </span>
                      </td>
                      <td className="px-2 py-3 tabular-nums">{formatCount(position.onHand)}</td>
                      <td className="px-2 py-3 tabular-nums">{formatCount(position.free)}</td>
                      <td className="px-2 py-3 tabular-nums">{formatCount(position.allocated)}</td>
                      <td className="px-2 py-3 tabular-nums">{formatDaysRemaining(supply.daysRemaining)}</td>
                      <td className="px-4 py-3">
                        <SupplyPill urgency={supply.urgency} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <aside
          id="wine-detail"
          className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
          {selected ? (
            <WineDetail books={books} wine={selected} onAction={request} />
          ) : (
            <EmptyWine />
          )}
        </aside>
      </div>

      <WineFormDialog
        key={addSession}
        books={books}
        open={adding}
        onOpenChange={setAdding}
        onCreated={(wineId) => {
          setSelectedId(wineId)
        }}
      />
      <MovementDialog
        key={postSession}
        books={books}
        open={postOpen}
        onOpenChange={setPostOpen}
        preset={preset}
      />
    </div>
  )
}

function FilterChip({
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
        buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
        "rounded-full",
      )}
    >
      {children}
    </button>
  )
}

function compareWines(books: Books, a: Books["wines"][number], b: Books["wines"][number], sort: SortKey) {
  const left = winePosition(books, a.id)
  const right = winePosition(books, b.id)
  if (sort === "free") return right.free - left.free || (a.label || a.producer).localeCompare(b.label || b.producer)
  if (sort === "supply") {
    const rank = (line: ReturnType<typeof supplyLine>) => {
      if (line.urgency === "critical") return 0
      if (line.urgency === "warning") return 1
      if (line.urgency === "watch") return 2
      if (line.urgency === "unknown") return 3
      return 4
    }
    const leftLine = supplyLine(books, a)
    const rightLine = supplyLine(books, b)
    return (
      rank(leftLine) - rank(rightLine) ||
      (leftLine.daysRemaining ?? Number.POSITIVE_INFINITY) -
        (rightLine.daysRemaining ?? Number.POSITIVE_INFINITY) ||
      (a.label || a.producer).localeCompare(b.label || b.producer)
    )
  }
  if (sort === "held") {
    return right.allocated - left.allocated || (a.label || a.producer).localeCompare(b.label || b.producer)
  }
  if (sort === "risk") {
    const risk = (_wine: Books["wines"][number], free: number, onHand: number) =>
      free <= 0 && onHand > 0 ? onHand : free <= 0 ? -1 : 0
    return (
      risk(b, right.free, right.onHand) - risk(a, left.free, left.onHand) ||
      (a.label || a.producer).localeCompare(b.label || b.producer)
    )
  }
  return (a.label || a.producer).localeCompare(b.label || b.producer)
}
