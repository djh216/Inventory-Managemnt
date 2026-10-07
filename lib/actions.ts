"use server"

import { revalidatePath } from "next/cache"
import { applyCreateWine, applyPosting, applyReorder } from "@/lib/posting"
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

export async function resetBooks(): Promise<ActionResult> {
  try {
    restoreSampleBooks()
  } catch {
    return { ok: false, error: "The upload could not be restored." }
  }
  revalidatePath("/", "layout")
  return { ok: true, message: "Upload restored from inventory-upload.csv." }
}
