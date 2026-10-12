import assert from "node:assert/strict"
import test from "node:test"
import { booksFromUpload } from "./csv-import"
import { applyInventoryUpload, emptyInventoryBooks } from "./inventory-upload"
import type { Books } from "./types"

function sampleBooks(): Books {
  const base = booksFromUpload([
    { label: "House One Red 2020", sku: "SKU-1", onHand: 10, available: 8 },
    { label: "House Two White 2021", sku: "SKU-2", onHand: 5, available: 5 },
  ])
  const wine1 = base.wines.find((wine) => wine.sku === "SKU-1")!
  return {
    ...base,
    orderHistory: [
      {
        id: "oh-1",
        wineId: wine1.id,
        at: "2026-01-15T12:00:00.000Z",
        bottles: 3,
        account: "Buyer",
        reference: "ORD-1",
      },
    ],
    orderHistoryImportedAt: "2026-01-16T12:00:00.000Z",
    inventoryImportedAt: "2026-01-01T12:00:00.000Z",
  }
}

test("inventory re-upload remaps order history by SKU", () => {
  const previous = sampleBooks()
  const result = applyInventoryUpload(
    previous,
    [
      { label: "House One Red 2020", sku: "SKU-1", onHand: 20, available: 18 },
      { label: "House Three Rosé 2022", sku: "SKU-3", onHand: 1, available: 1 },
    ],
    "2026-02-01T12:00:00.000Z",
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.skuCount, 2)
  assert.equal(result.orderLinesKept, 1)
  assert.equal(result.orderLinesDropped, 0)
  assert.equal(result.books.movements.length, 0)
  const remapped = result.books.orderHistory?.[0]
  assert.ok(remapped)
  const wine = result.books.wines.find((row) => row.sku === "SKU-1")
  assert.equal(remapped?.wineId, wine?.id)
  assert.equal(result.books.inventoryImportedAt, "2026-02-01T12:00:00.000Z")
})

test("clear inventory yields an empty book", () => {
  const empty = emptyInventoryBooks()
  assert.equal(empty.wines.length, 0)
  assert.equal(empty.stock.length, 0)
  assert.equal(empty.orderHistory?.length, 0)
  assert.equal(empty.inventoryImportedAt, null)
})
