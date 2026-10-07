"use client"

import { useId, useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setReorder } from "@/lib/actions"
import {
  formatAbv,
  formatBottleSize,
  formatBottles,
  formatCount,
  formatWhen,
  MOVEMENT_LABEL,
} from "@/lib/format"
import { fullestFreeLocation, lineAt, statusFor, winePosition } from "@/lib/inventory"
import type { Books, PostingPreset, Wine } from "@/lib/types"
import { ColorMark, StatusPill } from "@/components/marks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function WineDetail({
  books,
  wine,
  onAction,
}: {
  books: Books
  wine: Wine
  onAction: (preset: PostingPreset) => void
}) {
  const position = winePosition(books, wine.id)
  const status = statusFor(wine, position.free)
  const preferredHouse = fullestFreeLocation(books, wine.id)
  const recent = books.movements
    .filter((movement) => movement.wineId === wine.id)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{wine.sku}</p>
          <StatusPill status={status} />
        </div>
        <h2 className="mt-1 font-heading text-xl leading-snug tracking-tight">{wine.label || `${wine.producer} ${wine.cuvee}`}</h2>
        <p className="mt-2 text-sm">
          {wine.appellation}
          <span className="text-muted-foreground"> · {wine.region}, {wine.country}</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <ColorMark color={wine.color} />
          <span>{wine.varietal}</span>
          <span>{formatAbv(wine.abv)}</span>
          <span>
            {formatBottleSize(wine.formatMl)} · {wine.bottlesPerCase}/cs
          </span>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="On hand" value={formatCount(position.onHand)} />
        <Stat label="Available" value={formatCount(position.free)} />
        <Stat label="Committed" value={formatCount(position.allocated)} />
      </dl>
      {wine.supplier ? (
        <p className="text-xs text-muted-foreground">Supplier {wine.supplier}</p>
      ) : null}
      {wine.note ? <p className="text-sm leading-6">{wine.note}</p> : null}

      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Floor</h3>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">House</th>
              <th className="py-1 font-medium">On hand</th>
              <th className="py-1 font-medium">Held</th>
              <th className="py-1 font-medium">Free</th>
            </tr>
          </thead>
          <tbody>
            {books.locations.map((location) => {
              const line = lineAt(books, wine.id, location.id)
              const onHand = line?.onHandBottles ?? 0
              const held = line?.allocatedBottles ?? 0
              return (
                <tr key={location.id} className="border-t border-border">
                  <td className="py-2 pr-2">{location.name}</td>
                  <td className="py-2 tabular-nums">{formatBottles(onHand, wine.bottlesPerCase)}</td>
                  <td className="py-2 tabular-nums">{formatBottles(held, wine.bottlesPerCase)}</td>
                  <td className="py-2 tabular-nums">{formatBottles(onHand - held, wine.bottlesPerCase)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ReorderForm key={wine.id} wine={wine} />

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onAction({ type: "receive", wineId: wine.id, locationId: preferredHouse })}>
          Receive
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction({ type: "ship", wineId: wine.id, locationId: preferredHouse })}
        >
          Ship
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction({ type: "allocate", wineId: wine.id, locationId: preferredHouse })}
        >
          Hold
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction({ type: "release", wineId: wine.id, locationId: preferredHouse })}
        >
          Release
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction({ type: "transfer", wineId: wine.id, locationId: preferredHouse })}
        >
          Transfer
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction({ type: "adjust", wineId: wine.id, locationId: preferredHouse })}
        >
          Count
        </Button>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Recent postings</h3>
          <Link href={`/ledger?wine=${wine.id}`} className="text-xs underline-offset-2 hover:underline">
            Full ledger
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No postings for this wine yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recent.map((movement) => {
              const house = books.locations.find((location) => location.id === movement.locationId)
              return (
                <li key={movement.id} className="text-sm">
                  <span className="font-medium">{MOVEMENT_LABEL[movement.type]}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatBottles(Math.abs(movement.bottles), wine.bottlesPerCase)} · {house?.name} ·{" "}
                    {formatWhen(movement.at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/70 px-2.5 py-2">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-lg tabular-nums">{value}</dd>
    </div>
  )
}

function ReorderForm({ wine }: { wine: Wine }) {
  const router = useRouter()
  const id = useId()
  const [value, setValue] = useState(String(wine.reorderCases))
  const [pending, startTransition] = useTransition()

  function save(event: FormEvent) {
    event.preventDefault()
    const reorderCases = Number(value)
    startTransition(async () => {
      const result = await setReorder(wine.id, reorderCases)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className="flex items-end gap-2">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor={id}>Reorder at (cases)</Label>
        <Input id={id} inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}

export function EmptyWine() {
  return (
    <div className="flex h-full min-h-48 flex-col justify-end">
      <p className="font-heading text-2xl tracking-tight">Pick a wine</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The panel shows the floor count, the hold, and what the bottles are worth.
      </p>
    </div>
  )
}
