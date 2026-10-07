"use client"

import { useRef, useState, useTransition, type DragEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { importInventoryCsv } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InventoryUpload({ layout = "sidebar" }: { layout?: "inline" | "sidebar" }) {
  const sidebar = layout === "sidebar"
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  function upload(data: FormData) {
    startTransition(async () => {
      const result = await importInventoryCsv(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      setFileName(null)
      inputRef.current?.form?.reset()
      router.refresh()
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    upload(new FormData(event.currentTarget))
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Upload a .csv file.")
      return
    }
    setFileName(file.name)
    const data = new FormData()
    data.set("file", file)
    upload(data)
  }

  function openPicker() {
    inputRef.current?.click()
  }

  return (
    <form onSubmit={submit} encType="multipart/form-data" className="flex min-w-0 flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openPicker()
          }
        }}
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-16 min-w-0 flex-1 cursor-pointer items-center rounded-lg border border-dashed px-3 py-2.5 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : sidebar
              ? "border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent/70"
              : "border-border/80 bg-background hover:border-border hover:bg-muted/40",
        )}
      >
        <div className="min-w-0 text-left">
          <p className={cn("truncate", sidebar ? "text-xs text-sidebar-foreground" : "text-sm text-foreground")}>
            {pending ? "Uploading…" : fileName ? fileName : "Drop CSV or browse"}
          </p>
          <p className={cn("mt-0.5", sidebar ? "text-[10px] text-sidebar-foreground/55" : "text-xs text-muted-foreground")}>
            {fileName ? "Ready to upload" : "Product name · SKU · on hand · available"}
          </p>
        </div>
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            setFileName(file?.name ?? null)
          }}
        />
      </div>
      <Button type="submit" disabled={pending || !fileName} className="shrink-0">
        {pending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  )
}
