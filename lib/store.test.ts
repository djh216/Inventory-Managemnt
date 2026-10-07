import assert from "node:assert/strict"
import test from "node:test"
import { seedBooks } from "./seed"
import { booksWithInventoryReset, booksWithoutOrderHistory, migrateBooks } from "./store"
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

test("saved books take the producer from the product name", () => {
  const books = seedBooks()
  const pra = books.wines.find((wine) => wine.label.startsWith("Pra Amarone"))
  const spinola = books.wines.find((wine) => wine.label.startsWith("Tenuta Santa Maria"))
  assert.ok(pra)
  assert.ok(spinola)
  pra.producer = "Pra Amarone"
  pra.partner = "Pra Amarone"
  pra.supplier = "Pra Amarone"
  spinola.producer = "Tenuta Santa"
  spinola.partner = "House account"
  spinola.supplier = "Tenuta Santa"

  const next = migrateBooks(books)
  const updatedPra = next.wines.find((wine) => wine.id === pra.id)
  const updatedSpinola = next.wines.find((wine) => wine.id === spinola.id)

  assert.equal(updatedPra?.producer, "Pra")
  assert.equal(updatedPra?.partner, "Pra")
  assert.equal(updatedPra?.supplier, "Pra")
  assert.equal(updatedSpinola?.producer, "Tenuta Santa Maria")
  assert.equal(updatedSpinola?.partner, "House account")
  assert.equal(updatedSpinola?.supplier, "Tenuta Santa Maria")
  assert.equal(books.wines.find((wine) => wine.id === pra.id)?.producer, "Pra Amarone")
})

test("saved Coravin, Printer, and Champagne rows become Supplies", () => {
  const books = seedBooks()
  const targets = books.wines.filter((wine) => /^(Coravin|Printer|Champagne)\b/.test(wine.label))
  assert.equal(targets.length, 4)
  for (const wine of targets) {
    const oldName = wine.label.split(/\s+/)[0]
    wine.producer = oldName
    wine.partner = oldName
    wine.supplier = oldName
  }

  const next = migrateBooks(books)
  for (const wine of targets) {
    const updated = next.wines.find((item) => item.id === wine.id)
    assert.equal(updated?.producer, "Supplies")
    assert.equal(updated?.partner, "Supplies")
    assert.equal(updated?.supplier, "Supplies")
  }
})
