"use client"

import { useMemo, useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { clearOrderHistory, importOrderHistoryCsv, setSalesPaceWindow } from "@/lib/actions"
import { formatCount, formatWhen, wineName } from "@/lib/format"
import {
  daysOnHandBand,
  daysOnHandSummary,
  formatDaysRemaining,
  salesPaceWindowDays,
  supplyLines,
  type DaysOnHandBand,
  type SupplyLine,
} from "@/lib/supply"
import type { Books } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type FilterBand = "all" | DaysOnHandBand

const bandLabel: Record<DaysOnHandBand, string> = {
  out: "Out of stock",
  urgent: "≤ 14 days",
  tight: "15–45 days",
  comfortable: "45+ days",
  idle: "No stock",
  unknown: "No sales pace",
}

const bandStyle: Record<DaysOnHandBand, string> = {
  out: "bg-out/15 text-out",
  urgent: "bg-out/15 text-out",
  tight: "bg-low/15 text-low",
  comfortable: "bg-healthy/10 text-healthy",
  idle: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
}

export function DaysOnHandView({ books }: { books: Books }) {
  const windowDays = salesPaceWindowDays(books)
  const summary = daysOnHandSummary(books)
  const lines = useMemo(
    () =>
      supplyLines(books)
        .filter((line) => line.wine.active)
        .sort((a, b) => compareDaysOnHand(a, b)),
    [books],
  )

  const [query, setQuery] = useState("")
  const [band, setBand] = useState<FilterBand>("all")

  const filtered = lines.filter((line) => {
    if (band !== "all" && daysOnHandBand(line) !== band) return false
    if (!query.trim()) return true
    const hay = `${line.wine.label} ${line.wine.sku} ${line.wine.producer}`.toLowerCase()
    return hay.includes(query.trim().toLowerCase())
  })

  const orderLineCount = books.orderHistory?.length ?? 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sales pace</p>
          <h1 className="mt-1 font-heading text-4xl tracking-tight">Days on hand</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload order history to set each product&apos;s sales pace. Days on hand = available bottles ÷
            average daily orders over the last {windowDays} days (uploaded orders plus shipments you post).
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="SKUs with pace" value={String(summary.withPace)} detail="Enough order history in the window" />
        <Kpi label="Need order data" value={String(summary.withoutPace)} detail="No sales in the pace window" />
        <Kpi
          label="Median days on hand"
          value={summary.medianDays === null ? "—" : formatDaysRemaining(summary.medianDays)}
          detail="Among SKUs with a calculated pace"
        />
        <Kpi label="≤ 14 days on hand" value={String(summary.urgent)} detail="Low cover at current pace" />
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl tracking-tight">Order history upload</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              CSV columns: <span className="font-mono">SKU</span> (or Label),{" "}
              <span className="font-mono">Order Date</span>, <span className="font-mono">Bottles</span>, optional
              Account and Reference. Re-upload replaces the previous file; inventory counts stay as uploaded.
            </p>
            {books.orderHistoryImportedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Last import: {formatWhen(books.orderHistoryImportedAt)} · {orderLineCount} lines
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No order file uploaded yet.</p>
            )}
          </div>
          <a
            href="/order-history-template.csv"
            download
            className="text-xs underline-offset-2 hover:underline"
          >
            Download template
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <OrderHistoryUploadForm />
          <PaceWindowForm key={windowDays} windowDays={windowDays} />
          {orderLineCount > 0 ? <ClearHistoryButton /> : null}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search label or SKU…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Select value={band} onValueChange={(value) => setBand(value as FilterBand)}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            <SelectItem value="urgent">≤ 14 days</SelectItem>
            <SelectItem value="tight">15–45 days</SelectItem>
            <SelectItem value="comfortable">45+ days</SelectItem>
            <SelectItem value="out">Out at pace</SelectItem>
            <SelectItem value="unknown">No sales pace</SelectItem>
            <SelectItem value="idle">No stock</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {lines.length} active SKUs
        </p>
      </section>

      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-2 py-3 font-medium">Available</th>
              <th className="px-2 py-3 font-medium">Sold ({windowDays}d)</th>
              <th className="px-2 py-3 font-medium">Daily pace</th>
              <th className="px-2 py-3 font-medium">Days on hand</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((line) => (
              <tr key={line.wine.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/catalog?wine=${line.wine.id}`} className="font-medium hover:underline">
                    {wineName(line.wine)}
                  </Link>
                  <p className="font-mono text-[11px] text-muted-foreground">{line.wine.sku}</p>
                </td>
                <td className="px-2 py-3 tabular-nums">{formatCount(line.available)}</td>
                <td className="px-2 py-3 tabular-nums">{formatCount(line.shippedWindow)}</td>
                <td className="px-2 py-3 tabular-nums">
                  {line.dailyRate ? line.dailyRate.toFixed(2) : "—"}
                </td>
                <td className="px-2 py-3 tabular-nums font-medium">{formatDaysRemaining(line.daysRemaining)}</td>
                <td className="px-4 py-3">
                  <DaysOnHandPill band={daysOnHandBand(line)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">No products match this filter.</p>
        ) : null}
      </div>
    </div>
  )
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function DaysOnHandPill({ band }: { band: DaysOnHandBand }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        bandStyle[band],
      )}
    >
      {bandLabel[band]}
    </span>
  )
}

function OrderHistoryUploadForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const result = await importOrderHistoryCsv(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      form.reset()
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="order-history-file" className="text-xs">
          Order history CSV
        </Label>
        <Input id="order-history-file" name="file" type="file" accept=".csv,text/csv" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload orders"}
      </Button>
    </form>
  )
}

function PaceWindowForm({ windowDays }: { windowDays: number }) {
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
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="pace-window" className="text-xs">
          Pace window (days)
        </Label>
        <Select value={value} onValueChange={(next) => setValue(next ?? String(windowDays))}>
          <SelectTrigger id="pace-window" className="w-[7rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="28">28</SelectItem>
            <SelectItem value="60">60</SelectItem>
            <SelectItem value="90">90</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={pending || Number(value) === windowDays}>
        {pending ? "Saving…" : "Apply"}
      </Button>
    </form>
  )
}

function ClearHistoryButton() {
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
    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={clear}>
      {pending ? "Clearing…" : "Clear uploaded orders"}
    </Button>
  )
}

function compareDaysOnHand(a: SupplyLine, b: SupplyLine) {
  const left = a.daysRemaining ?? Number.POSITIVE_INFINITY
  const right = b.daysRemaining ?? Number.POSITIVE_INFINITY
  const leftUnknown = a.dailyRate === null || a.dailyRate <= 0
  const rightUnknown = b.dailyRate === null || b.dailyRate <= 0
  if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1
  return left - right || a.wine.label.localeCompare(b.wine.label)
}
