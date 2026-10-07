import assert from "node:assert/strict"
import test from "node:test"
import { applyCreateWine, applyPosting } from "./posting"
import { seedBooks } from "./seed"
import type { Books, PostingInput, Wine } from "./types"

function wine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: "w-1",
    sku: "TST-RED-22",
    producer: "Test House",
    cuvee: "Rouge",
    vintage: 2022,
    color: "red",
    varietal: "Pinot Noir",
    country: "France",
    region: "Burgundy",
    appellation: "Bourgogne",
    formatMl: 750,
    bottlesPerCase: 12,
    abv: 13,
    costPerCase: 100,
    pricePerCase: 160,
    reorderCases: 4,
    supplier: "Test House",
    active: true,
    note: "",
    ...overrides,
  }
}

function books(target = wine()): Books {
  return {
    wines: [target],
    locations: [
      { id: "oak", name: "Oakland Bonded", city: "Oakland", kind: "bonded", capacityCases: 100 },
      { id: "napa", name: "Napa Cold Room", city: "Napa", kind: "cold", capacityCases: 40 },
    ],
    stock: [
      {
        wineId: target.id,
        locationId: "oak",
        onHandBottles: 24,
        allocatedBottles: 12,
      },
    ],
    movements: [],
  }
}

function posting(overrides: Partial<PostingInput> = {}): PostingInput {
  return {
    type: "ship",
    wineId: "w-1",
    locationId: "oak",
    cases: 1,
    looseBottles: 0,
    reference: "INV-1",
    account: "Chez Lumen",
    note: "",
    ...overrides,
  }
}

test("the sample cellar keeps every hold inside the floor count", () => {
  const sample = seedBooks(new Date("2026-10-07T18:00:00.000Z"))
  assert.ok(sample.wines.length >= 20)
  for (const line of sample.stock) {
    assert.ok(line.onHandBottles >= 0)
    assert.ok(line.allocatedBottles >= 0)
    assert.ok(line.allocatedBottles <= line.onHandBottles)
    assert.ok(sample.wines.some((item) => item.id === line.wineId))
    assert.ok(sample.locations.some((item) => item.id === line.locationId))
  }
  const out = sample.wines.filter((item) => {
    const bottles = sample.stock
      .filter((line) => line.wineId === item.id)
      .reduce((sum, line) => sum + line.onHandBottles - line.allocatedBottles, 0)
    return item.active && bottles <= 0
  })
  assert.ok(out.some((item) => item.id === "w-tawny"))
})

test("ships free bottles and leaves the hold in place", () => {
  const start = books()
  const result = applyPosting(start, posting({ cases: 1 }), "2026-10-07T00:00:00.000Z", "m-1")
  assert.equal(result.ok, true)
  if (!result.ok) return
  const line = result.books.stock[0]
  assert.equal(line.onHandBottles, 12)
  assert.equal(line.allocatedBottles, 12)
  assert.equal(start.stock[0].onHandBottles, 24)
})

test("refuses to ship bottles that are on hold", () => {
  const result = applyPosting(books(), posting({ cases: 2 }), "2026-10-07T00:00:00.000Z", "m-1")
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /on hold/)
})

test("holds only what is free", () => {
  const result = applyPosting(
    books(),
    posting({ type: "allocate", cases: 2, reference: "HOLD-1" }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(result.ok, false)
})

test("releases a hold back to the floor", () => {
  const result = applyPosting(
    books(),
    posting({ type: "release", cases: 1, reference: "HOLD-1" }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.books.stock[0].onHandBottles, 24)
  assert.equal(result.books.stock[0].allocatedBottles, 0)
})

test("transfers only free bottles between houses", () => {
  const blocked = applyPosting(
    books(),
    posting({
      type: "transfer",
      cases: 2,
      toLocationId: "napa",
      reference: "TR-1",
      account: "",
    }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(blocked.ok, false)

  const moved = applyPosting(
    books(),
    posting({
      type: "transfer",
      cases: 1,
      toLocationId: "napa",
      reference: "TR-1",
      account: "",
    }),
    "2026-10-07T00:00:00.000Z",
    "m-2",
  )
  assert.equal(moved.ok, true)
  if (!moved.ok) return
  const oak = moved.books.stock.find((line) => line.locationId === "oak")
  const napa = moved.books.stock.find((line) => line.locationId === "napa")
  assert.equal(oak?.onHandBottles, 12)
  assert.equal(oak?.allocatedBottles, 12)
  assert.equal(napa?.onHandBottles, 12)
})

test("a count cannot fall through the hold", () => {
  const result = applyPosting(
    books(),
    posting({
      type: "adjust",
      direction: "down",
      cases: 2,
      reference: "CNT-1",
      account: "",
    }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /hold/)
})

test("a receipt increases the floor and stores a signed count correction", () => {
  const received = applyPosting(
    books(),
    posting({ type: "receive", cases: 2, reference: "PO-1", account: "" }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(received.ok, true)
  if (!received.ok) return
  assert.equal(received.books.stock[0].onHandBottles, 48)

  const counted = applyPosting(
    received.books,
    posting({
      type: "adjust",
      direction: "down",
      cases: 1,
      reference: "CNT-2",
      account: "",
    }),
    "2026-10-07T00:00:00.000Z",
    "m-2",
  )
  assert.equal(counted.ok, true)
  if (!counted.ok) return
  assert.equal(counted.books.movements.at(-1)?.bottles, -12)
})

test("sell-through wines can ship and cannot be received", () => {
  const closed = books(wine({ active: false }))
  const received = applyPosting(
    closed,
    posting({ type: "receive", reference: "PO-9", account: "" }),
    "2026-10-07T00:00:00.000Z",
    "m-1",
  )
  assert.equal(received.ok, false)

  const shipped = applyPosting(closed, posting({ cases: 1 }), "2026-10-07T00:00:00.000Z", "m-2")
  assert.equal(shipped.ok, true)
})

test("a new wine gets a unique sku and an opening receipt", () => {
  const start = books(wine({ sku: "TES-ROU-22", producer: "Test House", cuvee: "Rouge" }))
  const created = applyCreateWine(
    start,
    {
      producer: "Test House",
      cuvee: "Rouge",
      vintage: 2022,
      color: "red",
      varietal: "Pinot Noir",
      country: "France",
      region: "Burgundy",
      appellation: "Bourgogne",
      formatMl: 750,
      bottlesPerCase: 12,
      abv: 13,
      costPerCase: 80,
      pricePerCase: 120,
      reorderCases: 2,
      supplier: "Test House",
      locationId: "oak",
      openingCases: 3,
    },
    "2026-10-07T00:00:00.000Z",
    "w-2",
    "m-9",
  )
  assert.equal(created.ok, true)
  if (!created.ok) return
  const added = created.books.wines.find((item) => item.id === "w-2")
  assert.equal(added?.sku, "TES-ROU-22-2")
  assert.equal(created.books.stock.find((line) => line.wineId === "w-2")?.onHandBottles, 36)
  assert.equal(start.wines.length, 1)
})
