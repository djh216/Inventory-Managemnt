import { wineName, formatBottles } from "./format"
import { lineFree } from "./inventory"
import type {
  Books,
  CreateWineInput,
  Movement,
  MovementType,
  PostingInput,
  StockLine,
  Wine,
  WineColor,
} from "./types"
import { MOVEMENT_TYPES, WINE_COLORS } from "./types"

export type MutationResult =
  | { ok: true; books: Books; message: string; wineId?: string }
  | { ok: false; error: string }

const MAX_CASES = 500
const FORMATS = [375, 750, 1500]
const PACKS = [6, 12]

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function upsert(
  stock: StockLine[],
  wineId: string,
  locationId: string,
): StockLine {
  const existing = stock.find(
    (line) => line.wineId === wineId && line.locationId === locationId,
  )
  if (existing) return existing
  const created: StockLine = {
    wineId,
    locationId,
    onHandBottles: 0,
    allocatedBottles: 0,
  }
  stock.push(created)
  return created
}

function resolveQuantity(wine: Wine, input: PostingInput) {
  if (
    !Number.isInteger(input.cases) ||
    input.cases < 0 ||
    !Number.isInteger(input.looseBottles) ||
    input.looseBottles < 0
  ) {
    return fail("Cases and loose bottles need whole numbers.")
  }
  if (input.cases > MAX_CASES) {
    return fail("Five hundred cases is the largest single posting.")
  }
  if (input.looseBottles >= wine.bottlesPerCase) {
    return fail(
      `Loose bottles stay under the case pack of ${wine.bottlesPerCase}. Put full cases in the case field.`,
    )
  }
  const bottles = input.cases * wine.bottlesPerCase + input.looseBottles
  if (bottles <= 0) return fail("Enter a quantity.")
  return { bottles }
}

export function applyPosting(
  books: Books,
  input: PostingInput,
  at: string,
  movementId: string,
): MutationResult {
  if (!MOVEMENT_TYPES.includes(input.type)) {
    return fail("Choose a posting type.")
  }
  const wine = books.wines.find((item) => item.id === input.wineId)
  if (!wine) return fail("Choose a wine.")
  const from = books.locations.find((item) => item.id === input.locationId)
  if (!from) return fail("Choose a house.")

  const reference = clean(input.reference ?? "")
  const account = clean(input.account ?? "")
  const note = clean(input.note ?? "")
  if (reference.length < 2 || reference.length > 40) {
    return fail("Add a reference — a PO, an invoice, or a count sheet.")
  }
  if (note.length > 240) return fail("Keep the note under 240 characters.")

  const needsAccount =
    input.type === "ship" || input.type === "allocate" || input.type === "release"
  if (needsAccount && (account.length < 2 || account.length > 80)) {
    return fail("Name the account this posting is for.")
  }

  if (!wine.active && (input.type === "receive" || input.type === "allocate")) {
    return fail(
      `${wine.producer} ${wine.cuvee} is in sell-through. Ship what is left, or correct the count.`,
    )
  }

  const quantity = resolveQuantity(wine, input)
  if ("error" in quantity) return quantity
  const bottles = quantity.bottles

  const next = structuredClone(books)
  const nextWine = next.wines.find((item) => item.id === wine.id)!
  const source = upsert(next.stock, wine.id, from.id)
  const free = lineFree(source)
  const name = wineName(nextWine)
  const qtyLabel = formatBottles(bottles, wine.bottlesPerCase)

  const movement: Movement = {
    id: movementId,
    at,
    type: input.type,
    wineId: wine.id,
    locationId: from.id,
    bottles,
    reference,
    account,
    note,
  }

  if (input.type === "receive") {
    source.onHandBottles += bottles
    if (source.availableBottles !== undefined) source.availableBottles += bottles
    next.movements.push(movement)
    return {
      ok: true,
      books: next,
      message: `Received ${qtyLabel} of ${name} into ${from.name}.`,
    }
  }

  if (input.type === "ship") {
    if (bottles > source.onHandBottles) {
      return fail(
        `${from.name} has ${formatBottles(source.onHandBottles, wine.bottlesPerCase)} on the floor.`,
      )
    }
    if (bottles > free) {
      return fail(shipBlock(from.name, free, source.allocatedBottles, wine.bottlesPerCase))
    }
    source.onHandBottles -= bottles
    if (source.availableBottles !== undefined) source.availableBottles -= bottles
    next.movements.push(movement)
    return {
      ok: true,
      books: next,
      message: `Shipped ${qtyLabel} of ${name} from ${from.name} to ${account}.`,
    }
  }

  if (input.type === "allocate") {
    if (bottles > free) {
      return fail(
        `${from.name} has ${formatBottles(free, wine.bottlesPerCase)} free. The hold has to fit inside that.`,
      )
    }
    source.allocatedBottles += bottles
    if (source.availableBottles !== undefined) source.availableBottles -= bottles
    next.movements.push(movement)
    return {
      ok: true,
      books: next,
      message: `Held ${qtyLabel} of ${name} at ${from.name} for ${account}.`,
    }
  }

  if (input.type === "release") {
    if (bottles > source.allocatedBottles) {
      return fail(
        `${from.name} has ${formatBottles(source.allocatedBottles, wine.bottlesPerCase)} on hold.`,
      )
    }
    source.allocatedBottles -= bottles
    if (source.availableBottles !== undefined) source.availableBottles += bottles
    next.movements.push(movement)
    return {
      ok: true,
      books: next,
      message: `Released ${qtyLabel} of ${name} at ${from.name} back to the floor.`,
    }
  }

  if (input.type === "transfer") {
    const destination = next.locations.find((item) => item.id === input.toLocationId)
    if (!destination) return fail("Choose the house that will receive the wine.")
    if (destination.id === from.id) {
      return fail("Pick a different house to transfer into.")
    }
    if (bottles > source.onHandBottles) {
      return fail(
        `${from.name} has ${formatBottles(source.onHandBottles, wine.bottlesPerCase)} on the floor.`,
      )
    }
    if (bottles > free) {
      return fail(
        `Only free bottles can move. ${from.name} has ${formatBottles(free, wine.bottlesPerCase)} free.`,
      )
    }
    source.onHandBottles -= bottles
    if (source.availableBottles !== undefined) source.availableBottles -= bottles
    const target = upsert(next.stock, wine.id, destination.id)
    target.onHandBottles += bottles
    if (target.availableBottles !== undefined) target.availableBottles += bottles
    else if (source.availableBottles !== undefined) target.availableBottles = bottles
    movement.toLocationId = destination.id
    next.movements.push(movement)
    return {
      ok: true,
      books: next,
      message: `Moved ${qtyLabel} of ${name} from ${from.name} to ${destination.name}.`,
    }
  }

  const direction = input.direction === "up" ? "up" : "down"
  const delta = direction === "up" ? bottles : -bottles
  if (source.onHandBottles + delta < 0) {
    return fail(
      `${from.name} has ${formatBottles(source.onHandBottles, wine.bottlesPerCase)} on the floor.`,
    )
  }
  if (source.onHandBottles + delta < source.allocatedBottles) {
    return fail(
      `The count has to stay above the hold at ${from.name} (${formatBottles(source.allocatedBottles, wine.bottlesPerCase)} held). Release the hold first.`,
    )
  }
  source.onHandBottles += delta
  if (source.availableBottles !== undefined) source.availableBottles += delta
  movement.bottles = delta
  next.movements.push(movement)
  const verb = direction === "up" ? "Added" : "Removed"
  return {
    ok: true,
    books: next,
    message: `${verb} ${qtyLabel} ${direction === "up" ? "to" : "from"} the count of ${name} at ${from.name}.`,
  }
}

function shipBlock(
  house: string,
  free: number,
  allocated: number,
  perCase: number,
) {
  if (allocated > 0) {
    return `${house} has ${formatBottles(free, perCase)} free to ship. ${formatBottles(allocated, perCase)} are on hold — release that hold before those bottles can leave.`
  }
  return `${house} has ${formatBottles(free, perCase)} free to ship.`
}

function letters(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
}

function skuFor(books: Books, producer: string, cuvee: string, vintage: number | null) {
  const producerCode = (letters(producer).slice(0, 3) || "WIN").toUpperCase()
  const cuveeCode = (letters(cuvee).slice(0, 3) || "CUV").toUpperCase()
  const year = vintage ? String(vintage).slice(-2) : "NV"
  const base = `${producerCode}-${cuveeCode}-${year}`
  let sku = base
  let suffix = 2
  while (books.wines.some((wine) => wine.sku === sku)) {
    sku = `${base}-${suffix}`
    suffix += 1
  }
  return sku
}

export function applyCreateWine(
  books: Books,
  input: CreateWineInput,
  at: string,
  wineId: string,
  movementId: string,
): MutationResult {
  const producer = clean(input.producer ?? "")
  const cuvee = clean(input.cuvee ?? "")
  const varietal = clean(input.varietal ?? "")
  const country = clean(input.country ?? "")
  const region = clean(input.region ?? "")
  const appellation = clean(input.appellation ?? "")
  const supplier = clean(input.supplier ?? "")

  if (producer.length < 2 || producer.length > 80) return fail("Enter the producer.")
  if (cuvee.length < 2 || cuvee.length > 80) return fail("Enter the cuvée.")
  if (varietal.length < 2 || varietal.length > 80) return fail("Enter the varietal or blend.")
  if (country.length < 2 || country.length > 40) return fail("Enter the country.")
  if (region.length < 2 || region.length > 40) return fail("Enter the region.")
  if (appellation.length < 2 || appellation.length > 60) return fail("Enter the appellation.")
  if (supplier.length < 2 || supplier.length > 80) return fail("Enter the supplier.")

  if (!WINE_COLORS.includes(input.color as WineColor)) return fail("Choose a color.")
  if (!FORMATS.includes(input.formatMl)) return fail("Choose a bottle size.")
  if (!PACKS.includes(input.bottlesPerCase)) return fail("Choose a case pack of 6 or 12.")

  const year = new Date(at).getUTCFullYear()
  if (input.vintage !== null) {
    if (!Number.isInteger(input.vintage) || input.vintage < 1950 || input.vintage > year + 1) {
      return fail("Use a vintage year, or mark the wine non-vintage.")
    }
  }

  if (!Number.isFinite(input.abv) || input.abv < 0 || input.abv > 22) {
    return fail("ABV needs to sit between 0 and 22.")
  }
  if (!Number.isInteger(input.costPerCase) || input.costPerCase < 0 || input.costPerCase > 20000) {
    return fail("Cost per case needs to be a whole dollar amount.")
  }
  if (!Number.isInteger(input.pricePerCase) || input.pricePerCase <= 0 || input.pricePerCase > 20000) {
    return fail("Wholesale price needs to be a whole dollar amount.")
  }
  if (!Number.isInteger(input.reorderCases) || input.reorderCases < 0 || input.reorderCases > 999) {
    return fail("Reorder point needs to be a whole number of cases.")
  }
  if (!Number.isInteger(input.openingCases) || input.openingCases < 0 || input.openingCases > MAX_CASES) {
    return fail("Opening count needs to be a whole number of cases.")
  }

  const location = books.locations.find((item) => item.id === input.locationId)
  if (input.openingCases > 0 && !location) return fail("Choose the house that received the opening count.")

  const next = structuredClone(books)
  const sku = skuFor(next, producer, cuvee, input.vintage)
  const wine: Wine = {
    id: wineId,
    sku,
    label: input.vintage ? `${producer} ${cuvee} ${input.vintage}` : `${producer} ${cuvee} NV`,
    producer,
    cuvee,
    vintage: input.vintage,
    color: input.color,
    varietal,
    country,
    region,
    appellation,
    formatMl: input.formatMl,
    bottlesPerCase: input.bottlesPerCase,
    abv: Math.round(input.abv * 10) / 10,
    costPerCase: input.costPerCase,
    pricePerCase: input.pricePerCase,
    reorderCases: input.reorderCases,
    partner: supplier || producer,
    leadTimeDays: 21,
    targetDaysOfStock: 45,
    reorderAlertsMuted: false,
    supplier,
    active: true,
    note: "",
  }
  next.wines.push(wine)

  if (input.openingCases > 0 && location) {
    next.stock.push({
      wineId,
      locationId: location.id,
      onHandBottles: input.openingCases * wine.bottlesPerCase,
      allocatedBottles: 0,
    })
    next.movements.push({
      id: movementId,
      at,
      type: "receive" satisfies MovementType,
      wineId,
      locationId: location.id,
      bottles: input.openingCases * wine.bottlesPerCase,
      reference: "OPEN",
      account: "",
      note: "Opening count",
    })
  }

  const landed =
    input.openingCases > 0 && location
      ? ` ${formatBottles(input.openingCases * wine.bottlesPerCase, wine.bottlesPerCase)} landed at ${location.name}.`
      : ""

  return {
    ok: true,
    books: next,
    wineId,
    message: `Added ${wineName(wine)} as ${sku}.${landed}`,
  }
}

export function applyReorder(
  books: Books,
  wineId: string,
  reorderCases: number,
): MutationResult {
  if (!Number.isInteger(reorderCases) || reorderCases < 0 || reorderCases > 999) {
    return fail("Reorder point needs to be a whole number of cases.")
  }
  const next = structuredClone(books)
  const wine = next.wines.find((item) => item.id === wineId)
  if (!wine) return fail("That wine is not on the book.")
  wine.reorderCases = reorderCases
  return {
    ok: true,
    books: next,
    wineId,
    message: `${wine.producer} ${wine.cuvee} now reorders at ${reorderCases} cases.`,
  }
}
