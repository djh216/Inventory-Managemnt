import type { Books, Location, StockLine, StockStatus, Wine } from "./types"

export function lineAt(
  books: Books,
  wineId: string,
  locationId: string,
): StockLine | undefined {
  return books.stock.find(
    (line) => line.wineId === wineId && line.locationId === locationId,
  )
}

export function lineFree(line: StockLine) {
  if (line.availableBottles !== undefined) return line.availableBottles
  return line.onHandBottles - line.allocatedBottles
}

export function winePosition(books: Books, wineId: string) {
  let onHand = 0
  let allocated = 0
  let free = 0
  for (const line of books.stock) {
    if (line.wineId !== wineId) continue
    onHand += line.onHandBottles
    allocated += line.allocatedBottles
    free += lineFree(line)
  }
  return { onHand, allocated, free }
}

export function statusFor(wine: Wine, freeBottles: number): StockStatus {
  if (!wine.active) return "idle"
  if (freeBottles <= 0) return "out"
  if (freeBottles < wine.reorderCases * wine.bottlesPerCase) return "low"
  return "healthy"
}

export function casesOf(bottles: number, perCase: number) {
  return bottles / perCase
}

export function shortBottles(wine: Wine, freeBottles: number) {
  return Math.max(0, wine.reorderCases * wine.bottlesPerCase - freeBottles)
}

export function costOf(wine: Wine, bottles: number) {
  return casesOf(bottles, wine.bottlesPerCase) * wine.costPerCase
}

export function priceOf(wine: Wine, bottles: number) {
  return casesOf(bottles, wine.bottlesPerCase) * wine.pricePerCase
}

export function fullestFreeLocation(books: Books, wineId: string) {
  let best = books.locations[0]?.id ?? ""
  let bestFree = -1
  for (const location of books.locations) {
    const line = lineAt(books, wineId, location.id)
    const free = line ? lineFree(line) : 0
    if (free > bestFree) {
      bestFree = free
      best = location.id
    }
  }
  return best
}

export function knownAccounts(books: Books) {
  const names = new Set<string>()
  for (const movement of books.movements) {
    if (movement.account.trim()) names.add(movement.account.trim())
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export type HouseSnapshot = {
  location: Location
  cases: number
  costValue: number
  fill: number
}

export type ReorderLine = {
  wine: Wine
  onHand: number
  allocated: number
  free: number
  status: StockStatus
  short: number
}

export type HeldLine = {
  wine: Wine
  onHand: number
  allocated: number
  free: number
}

export function snapshot(books: Books) {
  let onHandCases = 0
  let freeCases = 0
  let allocatedCases = 0
  let costValue = 0
  let priceValue = 0
  let onHandBottles = 0
  let freeBottles = 0
  let allocatedBottles = 0
  const colorCases = new Map<Wine["color"], number>()
  const houseCases = new Map<string, { cases: number; costValue: number }>()
  const reorderLines: ReorderLine[] = []
  const heldLines: HeldLine[] = []

  for (const location of books.locations) {
    houseCases.set(location.id, { cases: 0, costValue: 0 })
  }

  for (const wine of books.wines) {
    const position = winePosition(books, wine.id)
    const onHand = casesOf(position.onHand, wine.bottlesPerCase)
    const free = casesOf(position.free, wine.bottlesPerCase)
    const allocated = casesOf(position.allocated, wine.bottlesPerCase)
    onHandCases += onHand
    freeCases += free
    allocatedCases += allocated
    onHandBottles += position.onHand
    freeBottles += position.free
    allocatedBottles += position.allocated
    if (position.allocated > 0) {
      heldLines.push({ wine, ...position })
    }
    costValue += costOf(wine, position.onHand)
    priceValue += priceOf(wine, position.onHand)
    colorCases.set(wine.color, (colorCases.get(wine.color) ?? 0) + onHand)

    const status = statusFor(wine, position.free)
    if (status === "low" || status === "out") {
      reorderLines.push({
        wine,
        ...position,
        status,
        short: shortBottles(wine, position.free),
      })
    }
  }

  for (const line of books.stock) {
    const wine = books.wines.find((item) => item.id === line.wineId)
    const house = houseCases.get(line.locationId)
    if (!wine || !house) continue
    house.cases += casesOf(line.onHandBottles, wine.bottlesPerCase)
    house.costValue += costOf(wine, line.onHandBottles)
  }

  reorderLines.sort((a, b) => b.short - a.short || a.wine.producer.localeCompare(b.wine.producer))
  heldLines.sort((a, b) => b.allocated - a.allocated || wineNameSort(a.wine, b.wine))

  const houses: HouseSnapshot[] = books.locations.map((location) => {
    const house = houseCases.get(location.id) ?? { cases: 0, costValue: 0 }
    return {
      location,
      cases: house.cases,
      costValue: house.costValue,
      fill: location.capacityCases === 0 ? 0 : house.cases / location.capacityCases,
    }
  })

  return {
    skuCount: books.wines.length,
    activeCount: books.wines.filter((wine) => wine.active).length,
    onHandCases,
    freeCases,
    allocatedCases,
    costValue,
    priceValue,
    reorderCount: reorderLines.length,
    onHandBottles,
    freeBottles,
    allocatedBottles,
    byColor: [...colorCases.entries()].map(([color, cases]) => ({ color, cases })),
    houses,
    reorderLines,
    heldLines: heldLines.slice(0, 12),
  }
}

function wineNameSort(a: Wine, b: Wine) {
  return (a.label || a.producer).localeCompare(b.label || b.producer)
}
