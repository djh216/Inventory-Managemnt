import { Suspense } from "react"
import { LedgerView } from "@/components/ledger-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Ledger",
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ wine?: string }>
}) {
  return (
    <Suspense fallback={<PageSkeleton label="the ledger" />}>
      <LedgerLoader searchParams={searchParams} />
    </Suspense>
  )
}

async function LedgerLoader({
  searchParams,
}: {
  searchParams: Promise<{ wine?: string }>
}) {
  const [books, params] = await Promise.all([loadBooks(), searchParams])
  return <LedgerView books={books} initialWineId={params.wine} />
}
