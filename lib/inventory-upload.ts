import type { Books, OrderHistoryLine } from "./types"
import { booksFromUpload, type InventoryCsvRow } from "./csv-import"

export type InventoryImportResult =
  | {
      ok: true
      books: Books
      skuCount: number
      orderLinesKept: number
      orderLinesDropped: number
    }
  | { ok: false; error: string }

function remapOrderHistory(previous: Books, next: Books) {
  const bySku = new Map(next.wines.map((wine) => [wine.sku.trim(), wine.id]))
  const kept: OrderHistoryLine[] = []
  let dropped = 0
  for (const line of previous.orderHistory ?? []) {
    const oldWine = previous.wines.find((wine) => wine.id === line.wineId)
    const sku = oldWine?.sku.trim()
    const wineId = sku ? bySku.get(sku) : undefined
    if (!wineId) {
      dropped += 1
      continue
    }
    kept.push({ ...line, wineId })
  }
  return { kept, dropped }
}

export function applyInventoryUpload(
  previous: Books,
  rows: InventoryCsvRow[],
  importedAt: string,
): InventoryImportResult {
  if (rows.length === 0) {
    return { ok: false, error: "The inventory file has no product rows." }
  }
  const base = booksFromUpload(rows)
  const { kept, dropped } = remapOrderHistory(previous, base)
  const books: Books = {
    ...base,
    orderHistory: kept,
    orderHistoryImportedAt: kept.length > 0 ? (previous.orderHistoryImportedAt ?? importedAt) : null,
    salesPaceWindowDays: previous.salesPaceWindowDays ?? 30,
    inventoryImportedAt: importedAt,
  }
  return {
    ok: true,
    books,
    skuCount: books.wines.length,
    orderLinesKept: kept.length,
    orderLinesDropped: dropped,
  }
}

export function emptyInventoryBooks(): Books {
  return {
    ...booksFromUpload([]),
    orderHistory: [],
    orderHistoryImportedAt: null,
    inventoryImportedAt: null,
    salesPaceWindowDays: 30,
  }
}
