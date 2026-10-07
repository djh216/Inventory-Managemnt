"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { resetBooks } from "@/lib/actions"
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

export function AppNav() {
  const pathname = usePathname()
  return <NavFrame pathname={pathname} footer={<RestoreBooks />} />
}

function RestoreBooks() {
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
      <Button
        variant="ghost"
        className="h-auto px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={() => setOpen(true)}
      >
        Restore upload
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore the Oct 6 upload?</DialogTitle>
          <DialogDescription>
            This replaces the book on this machine with a fresh import from data/inventory-upload.csv. Postings you made after the upload will be cleared.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep my books</DialogClose>
          <Button onClick={restore} disabled={pending}>
            {pending ? "Restoring…" : "Restore upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
