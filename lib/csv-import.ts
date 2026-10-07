import fs from "fs"
import path from "path"
import type { Books, Location, StockLine, Wine, WineColor } from "./types"

export const INVENTORY_UPLOAD_FILE = "inventory-upload.csv"
export const UPLOAD_REFERENCE = "UPLOAD-100626"
export const UPLOAD_DATE = "2026-10-06T12:00:00.000Z"

type CsvRow = {
  label: string
  sku: string
  onHand: number
  available: number
}

const PRODUCER_PREFIXES = [
  "Ciacci Piccolomini",
  "Domenico Clerico",
  "E. Pira e Figli",
  "E Pira e Figli",
  "La Spinetta",
  "Bruno Rocca",
  "San Cassiano",
  "Castelfeder",
  "Avignonesi",
  "Contratto",
  "Contrattino",
  "Frassinelli",
  "Malvirà",
  "Malvira",
  "Ottoventi",
  "Calafe'",
  "E. Pira",
  "E Pira",
  "Cocito",
  "Ciacci",
].sort((a, b) => b.length - a.length)

export function inventoryCsvPath() {
  return path.join(process.cwd(), "data", INVENTORY_UPLOAD_FILE)
}

export function readInventoryCsv(filePath = inventoryCsvPath()): CsvRow[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []
  const rows: CsvRow[] = []
  for (let index = 1; index < lines.length; index += 1) {
    const row = parseCsvLine(lines[index])
    if (!row) continue
    rows.push(row)
  }
  return rows
}

function parseCsvLine(line: string): CsvRow | null {
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
  if (parts.length < 4) return null
  const label = parts[0].trim()
  if (!label) return null
  const sku = parts[1].trim()
  const onHand = parseQuantity(parts[2])
  const available = parseQuantity(parts[3])
  if (onHand === null || available === null) return null
  return { label, sku, onHand, available }
}

function parseQuantity(value: string) {
  const cleaned = value.trim().replace(/,/g, "")
  if (!/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

export function booksFromUpload(rows: CsvRow[]): Books {
  const location = primaryLocation(rows)
  const wines: Wine[] = []
  const stock: StockLine[] = []
  const skuCounts = new Map<string, number>()

  rows.forEach((row, index) => {
    const parsed = parseLabel(row.label)
    const skuKey = row.sku || syntheticSku(row.label, index)
    const seen = skuCounts.get(skuKey) ?? 0
    skuCounts.set(skuKey, seen + 1)
    const id = wineId(skuKey, row.label, index, seen)

    const wine: Wine = {
      id,
      sku: skuKey,
      label: row.label,
      producer: parsed.producer,
      cuvee: parsed.cuvee,
      vintage: parsed.vintage,
      color: parsed.color,
      varietal: parsed.varietal,
      country: parsed.country,
      region: parsed.region,
      appellation: parsed.appellation,
      formatMl: parsed.formatMl,
      bottlesPerCase: parsed.bottlesPerCase,
      abv: parsed.abv,
      costPerCase: 0,
      pricePerCase: 0,
      reorderCases: 0,
      partner: parsed.producer,
      leadTimeDays: defaultLeadTime(parsed.country),
      targetDaysOfStock: 45,
      reorderAlertsMuted: false,
      supplier: parsed.producer,
      active: true,
      note: row.onHand !== row.available ? "Imported with committed quantity." : "",
    }
    wines.push(wine)

    if (row.onHand > 0 || row.available > 0) {
      stock.push({
        wineId: id,
        locationId: location.id,
        onHandBottles: row.onHand,
        availableBottles: row.available,
        allocatedBottles: Math.max(0, row.onHand - row.available),
      })
      if (row.available > row.onHand) {
        wine.note = "Upload shows more available than on hand; quantities are stored exactly as uploaded."
      }
    }
  })

  return {
    wines,
    locations: [location],
    stock,
    movements: [],
    orderHistory: [],
    orderHistoryImportedAt: null,
    salesPaceWindowDays: 30,
  }
}

export function importBooksFromCsv(filePath = inventoryCsvPath()): Books {
  return booksFromUpload(readInventoryCsv(filePath))
}

function primaryLocation(rows: CsvRow[]): Location {
  const bottles = rows.reduce((sum, row) => sum + row.onHand, 0)
  const capacityCases = Math.max(500, Math.ceil((bottles / 12) * 1.25))
  return {
    id: "main",
    name: "Main inventory",
    city: "Warehouse",
    kind: "bonded",
    capacityCases,
  }
}

function wineId(sku: string, label: string, index: number, duplicateIndex: number) {
  const base = slug(sku || label).slice(0, 48) || `row-${index}`
  return duplicateIndex > 0 ? `w-${base}-${duplicateIndex}` : `w-${base}`
}

function syntheticSku(label: string, index: number) {
  return `GEN-${slug(label).slice(0, 24).toUpperCase() || index}-${index + 1}`
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
}

type ParsedLabel = {
  producer: string
  cuvee: string
  vintage: number | null
  color: WineColor
  varietal: string
  country: string
  region: string
  appellation: string
  formatMl: number
  bottlesPerCase: number
  abv: number
}

function parseLabel(label: string): ParsedLabel {
  let working = label.trim()
  const formatMl = detectFormatMl(working)
  const bottlesPerCase = detectCasePack(working)
  working = working
    .replace(/\s*-\s*1\.5L\b/i, "")
    .replace(/\b1\.5L\b/i, "")
    .replace(/\b375ml\b/i, "")
    .replace(/\b200m?l\b/i, "")
    .replace(/\(\s*3-?pack\s*\)/i, "")
    .replace(/\(\s*5\.5%\s*\)/i, "")
    .trim()

  const nv = /\bNV\b/i.test(working) || /non-alcoholic/i.test(working)
  const years = [...working.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]))
  const vintage = nv ? null : years.length > 0 ? years[years.length - 1] : null
  if (vintage !== null) {
    working = working.replace(new RegExp(`\\b${vintage}\\b`), "").trim()
  }
  working = working.replace(/\bNV\b/i, "").trim()

  const producer = detectProducer(working)
  let cuvee = working
  if (working.toLowerCase().startsWith(producer.toLowerCase())) {
    cuvee = working.slice(producer.length).trim().replace(/^[-–—]\s*/, "")
  }
  if (!cuvee) cuvee = working

  const appellation = detectAppellation(working)
  const region = detectRegion(working, appellation)
  const country = detectCountry(working, region, appellation)
  const varietal = detectVarietal(working)
  const color = detectColor(working, varietal)
  const abv = /5\.5%/.test(label) ? 5.5 : color === "fortified" ? 18 : color === "sparkling" ? 12 : 13.5

  return {
    producer,
    cuvee,
    vintage,
    color,
    varietal,
    country,
    region,
    appellation,
    formatMl,
    bottlesPerCase,
    abv,
  }
}

function detectProducer(label: string) {
  for (const prefix of PRODUCER_PREFIXES) {
    if (label.toLowerCase().startsWith(prefix.toLowerCase())) return prefix
  }
  const words = label.split(/\s+/)
  if (words.length >= 2 && /^[A-Z]/.test(words[1]) && !isWineWord(words[1])) {
    return `${words[0]} ${words[1]}`
  }
  return words[0] ?? label
}

function isWineWord(word: string) {
  return /^(di|del|della|de|da|DOCG|DOC|IGT|DOP|Bianco|Rosso|Brunello|Barolo|Barbaresco)$/i.test(word)
}

function detectFormatMl(label: string) {
  if (/1\.5L/i.test(label)) return 1500
  if (/375ml/i.test(label)) return 375
  if (/200m?l/i.test(label)) return 200
  return 750
}

function detectCasePack(label: string) {
  if (/3-?pack/i.test(label)) return 3
  return 12
}

function detectColor(label: string, varietal: string): WineColor {
  const text = `${label} ${varietal}`.toLowerCase()
  if (/vermouth|fernet|bitter|aperitif|aperitivo|spritz|stoppers|non-alcoholic|contrattino/.test(text)) {
    return "fortified"
  }
  if (/brut|prosecco|spumante|pas dose|alta langa|millesimato|blanc de|sparkling|brachetto d'acqui/.test(text)) {
    return "sparkling"
  }
  if (/\brose\b|rosé/.test(text)) return "rose"
  if (/bianco|blanc|blanco|chardonnay|sauvignon|greco|timorasso|riesling|moscato d'asti|pinot bianco|pinot grigio|garganega|fiano|vermentino|zibibbo|catarratto/.test(text)) {
    return "white"
  }
  return "red"
}

function detectVarietal(label: string) {
  const known = [
    "Nebbiolo",
    "Barbera",
    "Sangiovese",
    "Merlot",
    "Pinot Nero",
    "Pinot Noir",
    "Chardonnay",
    "Sauvignon Blanc",
    "Greco",
    "Aglianico",
    "Tempranillo",
    "Moscato",
    "Brachetto",
  ]
  for (const name of known) {
    if (label.toLowerCase().includes(name.toLowerCase())) return name
  }
  if (/barolo|barbaresco|brunello|langhe nebbiolo/i.test(label)) return "Nebbiolo"
  if (/rosso di montalcino|vino nobile|chianti/i.test(label)) return "Sangiovese"
  return "Blend"
}

function detectAppellation(label: string) {
  const match = label.match(
    /\b(Barolo DOCG|Barbaresco(?:\s+Riserva)?|Brunello di Montalcino(?:\s+Pianrosso)?(?:\s+DOCG)?|Vino Nobile di Montepulciano DOCG|Chianti(?:\s+Riserva)?|Alta Langa DOCG|Valpolicella DOC|Langhe(?:\s+Bianco)?|Toscana IGT|Tuscany|Pi(?:e)?monte(?:\s+DOC)?|Alto Adige|Mosel|Irpinia|Taurasi|Greco di Tufo|Sancerre|Marlborough|Etna|Rioja|Burgundy|Bourgogne|Sonoma Coast|Napa Valley|Willamette Valley|Russian River Valley|Saint-Émilion|Bordeaux Supérieur|Chablis|Champagne|Douro|Porto|Sant'Antimo|Montepulciano|Catarratto Zibibbo|Vigneti Dolomiti IGT)\b/i,
  )
  return match ? match[0] : ""
}

function detectRegion(label: string, appellation: string) {
  const text = `${label} ${appellation}`.toLowerCase()
  if (/toscana|tuscany|montalcino|montepulciano|chianti|sant'antimo/.test(text)) return "Tuscany"
  if (/piemonte|piemonte|langhe|barolo|barbaresco|alta langa|barbera d'asti|barbera d'alba/.test(text)) return "Piedmont"
  if (/alto adige|mosel|loire|burgundy|bordeaux|champagne|irpinia|taurasi|valpolicella|sicily|etna|rioja|marlborough|napa|sonoma|oregon|burgundy|douro/.test(text)) {
    if (/alto adige/.test(text)) return "Alto Adige"
    if (/mosel/.test(text)) return "Mosel"
    if (/irpinia|taurasi/.test(text)) return "Campania"
    if (/valpolicella/.test(text)) return "Veneto"
  }
  if (/docg|doc|igt|dop/.test(text)) return "Italy"
  return appellation ? "Italy" : ""
}

function defaultLeadTime(country: string) {
  if (country === "Italy" || country === "France" || country === "Spain") return 21
  if (country === "United States") return 14
  return 21
}

function detectCountry(label: string, region: string, appellation: string) {
  const text = `${label} ${region} ${appellation}`.toLowerCase()
  if (/marlborough|napa|sonoma|oregon|willamette|california|united states/.test(text)) return "United States"
  if (/mosel|riesling mosel/.test(text)) return "Germany"
  if (/burgundy|bordeaux|champagne|loire|france/.test(text)) return "France"
  if (/docg|doc|igt|dop|toscana|piemonte|barolo|brunello|valpolicella|alto adige/.test(text)) return "Italy"
  if (/rioja|spain/.test(text)) return "Spain"
  if (/portugal|douro/.test(text)) return "Portugal"
  if (/new zealand/.test(text)) return "New Zealand"
  return region ? "Italy" : ""
}
