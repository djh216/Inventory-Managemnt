import { importBooksFromCsv } from "./csv-import"
import type { Books } from "./types"

/** Build the book from `data/inventory-upload.csv` (Oct 6, 2026 upload). */
export function seedBooks(): Books {
  return importBooksFromCsv()
}
