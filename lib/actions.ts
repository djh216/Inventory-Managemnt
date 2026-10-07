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
    return { ok: false, error: "The sample books could not be restored." }
  }
  revalidatePath("/", "layout")
  return { ok: true, message: "Sample books restored." }
}
