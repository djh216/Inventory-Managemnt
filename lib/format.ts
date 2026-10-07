import type { MovementType, Wine, WineColor } from "./types"

const pacific: Intl.DateTimeFormatOptions = { timeZone: "America/Los_Angeles" }

const dayFormat = new Intl.DateTimeFormat("en-US", {
  ...pacific,
  weekday: "long",
  month: "short",
  day: "numeric",
})

const whenFormat = new Intl.DateTimeFormat("en-US", {
  ...pacific,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const clockFormat = new Intl.DateTimeFormat("en-US", {
  ...pacific,
  hour: "numeric",
  minute: "2-digit",
})

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const casesFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
})

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
})

export function wineName(wine: Pick<Wine, "label" | "producer" | "cuvee" | "vintage">) {
  if (wine.label?.trim()) return wine.label.trim()
  const vintage = wine.vintage ? String(wine.vintage) : "NV"
  return `${wine.producer} ${wine.cuvee} ${vintage}`
}

export function formatMoneyOptional(amount: number) {
  if (!amount) return "—"
  return formatMoney(amount)
}

export function formatBottles(bottles: number, perCase: number) {
  const sign = bottles < 0 ? "−" : ""
  const abs = Math.abs(Math.trunc(bottles))
  const cases = Math.floor(abs / perCase)
  const loose = abs % perCase
  if (cases === 0 && loose === 0) return "0"
  if (loose === 0) return `${sign}${cases.toLocaleString("en-US")} cs`
  if (cases === 0) return `${sign}${loose.toLocaleString("en-US")} bt`
  return `${sign}${cases.toLocaleString("en-US")} cs ${loose} bt`
}

export function formatCases(cases: number) {
  return casesFormat.format(Math.round(cases * 10) / 10)
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value))
}

export function formatMoney(amount: number) {
  return moneyFormat.format(Math.round(amount))
}

export function formatPercent(ratio: number) {
  return percentFormat.format(ratio)
}

export function formatAbv(abv: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(abv)}% ABV`
}

export function formatBottleSize(ml: number) {
  if (ml === 1500) return "1.5 L"
  if (ml === 375) return "375 ml"
  return `${ml} ml`
}

export function formatWhen(iso: string) {
  return whenFormat.format(new Date(iso))
}

export function formatClock(iso: string) {
  return clockFormat.format(new Date(iso))
}

export function formatDay(iso: string) {
  return dayFormat.format(new Date(iso))
}

export function pacificDayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    ...pacific,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso))
}

export const COLOR_LABEL: Record<WineColor, string> = {
  red: "Red",
  white: "White",
  rose: "Rosé",
  sparkling: "Sparkling",
  fortified: "Fortified",
}

export const COLOR_SWATCH: Record<WineColor, string> = {
  red: "#7a2433",
  white: "#c6b07a",
  rose: "#d9898a",
  sparkling: "#b7a27a",
  fortified: "#8a4b1f",
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  receive: "Receipt",
  ship: "Shipment",
  allocate: "Hold",
  release: "Release",
  transfer: "Transfer",
  adjust: "Count",
}

export const STATUS_LABEL = {
  healthy: "In stock",
  low: "Reorder",
  out: "Out",
  idle: "Sell through",
} as const
