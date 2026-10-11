"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { clearInventoryUpload, resetBooks } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export const INVENTORY_CSV_COLUMNS = [
  "Label",
  "SKU",
  "Quantity On Hand",
  "Quantity Available",
] as const

export function ClearInventoryButton({ className }: { className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function clear() {
    startTransition(async () => {
      const result = await clearInventoryUpload()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        Clear inventory upload
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear inventory upload?</DialogTitle>
          <DialogDescription>
            This removes all SKUs, stock counts, and postings from the book and clears the saved inventory CSV. Order
            history is cleared too. Upload a new inventory file afterward to rebuild the catalog.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep inventory</DialogClose>
          <Button variant="destructive" onClick={clear} disabled={pending}>
            {pending ? "Clearing…" : "Clear inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReloadInventoryButton({ className }: { className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function reload() {
    startTransition(async () => {
      const result = await resetBooks()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-auto px-0 text-[11px]", className)}
        onClick={() => setOpen(true)}
      >
        Reload from saved CSV
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reload inventory from saved CSV?</DialogTitle>
          <DialogDescription>
            Re-imports data/inventory-upload.csv on this machine. Postings you made in the app are cleared. Order history
            lines are kept when their SKU still exists in the file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={reload} disabled={pending}>
            {pending ? "Reloading…" : "Reload CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
