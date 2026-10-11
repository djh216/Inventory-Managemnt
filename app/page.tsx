import { redirect } from "next/navigation"
import { Suspense } from "react"
import { DaysOnHandView } from "@/components/days-on-hand-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { inventoryHref, parseInventoryView } from "@/lib/inventory-routes"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Days on hand",
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    wine?: string
    sort?: string
    house?: string
  }>
}) {
  return (
    <Suspense fallback={<PageSkeleton label="days on hand" />}>
      <HomeLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function HomeLoader({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    wine?: string
    sort?: string
    house?: string
  }>
}) {
  const params = await searchParams
  if (params.view || params.wine || params.sort || params.house) {
    redirect(
      inventoryHref(parseInventoryView(params.view), {
        wine: params.wine,
        sort: params.sort,
        house: params.house,
      }),
    )
  }
  const books = await loadBooks()
  return (
    <div data-page="wide" data-sidebar="wide" className="w-full">
      <DaysOnHandView books={books} />
    </div>
  )
}
