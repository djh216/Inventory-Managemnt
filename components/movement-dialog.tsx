"use client"

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { postMovement } from "@/lib/actions"
import { formatBottles, MOVEMENT_LABEL, wineName } from "@/lib/format"
import { knownAccounts, lineAt } from "@/lib/inventory"
import { applyPosting } from "@/lib/posting"
import type { Books, MovementType, PostingInput, PostingPreset } from "@/lib/types"
import { MOVEMENT_TYPES } from "@/lib/types"
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
import { Textarea } from "@/components/ui/textarea"

const PREVIEW_AT = "1970-01-01T00:00:00.000Z"

const HINT: Record<MovementType, string> = {
  receive: "Wine arrived from a supplier and joins the floor.",
  ship: "Free bottles leave for an account. Release a hold before those bottles can ship.",
  allocate: "Reserve free bottles for an account. They stay in the house.",
  release: "Return a hold to the floor so the bottles can be sold.",
  transfer: "Move free bottles from one house to another.",
  adjust: "Correct the book after a count or a breakage.",
}

export function MovementDialog({
  books,
  open,
  onOpenChange,
  preset,
}: {
  books: Books
  open: boolean
  onOpenChange: (open: boolean) => void
  preset: PostingPreset | null
}) {
  const router = useRouter()
  const accountListId = useId()
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState<MovementType>(preset?.type ?? "receive")
  const [wineId, setWineId] = useState<string | null>(preset?.wineId ?? null)
  const [locationId, setLocationId] = useState<string | null>(
    preset?.locationId ?? books.locations[0]?.id ?? null,
  )
  const [toLocationId, setToLocationId] = useState<string | null>(
    books.locations.find((location) => location.id !== (preset?.locationId ?? books.locations[0]?.id))?.id ??
      null,
  )
  const [cases, setCases] = useState("1")
  const [loose, setLoose] = useState("0")
  const [direction, setDirection] = useState<"up" | "down">("down")
  const [reference, setReference] = useState("")
  const [account, setAccount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  const wine = books.wines.find((item) => item.id === wineId) ?? null
  const needsAccount = type === "ship" || type === "allocate" || type === "release"
  const draft = draftInput({
    type,
    wineId,
    locationId,
    toLocationId,
    cases,
    loose,
    direction,
    reference,
    account,
    note,
  })
  const preview = draft ? applyPosting(books, draft, PREVIEW_AT, "preview") : null
  const liveError =
    preview && !preview.ok && !isWaitingOnTheForm(preview.error) ? preview.error : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft || !preview) {
      setError("Choose a wine and a house.")
      return
    }
    if (!preview.ok) {
      setError(preview.error)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await postMovement(draft)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(result.message)
      onOpenChange(false)
      router.refresh()
    })
  }

  const sourceLine = wine && locationId ? lineAt(books, wine.id, locationId) : undefined
  const freeNow = sourceLine ? sourceLine.onHandBottles - sourceLine.allocatedBottles : null
  const after = preview?.ok && wine && locationId
    ? preview.books.stock.find((line) => line.wineId === wine.id && line.locationId === locationId)
    : undefined
  const houseName = books.locations.find((location) => location.id === locationId)?.name

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post to the book</DialogTitle>
          <DialogDescription>{HINT[type]}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Posting">
            <Select
              value={type}
              onValueChange={(value) => {
                if (value) setType(value as MovementType)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {MOVEMENT_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Wine">
            <Select
              value={wineId}
              onValueChange={(value) => setWineId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a wine" />
              </SelectTrigger>
              <SelectContent>
                {[...books.wines]
                  .sort((a, b) => wineName(a).localeCompare(wineName(b)))
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {wineName(item)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={type === "transfer" ? "From" : "House"}>
              <Select value={locationId} onValueChange={(value) => setLocationId(value)}>
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
            {type === "transfer" ? (
              <Field label="To">
                <Select value={toLocationId} onValueChange={(value) => setToLocationId(value)}>
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
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cases">
                  <Input
                    inputMode="numeric"
                    value={cases}
                    onChange={(event) => setCases(event.target.value)}
                  />
                </Field>
                <Field label="Bottles">
                  <Input
                    inputMode="numeric"
                    value={loose}
                    onChange={(event) => setLoose(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
          {type === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cases">
                <Input inputMode="numeric" value={cases} onChange={(event) => setCases(event.target.value)} />
              </Field>
              <Field label="Bottles">
                <Input inputMode="numeric" value={loose} onChange={(event) => setLoose(event.target.value)} />
              </Field>
            </div>
          ) : null}
          {type === "adjust" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === "up" ? "default" : "outline"}
                onClick={() => setDirection("up")}
              >
                Add to the count
              </Button>
              <Button
                type="button"
                variant={direction === "down" ? "default" : "outline"}
                onClick={() => setDirection("down")}
              >
                Remove from the count
              </Button>
            </div>
          ) : null}
          <Field label="Reference">
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="PO-4482, INV-9130, or CNT-105"
              autoComplete="off"
            />
          </Field>
          {needsAccount ? (
            <Field label="Account">
              <Input
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="Restaurant or retailer"
                list={accountListId}
                autoComplete="off"
              />
              <datalist id={accountListId}>
                {knownAccounts(books).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
          ) : null}
          <Field label="Note">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          {wine && freeNow !== null ? (
            <p className="text-xs text-muted-foreground">
              {houseName} now has {formatBottles(sourceLine?.onHandBottles ?? 0, wine.bottlesPerCase)} on hand,{" "}
              {formatBottles(sourceLine?.allocatedBottles ?? 0, wine.bottlesPerCase)} held,{" "}
              {formatBottles(freeNow, wine.bottlesPerCase)} free.
              {preview?.ok && after
                ? ` After this posting, ${formatBottles(after.onHandBottles - after.allocatedBottles, wine.bottlesPerCase)} will be free.`
                : ""}
            </p>
          ) : null}
          {error || liveError ? (
            <p role="alert" className="text-sm text-destructive">
              {error ?? liveError}
            </p>
          ) : null}
          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function isWaitingOnTheForm(message: string) {
  return (
    message === "Enter a quantity." ||
    message.startsWith("Add a reference") ||
    message.startsWith("Name the account") ||
    message.startsWith("Choose")
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

function draftInput(state: {
  type: MovementType
  wineId: string | null
  locationId: string | null
  toLocationId: string | null
  cases: string
  loose: string
  direction: "up" | "down"
  reference: string
  account: string
  note: string
}): PostingInput | null {
  if (!state.wineId || !state.locationId) return null
  const cases = state.cases.trim() === "" ? 0 : Number(state.cases)
  const looseBottles = state.loose.trim() === "" ? 0 : Number(state.loose)
  return {
    type: state.type,
    wineId: state.wineId,
    locationId: state.locationId,
    toLocationId: state.toLocationId ?? undefined,
    cases,
    looseBottles,
    direction: state.direction,
    reference: state.reference,
    account: state.account,
    note: state.note,
  }
}
