import { Suspense } from "react"
import { DeskView } from "@/components/desk-view"
import { PageSkeleton } from "@/components/page-skeleton"
import { loadBooks } from "@/lib/store"

export const metadata = {
  title: "Live inventory",
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="this morning's books" />}>
      <DeskLoader />
    </Suspense>
  )
}

async function DeskLoader() {
  const books = await loadBooks()
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date())
  return <DeskView books={books} today={today} />
}
