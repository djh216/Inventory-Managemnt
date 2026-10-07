import type { Books, OrderHistoryLine, Wine } from "./types"

const DEFAULT_PACE_WINDOW_DAYS = 30

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
  const labelIndex = findColumn(header, [
    "label",
    "product",
    "wine",
    "description",
    "item name",
    "item",
    "line item product variation name",
    "product variation name",
    "product name",
  ])
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
    "line item quantity",
  ])
  const accountIndex = findColumn(header, ["account", "customer", "buyer", "account name"])
  const repIndex = findColumn(header, ["lead team member", "rep", "sales rep"])
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
    if (!sku && !label) continue

    const bottles = parseBottles(bottlesRaw)
    if (bottles === null || bottles <= 0) continue

    const at = parseOrderDate(dateRaw)
    if (!at) {
      return {
        error: `Line ${index + 1}: could not read the date "${dateRaw}". Use YYYY-MM-DD, MM/DD/YYYY, or Month DD, YYYY.`,
      }
    }

    const account = accountIndex >= 0 ? parts[accountIndex]?.trim() ?? "" : ""
    const reference =
      (referenceIndex >= 0 ? parts[referenceIndex]?.trim() ?? "" : "") ||
      outfieldReference(repIndex >= 0 ? parts[repIndex]?.trim() ?? "" : "", account, dateRaw)

    rows.push({
      line: index + 1,
      sku,
      label,
      at,
      bottles,
      account,
      reference,
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
    wineByLabel.set(catalogLabelKey(wine.label), wine)
  }

  const orderHistory: OrderHistoryLine[] = (books.orderHistory ?? []).map((line) => ({ ...line }))
  const seen = new Set(orderHistory.map(orderLineKey))
  let imported = 0
  let skipped = 0
  let unmatched = 0
  const unmatchedSamples: string[] = []

  for (const row of rows) {
    const wine =
      (row.sku ? wineBySku.get(row.sku.toLowerCase()) : undefined) ??
      (row.label ? wineByLabel.get(catalogLabelKey(row.label)) : undefined)
    if (!wine) {
      unmatched += 1
      if (unmatchedSamples.length < 5) {
        unmatchedSamples.push(row.sku || row.label || `line ${row.line}`)
      }
      continue
    }
    const line: OrderHistoryLine = {
      id: "",
      at: row.at,
      wineId: wine.id,
      bottles: row.bottles,
      account: row.account,
      reference: row.reference || `OH-${row.line}`,
    }
    const key = orderLineKey(line)
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    line.id = idFactory()
    orderHistory.push(line)
    imported += 1
  }

  if (imported === 0 && skipped === 0) {
    return {
      ok: false,
      error:
        "No rows matched the catalog. Outfield exports should use Line Item Product Variation Name exactly as in the Oct 6 inventory upload.",
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
    imported,
    skipped,
    unmatched,
    unmatchedSamples,
  }
}

function orderLineKey(line: Pick<OrderHistoryLine, "wineId" | "at" | "bottles" | "account" | "reference">) {
  return [line.wineId, line.at, String(line.bottles), line.account.trim(), line.reference.trim()].join("\u0000")
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
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const bottles = Math.round(Number(cleaned))
  return Number.isFinite(bottles) ? bottles : null
}

function catalogLabelKey(label: string) {
  return normalizeProductLabel(label).toLowerCase()
}

export function normalizeProductLabel(label: string) {
  return label
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\s+/g, " ")
}

function outfieldReference(rep: string, account: string, orderDate: string) {
  const parts = [rep, account, orderDate].map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return ""
  return parts.join(" · ")
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

  const longMonth = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(trimmed)
  if (longMonth) {
    const parsed = new Date(`${longMonth[1]} ${longMonth[2]}, ${longMonth[3]} 12:00:00 GMT`)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
