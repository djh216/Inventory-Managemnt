"use client"

import { useRef, useState, useTransition, type DragEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { importOrderHistoryCsv } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function OrderHistoryUpload({ compact }: { compact?: boolean }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  function upload(data: FormData) {
    startTransition(async () => {
      const result = await importOrderHistoryCsv(data)
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
    const data = new FormData(event.currentTarget)
    upload(data)
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

  return (
    <form onSubmit={submit} encType="multipart/form-data" className={cn("min-w-[min(100%,20rem)]", compact && "w-full")}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "cursor-pointer rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
          compact ? "py-4" : "py-6",
        )}
      >
        <p className="text-sm font-medium">{pending ? "Uploading…" : "Drop order history CSV here"}</p>
        <p className="mt-1 text-xs text-muted-foreground">or click to choose a file</p>
        {fileName ? <p className="mt-2 font-mono text-[11px] text-muted-foreground">{fileName}</p> : null}
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
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !fileName}>
          {pending ? "Uploading…" : "Upload orders"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
          Browse…
        </Button>
      </div>
    </form>
  )
}
