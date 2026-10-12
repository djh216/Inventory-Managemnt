import Link from "next/link"
import { clearOrderHistoryForm, setSalesPaceWindowForm } from "@/lib/actions"
import { OUTFIELD_COLUMNS } from "@/lib/order-history-meta"
import { OrderHistoryUploadForm } from "@/components/order-history-upload-form"
import { formatCount, formatWhen } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PACE_WINDOWS = [30, 60, 90, 180] as const

export function SidebarOrderHistoryServer({
  orderLineCount,
  orderHistoryImportedAt,
  salesPaceWindowDays,
}: {
  orderLineCount: number
  orderHistoryImportedAt: string | null
  salesPaceWindowDays: number
}) {
  return (
    <div className="space-y-4 text-sidebar-foreground">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg tracking-tight">Order history</h2>
          <Link
            href="/order-history-template.csv"
            download
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-auto px-1 py-0 text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            Template
          </Link>
        </div>
        {orderHistoryImportedAt ? (
          <p className="text-[11px] leading-4 text-sidebar-foreground/60">
            {formatCount(orderLineCount)} lines · {formatWhen(orderHistoryImportedAt)}
          </p>
        ) : (
          <p className="text-[11px] text-sidebar-foreground/60">No file loaded</p>
        )}
        <p className="text-[11px] leading-4 text-sidebar-foreground/60">
          Import sales pace from an Outfield export. Re-upload replaces the file; on-hand counts stay the same.
        </p>
      </div>

      <OrderHistoryUploadForm />

      <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5 ring-1 ring-sidebar-border">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55">
          Reorder alerts
        </p>
        <p className="mt-1 text-[10px] leading-4 text-sidebar-foreground/55">
          Pace window for live inventory (table uses 30 / 90 / 180).
        </p>
        <form action={setSalesPaceWindowForm} className="mt-2 flex flex-col gap-2">
          <select
            name="days"
            defaultValue={String(salesPaceWindowDays)}
            className="h-9 w-full rounded-lg border border-sidebar-border bg-sidebar-accent px-2 text-sm"
          >
            {PACE_WINDOWS.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-3 text-sm text-secondary-foreground"
          >
            Apply pace window
          </button>
        </form>
        {orderLineCount > 0 ? (
          <form action={clearOrderHistoryForm} className="mt-2">
            <button
              type="submit"
              className="h-auto w-full text-left text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              Clear uploaded orders
            </button>
          </form>
        ) : null}
      </div>

      <details className="text-[11px] text-sidebar-foreground/60">
        <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-[0.12em] hover:text-sidebar-foreground">
          Outfield columns
        </summary>
        <ul className="mt-2 space-y-1 pl-0.5">
          {OUTFIELD_COLUMNS.map((column) => (
            <li key={column}>{column}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
