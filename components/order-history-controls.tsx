"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { clearOrderHistory, setSalesPaceWindow } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const OUTFIELD_COLUMNS = [
  "Lead Team Member",
  "Account Name",
  "Order Date",
  "Line Item Product Variation Name",
  "Line Item Quantity",
] as const

export function PaceWindowForm({
  windowDays,
  compact,
}: {
  windowDays: number
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(String(windowDays))

  function save(event: FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await setSalesPaceWindow(Number(value))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className={cn("mt-2 flex items-center gap-2", compact && "flex-col items-stretch")}>
      <Label htmlFor="pace-window" className="sr-only">
        Pace window in days
      </Label>
      <Select value={value} onValueChange={(next) => setValue(next ?? String(windowDays))}>
        <SelectTrigger id="pace-window" className={cn("h-9 flex-1", compact && "w-full bg-sidebar-accent")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="60">60 days</SelectItem>
          <SelectItem value="90">90 days</SelectItem>
          <SelectItem value="180">180 days</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={pending || Number(value) === windowDays}
        className={compact ? "w-full" : undefined}
      >
        {pending ? "…" : "Apply"}
      </Button>
    </form>
  )
}

export function ClearHistoryButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function clear() {
    startTransition(async () => {
      const result = await clearOrderHistory()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={clear} className={className}>
      {pending ? "Clearing…" : "Clear uploaded orders"}
    </Button>
  )
}
