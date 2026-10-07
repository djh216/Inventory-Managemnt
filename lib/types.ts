export const WINE_COLORS = ["red", "white", "rose", "sparkling", "fortified"] as const
export type WineColor = (typeof WINE_COLORS)[number]

export const MOVEMENT_TYPES = [
  "receive",
  "ship",
  "allocate",
  "release",
  "transfer",
  "adjust",
] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const LOCATION_KINDS = ["bonded", "cold", "will-call"] as const
export type LocationKind = (typeof LOCATION_KINDS)[number]

export type Wine = {
  id: string
  sku: string
  /** Full label from the inventory upload. */
  label: string
  producer: string
  cuvee: string
  vintage: number | null
  color: WineColor
  varietal: string
  country: string
  region: string
  appellation: string
  formatMl: number
  bottlesPerCase: number
  abv: number
  costPerCase: number
  pricePerCase: number
  reorderCases: number
  supplier: string
  active: boolean
  note: string
}

export type Location = {
  id: string
  name: string
  city: string
  kind: LocationKind
  capacityCases: number
}

export type StockLine = {
  wineId: string
  locationId: string
  onHandBottles: number
  allocatedBottles: number
  /** When set (CSV import), available quantity is tracked explicitly. */
  availableBottles?: number
}

export type Movement = {
  id: string
  at: string
  type: MovementType
  wineId: string
  locationId: string
  toLocationId?: string
  bottles: number
  reference: string
  account: string
  note: string
}

export type Books = {
  wines: Wine[]
  locations: Location[]
  stock: StockLine[]
  movements: Movement[]
}

export type StockStatus = "healthy" | "low" | "out" | "idle"

export type PostingInput = {
  type: MovementType
  wineId: string
  locationId: string
  toLocationId?: string
  cases: number
  looseBottles: number
  direction?: "up" | "down"
  reference: string
  account: string
  note: string
}

export type PostingPreset = {
  type?: MovementType
  wineId?: string
  locationId?: string
}

export type CreateWineInput = {
  producer: string
  cuvee: string
  vintage: number | null
  color: WineColor
  varietal: string
  country: string
  region: string
  appellation: string
  formatMl: number
  bottlesPerCase: number
  abv: number
  costPerCase: number
  pricePerCase: number
  reorderCases: number
  supplier: string
  locationId: string
  openingCases: number
}

export type ActionResult =
  | { ok: true; message: string; wineId?: string }
  | { ok: false; error: string }
