import { AppNavServer } from "@/components/app-nav-server"
import { alertCount, salesPaceWindowDays } from "@/lib/supply"
import { loadBooks } from "@/lib/store"

export async function AppNavLoader() {
  const books = await loadBooks()
  return (
    <AppNavServer
      alertCount={alertCount(books)}
      skuCount={books.wines.length}
      inventoryImportedAt={books.inventoryImportedAt ?? null}
      orderLineCount={books.orderHistory?.length ?? 0}
      orderHistoryImportedAt={books.orderHistoryImportedAt ?? null}
      salesPaceWindowDays={salesPaceWindowDays(books)}
    />
  )
}
