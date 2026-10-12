import { redirect } from "next/navigation"
import { inventoryHref } from "@/lib/inventory-routes"

export const metadata = {
  title: "Live inventory",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ wine?: string; sort?: string }>
}) {
  const params = await searchParams
  redirect(
    inventoryHref("products", {
      wine: params.wine,
      sort: params.sort,
    }),
  )
}
