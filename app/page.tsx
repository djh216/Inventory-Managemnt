import { redirect } from "next/navigation"
import { DaysOnHandView } from "@/components/days-on-hand-view"
import { inventoryHref, parseInventoryView } from "@/lib/inventory-routes"

export const metadata = {
  title: "Days on hand",
}

export default async function Page({
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

  return (
    <div data-page="wide" data-sidebar="wide" className="w-full">
      <DaysOnHandView />
    </div>
  )
}
