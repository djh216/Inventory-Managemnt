import { Suspense } from "react"
import { OrdersView } from "@/components/orders-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Orders",
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="outbound orders" />}>
      <OrdersLoader />
    </Suspense>
  )
}

async function OrdersLoader() {
  const books = await loadBooks()
  return <OrdersView books={books} />
}
