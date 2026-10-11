export type InventoryView = "overview" | "products" | "floor"

export function parseInventoryView(value: string | undefined): InventoryView {
  if (value === "products" || value === "catalog") return "products"
  if (value === "floor" || value === "stock") return "floor"
  return "overview"
}

export function inventoryHref(
  view: InventoryView,
  params: {
    wine?: string
    sort?: string
    house?: string
  } = {},
) {
  const query = new URLSearchParams()
  if (view !== "overview") query.set("view", view)
  if (params.wine) query.set("wine", params.wine)
  if (params.sort) query.set("sort", params.sort)
  if (params.house) query.set("house", params.house)
  const serialized = query.toString()
  return serialized ? `/?${serialized}` : "/"
}

export function inventoryProductHref(wineId: string, sort?: string) {
  return inventoryHref("products", { wine: wineId, sort })
}
