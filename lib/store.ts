import fs from "fs"
import path from "path"
import { connection } from "next/server"
import { producerFromProductName } from "@/lib/csv-import"
import { applyInventoryOrderDeductions, restoreDeductedOrderInventory } from "@/lib/order-history-import"
import { seedBooks } from "@/lib/seed"
import type { Books, Wine } from "@/lib/types"

const dataDir = path.join(process.cwd(), "data")
const booksPath = path.join(dataDir, "books.json")
const tempPath = `${booksPath}.tmp`

export function migrateBooks(books: Books): Books {
  let changed = false
  const wines = books.wines.map((wine) => {
    const next = wine as Wine & {
      partner?: string
      leadTimeDays?: number
      targetDaysOfStock?: number
      reorderAlertsMuted?: boolean
    }
    let current: Wine = wine
    if (
      next.partner === undefined ||
      next.leadTimeDays === undefined ||
      next.targetDaysOfStock === undefined ||
      next.reorderAlertsMuted === undefined
    ) {
      changed = true
      current = {
        ...wine,
        partner: next.partner ?? wine.producer,
        leadTimeDays: next.leadTimeDays ?? 21,
        targetDaysOfStock: next.targetDaysOfStock ?? 45,
        reorderAlertsMuted: next.reorderAlertsMuted ?? false,
      }
    }
    if (!current.label) return current
    const producer = producerFromProductName(current.label)
    if (!producer || producer === current.producer) return current
    changed = true
    const partnerWasDefault = !current.partner || current.partner === wine.producer
    const supplierWasDefault = !current.supplier || current.supplier === wine.producer
    return {
      ...current,
      producer,
      partner: partnerWasDefault ? producer : current.partner,
      supplier: supplierWasDefault ? producer : current.supplier,
    }
  })
  let next: Books = changed ? { ...books, wines } : books
  if (next.orderHistory === undefined) {
    next = { ...next, orderHistory: [] }
    changed = true
  }
  if (next.orderHistoryImportedAt === undefined) {
    next = { ...next, orderHistoryImportedAt: null }
    changed = true
  }
  if (next.inventoryImportedAt === undefined) {
    next = { ...next, inventoryImportedAt: null }
    changed = true
  }
  if (next.inventoryAsOf === undefined) {
    next = { ...next, inventoryAsOf: null }
    changed = true
  }
  const deducted = applyInventoryOrderDeductions(next)
  if (deducted.deductedLines > 0) {
    next = deducted.books
    changed = true
  }
  if (next.salesPaceWindowDays === undefined || next.salesPaceWindowDays === 28) {
    next = { ...next, salesPaceWindowDays: 30 }
    changed = true
  }
  return changed ? next : books
}

function isBooks(value: unknown): value is Books {
  if (!value || typeof value !== "object") return false
  const books = value as Books
  return (
    Array.isArray(books.wines) &&
    Array.isArray(books.locations) &&
    Array.isArray(books.stock) &&
    Array.isArray(books.movements)
  )
}

export function readBooks(): Books {
  try {
    const raw = fs.readFileSync(booksPath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (isBooks(parsed)) {
      if (parsed.wines.length > 0 && !("label" in parsed.wines[0])) {
        const seeded = seedBooks()
        writeBooks(seeded)
        return seeded
      }
      const migrated = migrateBooks(parsed)
      if (migrated !== parsed) writeBooks(migrated)
      return migrated
    }
  } catch {
    // Missing or unreadable books fall through to the CSV upload.
  }
  const seeded = seedBooks()
  writeBooks(seeded)
  return seeded
}

export function writeBooks(books: Books) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(tempPath, JSON.stringify(books, null, 2))
  fs.renameSync(tempPath, booksPath)
}

export async function loadBooks() {
  await connection()
  return readBooks()
}

/** Re-import the inventory CSV while keeping the order-history upload and pace window. */
export function booksWithInventoryReset(current: Books, uploaded: Books, inventoryAsOf?: string | null): Books {
  const merged: Books = {
    ...uploaded,
    orderHistory: (current.orderHistory ?? []).map((line) => ({ ...line, inventoryDeducted: false })),
    orderHistoryImportedAt: current.orderHistoryImportedAt ?? null,
    salesPaceWindowDays: current.salesPaceWindowDays ?? uploaded.salesPaceWindowDays,
    inventoryAsOf: inventoryAsOf === undefined ? (uploaded.inventoryAsOf ?? null) : inventoryAsOf,
  }
  return applyInventoryOrderDeductions(merged).books
}

/** Drop the order-history upload and put back bottles those orders removed. Posted shipments stay. */
export function booksWithoutOrderHistory(current: Books): Books {
  const restored = restoreDeductedOrderInventory(current)
  return {
    ...restored,
    orderHistory: [],
    orderHistoryImportedAt: null,
  }
}

export function restoreUploadBooks(current?: Books) {
  const prior = current ?? readBooks()
  const books = booksWithInventoryReset(prior, seedBooks())
  writeBooks(books)
  return books
}

/** @deprecated Use restoreUploadBooks */
export const restoreSampleBooks = restoreUploadBooks
