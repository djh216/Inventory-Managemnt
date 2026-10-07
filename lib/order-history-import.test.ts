import assert from "node:assert/strict"
import test from "node:test"
import { applyOrderHistoryImport, parseOrderHistoryCsv } from "./order-history-import"
import { bottlesShippedInWindow, supplyLine } from "./supply"
import type { Books, Wine } from "./types"

function wine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: "w-1",
    sku: "100061550",
    label: "Avignonesi Cantaloro Red Blend Toscana IGT 2024",
    producer: "Avignonesi",
    cuvee: "Cantaloro",
    vintage: 2024,
    color: "red",
    varietal: "Blend",
    country: "Italy",
    region: "Toscana",
    appellation: "IGT",
    formatMl: 750,
    bottlesPerCase: 12,
    abv: 13,
    costPerCase: 0,
    pricePerCase: 0,
    reorderCases: 0,
    partner: "Avignonesi",
    leadTimeDays: 21,
    targetDaysOfStock: 45,
    reorderAlertsMuted: false,
    supplier: "Avignonesi",
    active: true,
    note: "",
    ...overrides,
  }
}

function books(): Books {
  return {
    wines: [wine()],
    locations: [{ id: "main", name: "Main", city: "Warehouse", kind: "bonded", capacityCases: 1000 }],
    stock: [{ wineId: "w-1", locationId: "main", onHandBottles: 280, availableBottles: 280, allocatedBottles: 0 }],
    movements: [],
    orderHistory: [],
    orderHistoryImportedAt: null,
    salesPaceWindowDays: 28,
  }
}

test("parses order history CSV and matches by SKU", () => {
  const csv = `SKU,Order Date,Bottles
100061550,2026-09-20,140
100061550,2026-09-25,140`
  const parsed = parseOrderHistoryCsv(csv)
  assert.ok(Array.isArray(parsed))
  const result = applyOrderHistoryImport(books(), parsed as never, "2026-10-07T12:00:00.000Z", () => "oh-1")
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.imported, 2)
  assert.equal(result.books.orderHistory?.length, 2)
  assert.equal(result.books.stock[0].availableBottles, 280)
})

test("parses Outfield Deals export rows", () => {
  const csv = `Lead Team Member,Account Name,Order Date,Line Item Product Variation Name,Line Item Quantity
Angela Riccetti,Pizzeria Luca,"April 06, 2025","",""
Angela Riccetti,Luca on James,"April 07, 2025",Avignonesi Cantaloro Red Blend Toscana IGT 2024,24.0`
  const parsed = parseOrderHistoryCsv(csv)
  assert.ok(Array.isArray(parsed))
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].bottles, 24)
  assert.equal(parsed[0].account, "Luca on James")
})

test("uploaded orders drive days on hand without changing inventory", () => {
  const csv = `SKU,Order Date,Bottles
100061550,2026-09-25,280`
  const parsed = parseOrderHistoryCsv(csv)
  assert.ok(Array.isArray(parsed))
  const imported = applyOrderHistoryImport(
    books(),
    parsed as never,
    "2026-10-07T12:00:00.000Z",
    () => "oh-1",
  )
  assert.equal(imported.ok, true)
  if (!imported.ok) return
  const now = new Date("2026-10-07T12:00:00.000Z")
  assert.equal(bottlesShippedInWindow(imported.books, "w-1", 28, now), 280)
  const line = supplyLine(imported.books, imported.books.wines[0], now)
  assert.equal(line.dailyRate, 10)
  assert.equal(line.daysRemaining, 28)
})
