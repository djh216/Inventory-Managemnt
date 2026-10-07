import type { SupplyUrgency } from "@/lib/supply"
import { cn } from "@/lib/utils"

const label: Record<SupplyUrgency, string> = {
  critical: "Reorder now",
  warning: "Reorder soon",
  watch: "Watch",
  ok: "Covered",
  unknown: "No order history",
}

const style: Record<SupplyUrgency, string> = {
  critical: "bg-out/15 text-out",
  warning: "bg-low/15 text-low",
  watch: "bg-muted text-muted-foreground",
  ok: "bg-healthy/10 text-healthy",
  unknown: "bg-muted text-muted-foreground",
}

export function SupplyPill({ urgency }: { urgency: SupplyUrgency }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        style[urgency],
      )}
    >
      {label[urgency]}
    </span>
  )
}
