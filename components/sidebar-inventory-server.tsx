import Link from "next/link"
import { clearInventoryUploadForm, resetBooksForm } from "@/lib/actions"
import { INVENTORY_CSV_COLUMNS } from "@/lib/inventory-csv-meta"
import { InventoryUploadForm } from "@/components/inventory-upload-form"
import { formatCount, formatWhen } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SidebarInventoryServer({
  skuCount,
  inventoryImportedAt,
}: {
  skuCount: number
  inventoryImportedAt: string | null
}) {
  return (
    <div className="space-y-4 text-sidebar-foreground">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg tracking-tight">Inventory upload</h2>
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
        ) : skuCount > 0 ? (
          <p className="text-[11px] leading-4 text-sidebar-foreground/60">{formatCount(skuCount)} SKUs loaded</p>
        ) : (
          <p className="text-[11px] text-sidebar-foreground/60">No inventory loaded</p>
        )}
        <p className="text-[11px] leading-4 text-sidebar-foreground/60">
          Replace on-hand counts and the product catalog. Re-upload overwrites the saved file; postings are cleared.
        </p>
      </div>

      <InventoryUploadForm />

      <div className="flex flex-col gap-2">
        {skuCount > 0 ? (
          <form action={clearInventoryUploadForm}>
            <button
              type="submit"
              className="h-auto w-full text-left text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              Clear inventory upload
            </button>
          </form>
        ) : null}
        <form action={resetBooksForm}>
          <button
            type="submit"
            className="h-auto text-left text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            Reload from saved CSV
          </button>
        </form>
      </div>

      <details className="text-[11px] text-sidebar-foreground/60">
        <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-[0.12em] hover:text-sidebar-foreground">
          CSV columns
        </summary>
        <ul className="mt-2 space-y-1 pl-0.5">
          {INVENTORY_CSV_COLUMNS.map((column) => (
            <li key={column}>{column}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
