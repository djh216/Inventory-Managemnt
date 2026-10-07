import { AppNav } from "@/components/app-nav"
import { alertCount } from "@/lib/supply"
import { loadBooks } from "@/lib/store"

export async function AppNavLoader() {
  const books = await loadBooks()
  return <AppNav alertCount={alertCount(books)} />
}
