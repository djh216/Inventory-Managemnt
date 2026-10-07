"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { setReorderAlertsMuted } from "@/lib/actions"
import { Button } from "@/components/ui/button"

export function DismissAlertButton({
  wineId,
  label = "Remove from alerts",
  variant = "ghost",
  size = "sm",
}: {
  wineId: string
  label?: string
  variant?: "ghost" | "outline" | "secondary"
  size?: "sm" | "default"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function dismiss() {
    startTransition(async () => {
      const result = await setReorderAlertsMuted(wineId, true)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={pending} onClick={dismiss}>
      {pending ? "Removing…" : label}
    </Button>
  )
}

export function RestoreAlertButton({ wineId }: { wineId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function restore() {
    startTransition(async () => {
      const result = await setReorderAlertsMuted(wineId, false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={restore}>
      {pending ? "Restoring…" : "Restore reorder alerts"}
    </Button>
  )
}
