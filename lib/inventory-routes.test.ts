import assert from "node:assert/strict"
import test from "node:test"
import { inventoryHref, inventoryProductHref, parseInventoryView } from "./inventory-routes"

test("parseInventoryView accepts legacy catalog and stock aliases", () => {
  assert.equal(parseInventoryView(undefined), "overview")
  assert.equal(parseInventoryView("products"), "products")
  assert.equal(parseInventoryView("catalog"), "products")
  assert.equal(parseInventoryView("floor"), "floor")
  assert.equal(parseInventoryView("stock"), "floor")
})

test("inventoryHref builds query strings for deep links", () => {
  assert.equal(inventoryHref("overview"), "/")
  assert.equal(inventoryProductHref("w-1"), "/?view=products&wine=w-1")
  assert.equal(inventoryHref("floor", { house: "main" }), "/?view=floor&house=main")
})
