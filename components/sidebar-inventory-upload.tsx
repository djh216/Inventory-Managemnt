"use client"

import Link from "next/link"
import { InventoryUpload } from "@/components/inventory-upload"
import { buttonVariants } from "@/components/ui/button"
import { formatCount, formatWhen } from "@/lib/format"
import { cn } from "@/lib/utils"

export function SidebarInventoryUpload({
  skuCount,
  inventoryImportedAt,
}: {
  skuCount: number
  inventoryImportedAt: string | null
}) {
  return (
    <div className="space-y-2 text-sidebar-foreground">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg tracking-tight">Inventory</h2>
        <Link
          href="/inventory-upload-template.csv"
          download
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-auto px-1 py-0 text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          Template
        </Link>
      </div>
      {inventoryImportedAt ? (
        <p className="text-[11px] leading-4 text-sidebar-foreground/60">
          {formatCount(skuCount)} SKUs · {formatWhen(inventoryImportedAt)}
        </p>
      ) : (
        <p className="text-[11px] leading-4 text-sidebar-foreground/60">
          {formatCount(skuCount)} SKUs · Oct 6 upload
        </p>
      )}
      <p className="text-[11px] leading-4 text-sidebar-foreground/60">
        Re-upload replaces on-hand counts and postings. Order history stays.
      </p>
      <InventoryUpload layout="sidebar" />
    </div>
  )
}
