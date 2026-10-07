import { Suspense } from "react"
import { PageSkeleton } from "@/components/page-skeleton"
import { StockView } from "@/components/stock-view"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Stock",
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  return (
    <Suspense fallback={<PageSkeleton label="floor stock" />}>
      <StockLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function StockLoader({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const [books, params] = await Promise.all([loadBooks(), searchParams])
  return <StockView books={books} initialHouse={params.house} />
}
