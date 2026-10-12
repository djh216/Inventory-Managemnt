import { redirect } from "next/navigation"
import { inventoryHref } from "@/lib/inventory-routes"

export const metadata = {
  title: "Live inventory",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const params = await searchParams
  redirect(
    inventoryHref("floor", {
      house: params.house,
    }),
  )
}
