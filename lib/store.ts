import fs from "fs"
import path from "path"
import { connection } from "next/server"
import { seedBooks } from "@/lib/seed"
import type { Books, Wine } from "@/lib/types"

const dataDir = path.join(process.cwd(), "data")
const booksPath = path.join(dataDir, "books.json")
const tempPath = `${booksPath}.tmp`

function migrateBooks(books: Books): Books {
  let changed = false
  const wines = books.wines.map((wine) => {
    const next = wine as Wine & {
      partner?: string
      leadTimeDays?: number
      targetDaysOfStock?: number
      reorderAlertsMuted?: boolean
    }
    if (
      next.partner !== undefined &&
      next.leadTimeDays !== undefined &&
      next.targetDaysOfStock !== undefined &&
      next.reorderAlertsMuted !== undefined
    ) {
      return wine
    }
    changed = true
    return {
      ...wine,
      partner: next.partner ?? wine.producer,
      leadTimeDays: next.leadTimeDays ?? 21,
      targetDaysOfStock: next.targetDaysOfStock ?? 45,
      reorderAlertsMuted: next.reorderAlertsMuted ?? false,
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
export function booksWithInventoryReset(current: Books, uploaded: Books): Books {
  return {
    ...uploaded,
    orderHistory: current.orderHistory ?? [],
    orderHistoryImportedAt: current.orderHistoryImportedAt ?? null,
    salesPaceWindowDays: current.salesPaceWindowDays ?? uploaded.salesPaceWindowDays,
  }
}

/** Drop the order-history upload. Inventory, postings, and the pace window stay. */
export function booksWithoutOrderHistory(current: Books): Books {
  return {
    ...current,
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
