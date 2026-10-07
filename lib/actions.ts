"use server"

import { revalidatePath } from "next/cache"
import { applyCreateWine, applyPosting, applyReorder } from "@/lib/posting"
import {
  applyOrderHistoryImport,
  parseOrderHistoryCsv,
} from "@/lib/order-history-import"
import { readBooks, restoreSampleBooks, writeBooks } from "@/lib/store"
import type { ActionResult, CreateWineInput, PostingInput } from "@/lib/types"

function persist(books: ReturnType<typeof readBooks>): ActionResult | null {
  try {
    writeBooks(books)
  } catch {
    return { ok: false, error: "The book could not be saved on this machine." }
  }
  revalidatePath("/", "layout")
  return null
}

export async function postMovement(input: PostingInput): Promise<ActionResult> {
  const result = applyPosting(
    readBooks(),
    input,
    new Date().toISOString(),
    crypto.randomUUID(),
  )
  if (!result.ok) return result
  const failed = persist(result.books)
  if (failed) return failed
  return { ok: true, message: result.message }
}

export async function createWine(input: CreateWineInput): Promise<ActionResult> {
  const at = new Date().toISOString()
  const result = applyCreateWine(
    readBooks(),
    input,
    at,
    crypto.randomUUID(),
    crypto.randomUUID(),
  )
  if (!result.ok) return result
  const failed = persist(result.books)
  if (failed) return failed
  return { ok: true, message: result.message, wineId: result.wineId }
}

export async function setSupplyPolicy(input: {
  wineId: string
  partner: string
  leadTimeDays: number
  targetDaysOfStock: number
}): Promise<ActionResult> {
  const books = readBooks()
  const wine = books.wines.find((item) => item.id === input.wineId)
  if (!wine) return { ok: false, error: "That wine is not on the book." }
  if (input.partner.trim().length < 2) return { ok: false, error: "Enter the winery partner name." }
  if (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 1 || input.leadTimeDays > 180) {
    return { ok: false, error: "Lead time must be between 1 and 180 days." }
  }
  if (!Number.isInteger(input.targetDaysOfStock) || input.targetDaysOfStock < 7 || input.targetDaysOfStock > 365) {
    return { ok: false, error: "Target cover must be between 7 and 365 days." }
  }
  const next = structuredClone(books)
  const row = next.wines.find((item) => item.id === input.wineId)!
  row.partner = input.partner.trim()
  row.leadTimeDays = input.leadTimeDays
  row.targetDaysOfStock = input.targetDaysOfStock
  const failed = persist(next)
  if (failed) return failed
  return { ok: true, message: `Updated reorder policy for ${row.label || row.producer}.`, wineId: input.wineId }
}

export async function setReorderAlertsMuted(
  wineId: string,
  muted: boolean,
): Promise<ActionResult> {
  const books = readBooks()
  const wine = books.wines.find((item) => item.id === wineId)
  if (!wine) return { ok: false, error: "That wine is not on the book." }
  const next = structuredClone(books)
  const row = next.wines.find((item) => item.id === wineId)!
  row.reorderAlertsMuted = muted
  const failed = persist(next)
  if (failed) return failed
  return {
    ok: true,
    message: muted
      ? `Removed ${row.label || row.producer} from reorder alerts.`
      : `Reorder alerts restored for ${row.label || row.producer}.`,
    wineId,
  }
}

export async function setReorder(wineId: string, reorderCases: number): Promise<ActionResult> {
  const result = applyReorder(readBooks(), wineId, reorderCases)
  if (!result.ok) return result
  const failed = persist(result.books)
  if (failed) return failed
  return { ok: true, message: result.message, wineId: result.wineId }
}

export async function importOrderHistoryCsv(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file to upload." }
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "Order history must be 8 MB or smaller." }
  }
  const text = await file.text()
  const parsed = parseOrderHistoryCsv(text)
  if ("error" in parsed) {
    return { ok: false, error: parsed.error }
  }
  const result = applyOrderHistoryImport(readBooks(), parsed, new Date().toISOString())
  if (!result.ok) return { ok: false, error: result.error }
  const failed = persist(result.books)
  if (failed) return failed
  const unmatchedNote =
    result.unmatched > 0
      ? ` ${result.unmatched} row${result.unmatched === 1 ? "" : "s"} did not match a SKU.`
      : ""
  return {
    ok: true,
    message: `Imported ${result.imported} order lines for sales pace.${unmatchedNote}`,
  }
}

export async function setSalesPaceWindow(days: number): Promise<ActionResult> {
  if (!Number.isInteger(days) || days < 7 || days > 365) {
    return { ok: false, error: "Pace window must be between 7 and 365 days." }
  }
  const books = readBooks()
  const next = structuredClone(books)
  next.salesPaceWindowDays = days
  const failed = persist(next)
  if (failed) return failed
  return { ok: true, message: `Sales pace now uses the last ${days} days of orders.` }
}

export async function clearOrderHistory(): Promise<ActionResult> {
  const books = readBooks()
  const next = structuredClone(books)
  next.orderHistory = []
  next.orderHistoryImportedAt = null
  const failed = persist(next)
  if (failed) return failed
  return { ok: true, message: "Uploaded order history cleared. Posted shipments still count toward pace." }
}

export async function resetBooks(): Promise<ActionResult> {
  try {
    restoreSampleBooks()
  } catch {
    return { ok: false, error: "The upload could not be restored." }
  }
  revalidatePath("/", "layout")
  return { ok: true, message: "Upload restored from inventory-upload.csv." }
}
