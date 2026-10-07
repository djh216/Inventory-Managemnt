import fs from "fs"
import path from "path"
import { connection } from "next/server"
import { seedBooks } from "@/lib/seed"
import type { Books } from "@/lib/types"

const dataDir = path.join(process.cwd(), "data")
const booksPath = path.join(dataDir, "books.json")
const tempPath = `${booksPath}.tmp`

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
        // Older local books from the demo cellar — rebuild from the CSV upload.
        const seeded = seedBooks()
        writeBooks(seeded)
        return seeded
      }
      return parsed
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

export function restoreUploadBooks() {
  const books = seedBooks()
  writeBooks(books)
  return books
}

/** @deprecated Use restoreUploadBooks */
export const restoreSampleBooks = restoreUploadBooks
