import assert from "node:assert/strict"
import test from "node:test"
import { seedBooks } from "./seed"
import { booksWithInventoryReset, booksWithoutOrderHistory } from "./store"
import type { Books } from "./types"

test("clearing inventory keeps the order history upload", () => {
  const uploaded = seedBooks()
  const current: Books = structuredClone(uploaded)
  const line = current.stock[0]
  assert.ok(line)
  line.onHandBottles += 12
  const wine = current.wines.find((item) => item.id === line.wineId)
  assert.ok(wine)
  const uploadedLeadTime = wine.leadTimeDays
  wine.leadTimeDays = 99
  current.movements.push({
    id: "m-1",
    at: "2026-04-08T00:00:00.000Z",
    type: "receive",
    wineId: line.wineId,
    locationId: line.locationId,
    bottles: 12,
    reference: "PO-1",
    account: "",
    note: "",
  })
  current.orderHistory = [
    {
      id: "h-1",
      at: "2026-04-06T00:00:00.000Z",
      wineId: line.wineId,
      bottles: 6,
      account: "Pizzeria Luca",
      reference: "upload",
    },
  ]
  current.orderHistoryImportedAt = "2026-04-07T00:00:00.000Z"
  current.salesPaceWindowDays = 90

  const next = booksWithInventoryReset(current, seedBooks())
  const restored = next.stock.find((item) => item.wineId === line.wineId)

  assert.equal(restored?.onHandBottles, uploaded.stock.find((item) => item.wineId === line.wineId)?.onHandBottles)
  assert.equal(next.wines.find((item) => item.id === line.wineId)?.leadTimeDays, uploadedLeadTime)
  assert.notEqual(uploadedLeadTime, 99)
  assert.equal(next.movements.length, 0)
  assert.equal(next.orderHistory?.length, 1)
  assert.equal(next.orderHistory?.[0]?.account, "Pizzeria Luca")
  assert.equal(next.orderHistoryImportedAt, "2026-04-07T00:00:00.000Z")
  assert.equal(next.salesPaceWindowDays, 90)
})

test("clearing order history keeps inventory", () => {
  const current = seedBooks()
  const line = current.stock[0]
  assert.ok(line)
  current.orderHistory = [
    {
      id: "h-1",
      at: "2026-04-06T00:00:00.000Z",
      wineId: line.wineId,
      bottles: 6,
      account: "Bar Marco",
      reference: "upload",
    },
  ]
  current.orderHistoryImportedAt = "2026-04-07T00:00:00.000Z"
  current.salesPaceWindowDays = 60
  current.movements.push({
    id: "m-1",
    at: "2026-04-08T00:00:00.000Z",
    type: "ship",
    wineId: line.wineId,
    locationId: line.locationId,
    bottles: 3,
    reference: "INV-1",
    account: "Bar Marco",
    note: "",
  })

  const next = booksWithoutOrderHistory(current)

  assert.deepEqual(next.stock, current.stock)
  assert.deepEqual(next.movements, current.movements)
  assert.equal(next.salesPaceWindowDays, 60)
  assert.deepEqual(next.orderHistory, [])
  assert.equal(next.orderHistoryImportedAt, null)
  assert.equal(current.orderHistory?.length, 1)
})
