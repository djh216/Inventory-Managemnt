import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { booksFromUpload, importBooksFromCsv, inventoryCsvPath, parseInventoryCsv, readInventoryCsv } from "./csv-import"
import { winePosition } from "./inventory"
import { booksWithInventoryReset } from "./store"

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

test("parses an inventory upload and rejects a different CSV shape", () => {
  const parsed = parseInventoryCsv(
    'Label,SKU,Quantity On Hand,Quantity Available\n"Wine, Special",SKU-1,"1,200",10\n',
  )
  assert.ok(!("error" in parsed))
  if ("error" in parsed) return
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0]?.label, "Wine, Special")
  assert.equal(parsed.rows[0]?.onHand, 1200)
  assert.equal(parsed.rows[0]?.available, 10)

  const rejected = parseInventoryCsv("Lead Team Member,Account Name\nA,B\n")
  assert.ok("error" in rejected)

  const fromFile = parseInventoryCsv(fs.readFileSync(inventoryCsvPath(), "utf8"))
  assert.ok(!("error" in fromFile))
  if ("error" in fromFile) return
  assert.equal(fromFile.rows.length, 276)
})

test("an inventory upload replaces stock and keeps order history", () => {
  const current = importBooksFromCsv()
  current.orderHistory = [
    {
      id: "h-1",
      at: "2026-04-06T00:00:00.000Z",
      wineId: current.wines[0]?.id ?? "w-1",
      bottles: 6,
      account: "Pizzeria Luca",
      reference: "upload",
    },
  ]
  current.orderHistoryImportedAt = "2026-04-07T00:00:00.000Z"
  current.salesPaceWindowDays = 90
  const parsed = parseInventoryCsv(
    "Label,SKU,Quantity On Hand,Quantity Available\nExample Wine,SKU-9,24,24\n",
  )
  assert.ok(!("error" in parsed))
  if ("error" in parsed) return
  const uploaded = booksFromUpload(parsed.rows)
  uploaded.inventoryImportedAt = "2026-10-07T00:00:00.000Z"
  const next = booksWithInventoryReset(current, uploaded)
  assert.equal(next.wines.length, 1)
  assert.equal(next.wines[0]?.sku, "SKU-9")
  assert.equal(next.stock[0]?.onHandBottles, 24)
  assert.equal(next.movements.length, 0)
  assert.equal(next.orderHistory?.length, 1)
  assert.equal(next.orderHistoryImportedAt, "2026-04-07T00:00:00.000Z")
  assert.equal(next.salesPaceWindowDays, 90)
  assert.equal(next.inventoryImportedAt, "2026-10-07T00:00:00.000Z")
})

test("reads the producer from the product name column", () => {
  const parsed = parseInventoryCsv(
    [
      "Product Name,SKU,Quantity On Hand,Quantity Available",
      "Gulfi Pino' 2017,1,1,1",
      "Gulfi Reseca 2021,2,1,1",
      "Pra Amarone della Valpolicella 2018,3,1,1",
      "Terrabianca Alta Langa DOCG 2021,4,1,1",
      "Tenuta Santa Maria Amarone Classico 2019,5,1,1",
      "Sasso di Sole Brunello di Montalcino DOCG 2020,6,1,1",
      "Cantine Leuci Fiano Salento 2024,7,1,1",
      "Castell’In Villa Chianti Classico DOCG 2020,8,1,1",
      "La Spinetta Barolo Campe 2021,9,1,1",
    ].join("\n"),
  )
  assert.ok(!("error" in parsed))
  if ("error" in parsed) return
  const books = booksFromUpload(parsed.rows)
  const producerBySku = new Map(books.wines.map((wine) => [wine.sku, wine.producer]))
  assert.equal(producerBySku.get("1"), "Gulfi")
  assert.equal(producerBySku.get("2"), "Gulfi")
  assert.equal(producerBySku.get("3"), "Pra")
  assert.equal(producerBySku.get("4"), "Terrabianca")
  assert.equal(producerBySku.get("5"), "Tenuta Santa Maria")
  assert.equal(producerBySku.get("6"), "Sasso di Sole")
  assert.equal(producerBySku.get("7"), "Cantine Leuci")
  assert.equal(producerBySku.get("8"), "Castell'In Villa")
  assert.equal(producerBySku.get("9"), "La Spinetta")
  assert.equal(books.wines.find((wine) => wine.sku === "9")?.cuvee.startsWith("Barolo"), true)
})

test("assigns labels and SKUs for rows missing a product code", () => {
  const books = importBooksFromCsv()
  const missing = books.wines.filter((wine) => wine.sku.startsWith("GEN-"))
  assert.ok(missing.length >= 10)
  for (const wine of missing) {
    assert.ok(wine.label.length > 3)
  }
})
