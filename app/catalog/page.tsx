import { Suspense } from "react"
import { CatalogView } from "@/components/catalog-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Catalog",
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ wine?: string; sort?: string }>
}) {
  return (
    <Suspense fallback={<PageSkeleton label="the catalog" />}>
      <CatalogLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function CatalogLoader({
  searchParams,
}: {
  searchParams: Promise<{ wine?: string; sort?: string }>
}) {
  const [books, params] = await Promise.all([loadBooks(), searchParams])
  return <CatalogView books={books} initialWineId={params.wine} initialSort={params.sort} />
}
