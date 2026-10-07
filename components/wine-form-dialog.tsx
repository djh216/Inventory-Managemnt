"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createWine } from "@/lib/actions"
import { COLOR_LABEL } from "@/lib/format"
import { applyCreateWine } from "@/lib/posting"
import type { Books, CreateWineInput, WineColor } from "@/lib/types"
import { WINE_COLORS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Draft = {
  producer: string
  cuvee: string
  vintage: string
  nv: boolean
  color: WineColor | null
  varietal: string
  country: string
  region: string
  appellation: string
  formatMl: string
  bottlesPerCase: string
  abv: string
  costPerCase: string
  pricePerCase: string
  reorderCases: string
  supplier: string
  locationId: string
  openingCases: string
}

const FORMAT_ITEMS = {
  "375": "375 ml",
  "750": "750 ml",
  "1500": "1.5 L",
}

const PACK_ITEMS = {
  "12": "12 bottles",
  "6": "6 bottles",
}

const emptyDraft = (locationId: string): Draft => ({
  producer: "",
  cuvee: "",
  vintage: "",
  nv: false,
  color: null,
  varietal: "",
  country: "",
  region: "",
  appellation: "",
  formatMl: "750",
  bottlesPerCase: "12",
  abv: "",
  costPerCase: "",
  pricePerCase: "",
  reorderCases: "6",
  supplier: "",
  locationId,
  openingCases: "0",
})

export function WineFormDialog({
  books,
  open,
  onOpenChange,
  onCreated,
}: {
  books: Books
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (wineId: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(books.locations[0]?.id ?? ""))
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const input = toInput(draft)
    if (!input) {
      setError("Choose a color and a vintage, or mark the wine non-vintage.")
      return
    }
    const checked = applyCreateWine(
      books,
      input,
      new Date().toISOString(),
      "preview-wine",
      "preview-move",
    )
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createWine(input)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(result.message)
      if (result.wineId) onCreated(result.wineId)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a wine</DialogTitle>
          <DialogDescription>
            The SKU is written from the producer, cuvée, and vintage. An opening count posts as a receipt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Producer">
              <Input value={draft.producer} onChange={(event) => update("producer", event.target.value)} placeholder="Domaine Marchand" />
            </Field>
            <Field label="Cuvée">
              <Input value={draft.cuvee} onChange={(event) => update("cuvee", event.target.value)} placeholder="Les Charmes" />
            </Field>
            <Field label="Vintage">
              <div className="flex items-center gap-2">
                <Input
                  value={draft.vintage}
                  disabled={draft.nv}
                  inputMode="numeric"
                  onChange={(event) => update("vintage", event.target.value)}
                  placeholder="2022"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={draft.nv}
                    onChange={(event) => update("nv", event.target.checked)}
                  />
                  NV
                </label>
              </div>
            </Field>
            <Field label="Color">
              <Select
                items={Object.fromEntries(WINE_COLORS.map((color) => [color, COLOR_LABEL[color]]))}
                value={draft.color}
                onValueChange={(value) => update("color", (value as WineColor | null) ?? null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a color" />
                </SelectTrigger>
                <SelectContent>
                  {WINE_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      {COLOR_LABEL[color]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Varietal">
              <Input value={draft.varietal} onChange={(event) => update("varietal", event.target.value)} placeholder="Pinot Noir" />
            </Field>
            <Field label="Supplier">
              <Input value={draft.supplier} onChange={(event) => update("supplier", event.target.value)} placeholder="Who you buy it from" />
            </Field>
            <Field label="Country">
              <Input value={draft.country} onChange={(event) => update("country", event.target.value)} placeholder="France" />
            </Field>
            <Field label="Region">
              <Input value={draft.region} onChange={(event) => update("region", event.target.value)} placeholder="Burgundy" />
            </Field>
            <Field label="Appellation">
              <Input value={draft.appellation} onChange={(event) => update("appellation", event.target.value)} placeholder="Chambolle-Musigny" />
            </Field>
            <Field label="ABV">
              <Input value={draft.abv} inputMode="decimal" onChange={(event) => update("abv", event.target.value)} placeholder="13" />
            </Field>
            <Field label="Bottle">
              <Select
                items={FORMAT_ITEMS}
                value={draft.formatMl}
                onValueChange={(value) => update("formatMl", value ?? "750")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="375">375 ml</SelectItem>
                  <SelectItem value="750">750 ml</SelectItem>
                  <SelectItem value="1500">1.5 L</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Case pack">
              <Select
                items={PACK_ITEMS}
                value={draft.bottlesPerCase}
                onValueChange={(value) => update("bottlesPerCase", value ?? "12")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 bottles</SelectItem>
                  <SelectItem value="6">6 bottles</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cost / case">
              <Input value={draft.costPerCase} inputMode="numeric" onChange={(event) => update("costPerCase", event.target.value)} placeholder="168" />
            </Field>
            <Field label="Wholesale / case">
              <Input value={draft.pricePerCase} inputMode="numeric" onChange={(event) => update("pricePerCase", event.target.value)} placeholder="252" />
            </Field>
            <Field label="Reorder at (cases)">
              <Input value={draft.reorderCases} inputMode="numeric" onChange={(event) => update("reorderCases", event.target.value)} />
            </Field>
            <Field label="Opening cases">
              <Input value={draft.openingCases} inputMode="numeric" onChange={(event) => update("openingCases", event.target.value)} />
            </Field>
          </div>
          <Field label="Opening house">
            <Select
              items={Object.fromEntries(books.locations.map((location) => [location.id, location.name]))}
              value={draft.locationId}
              onValueChange={(value) => update("locationId", value ?? draft.locationId)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a house" />
              </SelectTrigger>
              <SelectContent>
                {books.locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add wine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function toInput(draft: Draft): CreateWineInput | null {
  if (!draft.color) return null
  let vintage: number | null = null
  if (!draft.nv) {
    if (!/^\d{4}$/.test(draft.vintage.trim())) return null
    vintage = Number(draft.vintage)
  }
  return {
    producer: draft.producer,
    cuvee: draft.cuvee,
    vintage,
    color: draft.color,
    varietal: draft.varietal,
    country: draft.country,
    region: draft.region,
    appellation: draft.appellation,
    formatMl: Number(draft.formatMl),
    bottlesPerCase: Number(draft.bottlesPerCase),
    abv: draft.abv.trim() === "" ? Number.NaN : Number(draft.abv),
    costPerCase: wholeNumber(draft.costPerCase),
    pricePerCase: wholeNumber(draft.pricePerCase),
    reorderCases: wholeNumber(draft.reorderCases),
    supplier: draft.supplier,
    locationId: draft.locationId,
    openingCases: draft.openingCases.trim() === "" ? 0 : wholeNumber(draft.openingCases),
  }
}

function wholeNumber(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN
}
