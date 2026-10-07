import assert from "node:assert/strict"
import test from "node:test"
import {
  bottlesShippedInWindow,
  formatDaysOnHandTable,
  paceAtWindow,
  reorderAlerts,
  supplyLine,
} from "./supply"
import type { Books, Wine } from "./types"

function wine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: "w-1",
    sku: "SKU-1",
    label: "Test Winery Cuvée 2022",
    producer: "Test Winery",
    cuvee: "Cuvée",
    vintage: 2022,
    color: "red",
    varietal: "Nebbiolo",
    country: "Italy",
    region: "Piedmont",
    appellation: "Barolo",
    formatMl: 750,
    bottlesPerCase: 12,
    abv: 13.5,
    costPerCase: 0,
    pricePerCase: 0,
    reorderCases: 0,
    partner: "Test Winery",
    leadTimeDays: 21,
    targetDaysOfStock: 45,
    reorderAlertsMuted: false,
    supplier: "Test Winery",
    active: true,
    note: "",
    ...overrides,
  }
}

function books(target = wine()): Books {
  return {
    wines: [target],
    locations: [{ id: "main", name: "Main", city: "Warehouse", kind: "bonded", capacityCases: 1000 }],
    stock: [{ wineId: target.id, locationId: "main", onHandBottles: 280, availableBottles: 280, allocatedBottles: 0 }],
    movements: [
      {
        id: "m-1",
        at: "2026-10-06T12:00:00.000Z",
        type: "ship",
        wineId: target.id,
        locationId: "main",
        bottles: 140,
        reference: "INV-1",
        account: "Account A",
        note: "",
      },
    ],
  }
}

test("derives daily rate from shipments in the velocity window", () => {
  const now = new Date("2026-10-07T12:00:00.000Z")
  const shipped = bottlesShippedInWindow(books(), "w-1", 30, now)
  assert.equal(shipped, 140)
  const line = supplyLine(books(), wine(), now)
  assert.equal(line.dailyRate, 140 / 30)
  assert.equal(line.daysRemaining, 280 / (140 / 30))
})

test("flags reorder when days remaining are inside partner lead time", () => {
  const now = new Date("2026-10-07T12:00:00.000Z")
  const start = books(
    wine({
      leadTimeDays: 30,
      targetDaysOfStock: 60,
    }),
  )
  start.stock[0].availableBottles = 100
  start.movements[0].bottles = 280
  const line = supplyLine(start, start.wines[0], now)
  assert.equal(line.urgency, "critical")
  assert.ok(line.suggestedReorderBottles > 0)
})

test("formats table days on hand as floored whole days", () => {
  assert.equal(formatDaysOnHandTable(28.9), "28 days")
  assert.equal(formatDaysOnHandTable(0.75), "0 days")
})

test("computes days on hand per pace window", () => {
  const now = new Date("2026-10-07T12:00:00.000Z")
  const start = books()
  start.stock[0].availableBottles = 900
  start.movements[0].bottles = 280
  const pace30 = paceAtWindow(start, start.wines[0], 30, now)
  const pace90 = paceAtWindow(start, start.wines[0], 90, now)
  assert.equal(pace30.daysRemaining, 900 / (280 / 30))
  assert.equal(pace90.daysRemaining, 900 / (280 / 90))
})

test("days-on-hand dashboard uses on-hand bottles, not available", () => {
  const now = new Date("2026-10-07T12:00:00.000Z")
  const start = books()
  start.stock[0].onHandBottles = 400
  start.stock[0].availableBottles = 120
  start.movements[0].bottles = 140
  const availablePace = paceAtWindow(start, start.wines[0], 30, now, "available")
  const onHandPace = paceAtWindow(start, start.wines[0], 30, now, "onHand")
  assert.equal(availablePace.daysRemaining, 120 / (140 / 30))
  assert.equal(onHandPace.daysRemaining, 400 / (140 / 30))
})

test("muted wines are omitted from reorder alerts", () => {
  const now = new Date("2026-10-07T12:00:00.000Z")
  const start = books(
    wine({
      reorderAlertsMuted: true,
      leadTimeDays: 30,
    }),
  )
  start.stock[0].availableBottles = 100
  start.movements[0].bottles = 280
  assert.equal(supplyLine(start, start.wines[0], now).urgency, "ok")
  assert.equal(reorderAlerts(start, now).length, 0)
})
