import { COLOR_LABEL, COLOR_SWATCH, STATUS_LABEL } from "@/lib/format"
import type { StockStatus, WineColor } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusClass: Record<StockStatus, string> = {
  healthy: "bg-healthy/10 text-healthy",
  low: "bg-low/15 text-low",
  out: "bg-out/10 text-out",
  idle: "bg-muted text-muted-foreground",
}

export function StatusPill({ status }: { status: StockStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        statusClass[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ColorMark({ color }: { color: WineColor }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: COLOR_SWATCH[color] }}
        aria-hidden
      />
      {COLOR_LABEL[color]}
    </span>
  )
}
