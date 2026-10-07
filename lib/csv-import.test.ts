import assert from "node:assert/strict"
import test from "node:test"
import { booksFromUpload, importBooksFromCsv, inventoryCsvPath, readInventoryCsv } from "./csv-import"
import { winePosition } from "./inventory"

test("loads the Oct 6 upload with 276 SKUs", () => {
  const rows = readInventoryCsv(inventoryCsvPath())
  assert.equal(rows.length, 276)
  const books = importBooksFromCsv()
  assert.equal(books.wines.length, 276)
  assert.equal(books.locations.length, 1)
  assert.equal(books.locations[0]?.name, "Main inventory")
})

test("maps on hand, available, and committed bottles from the CSV", () => {
  const rows = readInventoryCsv(inventoryCsvPath())
  const books = booksFromUpload(rows)
  let csvOnHand = 0
  let csvAvailable = 0
  for (const row of rows) {
    csvOnHand += row.onHand
    csvAvailable += row.available
  }
  let bookOnHand = 0
  let bookFree = 0
  for (const wine of books.wines) {
    const position = winePosition(books, wine.id)
    bookOnHand += position.onHand
    bookFree += position.free
  }
  assert.equal(bookOnHand, csvOnHand)
  assert.equal(bookFree, csvAvailable)
  for (const line of books.stock) {
    assert.ok(line.onHandBottles >= line.allocatedBottles)
  }
})

test("assigns labels and SKUs for rows missing a product code", () => {
  const books = importBooksFromCsv()
  const missing = books.wines.filter((wine) => wine.sku.startsWith("GEN-"))
  assert.ok(missing.length >= 10)
  for (const wine of missing) {
    assert.ok(wine.label.length > 3)
  }
})
