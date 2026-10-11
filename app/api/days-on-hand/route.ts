import { NextResponse } from "next/server"
import { buildDaysOnHandTableRows, shipmentPostingCount } from "@/lib/days-on-hand-table"
import { daysOnHandSummary, salesPaceWindowDays } from "@/lib/supply"
import { readBooks } from "@/lib/store"

export async function GET() {
  try {
    const books = readBooks()
    const now = new Date()
    return NextResponse.json({
      rows: buildDaysOnHandTableRows(books, now),
      summary: daysOnHandSummary(books, now),
      orderLineCount: books.orderHistory?.length ?? 0,
      orderHistoryImportedAt: books.orderHistoryImportedAt ?? null,
      salesPaceWindowDays: salesPaceWindowDays(books),
      shipmentCount: shipmentPostingCount(books),
    })
  } catch {
    return NextResponse.json({ error: "Could not load days on hand data." }, { status: 500 })
  }
}
