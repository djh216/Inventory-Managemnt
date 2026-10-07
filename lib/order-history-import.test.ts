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
    salesPaceWindowDays: 30,
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

test("an additional upload adds new orders and ignores repeats", () => {
  const first = `SKU,Order Date,Bottles,Account,Reference
100061550,2026-09-20,12,Luca,PO-1
100061550,2026-09-25,6,Luca,PO-2`
  const second = `SKU,Order Date,Bottles,Account,Reference
100061550,2026-09-20,12,Luca,PO-1
100061550,2026-09-25,6,Luca,PO-2
100061550,2026-10-01,18,Marco,PO-3
100061550,2026-10-01,18,Marco,PO-3`
  let n = 0
  const ids = () => `oh-${(n += 1)}`
  const parsedFirst = parseOrderHistoryCsv(first)
  const parsedSecond = parseOrderHistoryCsv(second)
  assert.ok(Array.isArray(parsedFirst))
  assert.ok(Array.isArray(parsedSecond))
  const loaded = applyOrderHistoryImport(books(), parsedFirst, "2026-10-01T00:00:00.000Z", ids)
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  const added = applyOrderHistoryImport(loaded.books, parsedSecond, "2026-10-07T00:00:00.000Z", ids)
  assert.equal(added.ok, true)
  if (!added.ok) return
  assert.equal(added.imported, 1)
  assert.equal(added.skipped, 3)
  assert.equal(added.books.orderHistory?.length, 3)
  assert.deepEqual(
    added.books.orderHistory?.map((line) => line.reference),
    ["PO-1", "PO-2", "PO-3"],
  )
  assert.equal(added.books.orderHistoryImportedAt, "2026-10-07T00:00:00.000Z")
  assert.equal(added.books.stock[0]?.availableBottles, 280)
})

test("uploading the same file again leaves the existing orders in place", () => {
  const csv = `SKU,Order Date,Bottles,Account
100061550,2026-09-20,12,Luca
100061550,2026-09-25,6,Marco`
  const parsed = parseOrderHistoryCsv(csv)
  assert.ok(Array.isArray(parsed))
  const loaded = applyOrderHistoryImport(books(), parsed, "2026-10-01T00:00:00.000Z", () => "oh-1")
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  const again = applyOrderHistoryImport(loaded.books, parsed, "2026-10-07T00:00:00.000Z", () => "oh-2")
  assert.equal(again.ok, true)
  if (!again.ok) return
  assert.equal(again.imported, 0)
  assert.equal(again.skipped, 2)
  assert.equal(again.books.orderHistory?.length, 2)
  assert.equal(again.books.orderHistory?.[0]?.id, "oh-1")
})

test("orders after the inventory date reduce on-hand and are not deducted twice", () => {
  const csv = `SKU,Order Date,Bottles,Account,Reference
100061550,2026-10-06,12,Luca,PO-SAME
100061550,2026-10-07,10,Luca,PO-AFTER
100061550,2026-10-08,4,Marco,PO-LATER`
  const parsed = parseOrderHistoryCsv(csv)
  assert.ok(Array.isArray(parsed))
  const loaded = applyOrderHistoryImport(books(), parsed, "2026-10-09T00:00:00.000Z", () => "oh-1")
  assert.equal(loaded.ok, true)
  if (!loaded.ok) return
  assert.equal(loaded.deductedBottles, 14)
  assert.equal(loaded.deductedLines, 2)
  assert.equal(loaded.books.stock[0]?.onHandBottles, 266)
  assert.equal(loaded.books.stock[0]?.availableBottles, 266)
  assert.equal(loaded.books.stock[0]?.allocatedBottles, 0)
  const again = applyOrderHistoryImport(loaded.books, parsed, "2026-10-10T00:00:00.000Z", () => "oh-2")
  assert.equal(again.ok, true)
  if (!again.ok) return
  assert.equal(again.imported, 0)
  assert.equal(again.skipped, 3)
  assert.equal(again.deductedBottles, 0)
  assert.equal(again.books.stock[0]?.onHandBottles, 266)
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
  assert.equal(bottlesShippedInWindow(imported.books, "w-1", 30, now), 280)
  const line = supplyLine(imported.books, imported.books.wines[0], now)
  assert.equal(line.dailyRate, 280 / 30)
  assert.ok(line.daysRemaining !== null && Math.abs(line.daysRemaining - 30) < 0.001)
})
