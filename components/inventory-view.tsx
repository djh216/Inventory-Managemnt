"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { CatalogView } from "@/components/catalog-view"
import { DeskView } from "@/components/desk-view"
import { MovementDialog } from "@/components/movement-dialog"
import { StockView } from "@/components/stock-view"
import { inventoryHref, type InventoryView } from "@/lib/inventory-routes"
import type { Books, PostingPreset } from "@/lib/types"
import { cn } from "@/lib/utils"

const TABS: { id: InventoryView; label: string; detail: string }[] = [
  {
    id: "overview",
    label: "Overview",
    detail: "Reorder alerts, house totals, and quick shipment posting.",
  },
  {
    id: "products",
    label: "Products",
    detail: "Search the book, open a SKU, and post receipts or shipments.",
  },
  {
    id: "floor",
    label: "Floor stock",
    detail: "On-hand and committed bottles by warehouse location.",
  },
]

export function InventoryView({
  books,
  today,
  view,
  initialWineId,
  initialSort,
  initialHouse,
}: {
  books: Books
  today: string
  view: InventoryView
  initialWineId?: string
  initialSort?: string
  initialHouse?: string
}) {
  const activeTab = useMemo(() => TABS.find((tab) => tab.id === view) ?? TABS[0], [view])
  const [shipOpen, setShipOpen] = useState(false)
  const [shipSession, setShipSession] = useState(0)
  const [shipPreset, setShipPreset] = useState<PostingPreset | null>(null)

  function postShipment() {
    setShipPreset({ type: "ship" })
    setShipSession((value) => value + 1)
    setShipOpen(true)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{today}</p>
            <h1 className="mt-1 font-heading text-4xl tracking-tight">Live inventory</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{activeTab.detail}</p>
          </div>
          {view === "overview" ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={postShipment}>Post a shipment</Button>
              <Link href="/days-on-hand" className={buttonVariants({ variant: "outline" })}>
                Days on hand
              </Link>
            </div>
          ) : null}
        </div>
        <nav
          className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1 ring-1 ring-foreground/10"
          aria-label="Inventory views"
        >
          {TABS.map((tab) => {
            const current = tab.id === view
            return (
              <Link
                key={tab.id}
                href={inventoryHref(tab.id, {
                  wine: tab.id === "products" ? initialWineId : undefined,
                  sort: tab.id === "products" ? initialSort : undefined,
                  house: tab.id === "floor" ? initialHouse : undefined,
                })}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  current
                    ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-foreground/10"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {view === "overview" ? <DeskView books={books} /> : null}
      <MovementDialog
        key={shipSession}
        books={books}
        open={shipOpen}
        onOpenChange={setShipOpen}
        preset={shipPreset}
      />
      {view === "products" ? (
        <CatalogView
          books={books}
          embedded
          initialWineId={initialWineId}
          initialSort={initialSort}
        />
      ) : null}
      {view === "floor" ? <StockView books={books} embedded initialHouse={initialHouse} /> : null}
    </div>
  )
}
