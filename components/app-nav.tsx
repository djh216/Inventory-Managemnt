"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { resetBooks } from "@/lib/actions"
import { ClearHistoryButton } from "@/components/order-history-controls"
import { SidebarInventoryUpload } from "@/components/sidebar-inventory-upload"
import { SidebarOrderHistory } from "@/components/sidebar-order-history"
import { NavFrame } from "@/components/nav-frame"
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

export function AppNav({
  alertCount = 0,
  orderLineCount = 0,
  orderHistoryImportedAt = null,
  salesPaceWindowDays = 30,
  skuCount = 0,
  inventoryAsOf = "2026-10-06",
}: {
  alertCount?: number
  orderLineCount?: number
  orderHistoryImportedAt?: string | null
  salesPaceWindowDays?: number
  skuCount?: number
  inventoryAsOf?: string
}) {
  const pathname = usePathname()
  return (
    <NavFrame
      pathname={pathname}
      footer={<UploadResets orderLineCount={orderLineCount} />}
      alertCount={alertCount}
      orderHistoryPanel={() => (
        <div className="space-y-4">
          <SidebarInventoryUpload skuCount={skuCount} inventoryAsOf={inventoryAsOf} />
          <div className="border-t border-sidebar-border pt-4">
            <SidebarOrderHistory
              orderLineCount={orderLineCount}
              orderHistoryImportedAt={orderHistoryImportedAt}
              salesPaceWindowDays={salesPaceWindowDays}
            />
          </div>
        </div>
      )}
    />
  )
}

const resetButtonClass =
  "h-auto justify-start px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"

function UploadResets({ orderLineCount }: { orderLineCount: number }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <ClearInventoryButton />
      <ClearHistoryButton disabled={orderLineCount === 0} className={resetButtonClass} />
    </div>
  )
}

function ClearInventoryButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function restore() {
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
      <Button variant="ghost" className={resetButtonClass} onClick={() => setOpen(true)}>
        Clear inventory
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear the inventory upload?</DialogTitle>
          <DialogDescription>
            On-hand counts, postings, and catalog edits return to the Oct 6 inventory file. Uploaded order
            history stays.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep inventory</DialogClose>
          <Button onClick={restore} disabled={pending}>
            {pending ? "Clearing…" : "Clear inventory"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
