import type { Books, OrderHistoryLine, Wine } from "./types"

const DEFAULT_PACE_WINDOW_DAYS = 28

type ParsedRow = {
  line: number
  sku: string
  label: string
  at: string
  bottles: number
  account: string
  reference: string
}

export type OrderHistoryImportResult =
  | {
      ok: true
      books: Books
      imported: number
      skipped: number
      unmatched: number
      unmatchedSamples: string[]
    }
  | { ok: false; error: string }

export function parseOrderHistoryCsv(raw: string): ParsedRow[] | { error: string } {
  const text = raw.replace(/^\uFEFF/, "")
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return { error: "The file needs a header row and at least one order line." }
  }

  const header = parseCsvLine(lines[0]).map(normalizeHeader)
  const skuIndex = findColumn(header, [
    "sku",
    "product sku",
    "item sku",
    "product code",
    "item code",
    "code",
  ])
  const labelIndex = findColumn(header, ["label", "product", "wine", "description", "item name", "item"])
  const dateIndex = findColumn(header, [
    "order date",
    "ship date",
    "shipped date",
    "invoice date",
    "date",
  ])
  const bottlesIndex = findColumn(header, [
    "bottles",
    "bottle",
    "qty",
    "quantity",
    "units",
    "bottle qty",
    "qty bottles",
    "shipped",
  ])
  const accountIndex = findColumn(header, ["account", "customer", "buyer"])
  const referenceIndex = findColumn(header, ["reference", "order", "order number", "invoice", "po"])

  if (dateIndex === -1 || bottlesIndex === -1) {
    return { error: "Include Date and Bottles (or Qty) columns in the header." }
  }
  if (skuIndex === -1 && labelIndex === -1) {
    return { error: "Include SKU or Label so rows can match your catalog." }
  }

  const rows: ParsedRow[] = []
  for (let index = 1; index < lines.length; index += 1) {
    const parts = parseCsvLine(lines[index])
    const sku = skuIndex >= 0 ? parts[skuIndex]?.trim() ?? "" : ""
    const label = labelIndex >= 0 ? parts[labelIndex]?.trim() ?? "" : ""
    const dateRaw = parts[dateIndex]?.trim() ?? ""
    const bottlesRaw = parts[bottlesIndex]?.trim() ?? ""
    if (!dateRaw && !bottlesRaw && !sku && !label) continue

    const bottles = parseBottles(bottlesRaw)
    const at = parseOrderDate(dateRaw)
    if (bottles === null || bottles <= 0) {
      return { error: `Line ${index + 1}: enter a positive bottle quantity.` }
    }
    if (!at) {
      return { error: `Line ${index + 1}: could not read the date "${dateRaw}". Use YYYY-MM-DD or MM/DD/YYYY.` }
    }
    if (!sku && !label) {
      return { error: `Line ${index + 1}: add a SKU or Label.` }
    }

    rows.push({
      line: index + 1,
      sku,
      label,
      at,
      bottles,
      account: accountIndex >= 0 ? parts[accountIndex]?.trim() ?? "" : "",
      reference: referenceIndex >= 0 ? parts[referenceIndex]?.trim() ?? "" : "",
    })
  }

  if (rows.length === 0) {
    return { error: "No order rows were found after the header." }
  }
  return rows
}

export function applyOrderHistoryImport(
  books: Books,
  rows: ParsedRow[],
  importedAt: string,
  idFactory: () => string = () => crypto.randomUUID(),
): OrderHistoryImportResult {
  const wineBySku = new Map<string, Wine>()
  const wineByLabel = new Map<string, Wine>()
  for (const wine of books.wines) {
    wineBySku.set(wine.sku.trim().toLowerCase(), wine)
    wineByLabel.set(wine.label.trim().toLowerCase(), wine)
  }

  const orderHistory: OrderHistoryLine[] = []
  let unmatched = 0
  const unmatchedSamples: string[] = []

  for (const row of rows) {
    const wine =
      (row.sku ? wineBySku.get(row.sku.toLowerCase()) : undefined) ??
      (row.label ? wineByLabel.get(row.label.toLowerCase()) : undefined)
    if (!wine) {
      unmatched += 1
      if (unmatchedSamples.length < 5) {
        unmatchedSamples.push(row.sku || row.label || `line ${row.line}`)
      }
      continue
    }
    orderHistory.push({
      id: idFactory(),
      at: row.at,
      wineId: wine.id,
      bottles: row.bottles,
      account: row.account,
      reference: row.reference || `OH-${row.line}`,
    })
  }

  if (orderHistory.length === 0) {
    return {
      ok: false,
      error: "No rows matched a catalog SKU or label. Check that SKUs match the Oct 6 upload.",
    }
  }

  const next: Books = {
    ...structuredClone(books),
    orderHistory,
    orderHistoryImportedAt: importedAt,
    salesPaceWindowDays: books.salesPaceWindowDays ?? DEFAULT_PACE_WINDOW_DAYS,
  }

  return {
    ok: true,
    books: next,
    imported: orderHistory.length,
    skipped: 0,
    unmatched,
    unmatchedSamples,
  }
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function findColumn(headers: string[], names: string[]) {
  for (const name of names) {
    const index = headers.indexOf(name)
    if (index >= 0) return index
  }
  for (const name of names) {
    const index = headers.findIndex((header) => header.includes(name))
    if (index >= 0) return index
  }
  return -1
}

function parseCsvLine(line: string): string[] {
  const parts: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      parts.push(current)
      current = ""
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

function parseBottles(value: string) {
  const cleaned = value.replace(/,/g, "").trim()
  if (!/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

export function parseOrderDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(`${trimmed.slice(0, 10)}T12:00:00.000Z`)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slash) {
    const month = Number(slash[1])
    const day = Number(slash[2])
    const year = Number(slash[3])
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
