import { Suspense } from "react"
import { DaysOnHandView } from "@/components/days-on-hand-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Days on hand",
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="days on hand" />}>
      <DaysOnHandLoader />
    </Suspense>
  )
}

async function DaysOnHandLoader() {
  const books = await loadBooks()
  return <DaysOnHandView books={books} />
}
