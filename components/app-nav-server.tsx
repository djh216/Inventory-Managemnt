import { headers } from "next/headers"
import { NavFrame } from "@/components/nav-frame"
import { SidebarInventoryServer } from "@/components/sidebar-inventory-server"
import { SidebarOrderHistoryServer } from "@/components/sidebar-order-history-server"

export async function AppNavServer({
  alertCount = 0,
  skuCount = 0,
  inventoryImportedAt = null,
  orderLineCount = 0,
  orderHistoryImportedAt = null,
  salesPaceWindowDays = 30,
}: {
  alertCount?: number
  skuCount?: number
  inventoryImportedAt?: string | null
  orderLineCount?: number
  orderHistoryImportedAt?: string | null
  salesPaceWindowDays?: number
}) {
  const pathname = (await headers()).get("x-pathname")
  return (
    <NavFrame
      pathname={pathname}
      alertCount={alertCount}
      inventoryPanel={
        <SidebarInventoryServer skuCount={skuCount} inventoryImportedAt={inventoryImportedAt} />
      }
      orderHistoryPanel={
        <SidebarOrderHistoryServer
          orderLineCount={orderLineCount}
          orderHistoryImportedAt={orderHistoryImportedAt}
          salesPaceWindowDays={salesPaceWindowDays}
        />
      }
    />
  )
}
