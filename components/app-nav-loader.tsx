import { AppNav } from "@/components/app-nav"
import { alertCount, salesPaceWindowDays } from "@/lib/supply"
import { loadBooks } from "@/lib/store"

export async function AppNavLoader() {
  const books = await loadBooks()
  return (
    <AppNav
      alertCount={alertCount(books)}
      orderLineCount={books.orderHistory?.length ?? 0}
      orderHistoryImportedAt={books.orderHistoryImportedAt ?? null}
      salesPaceWindowDays={salesPaceWindowDays(books)}
    />
  )
}
