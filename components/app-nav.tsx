"use client"

import { usePathname } from "next/navigation"
import { SidebarInventory } from "@/components/sidebar-inventory"
import { SidebarOrderHistory } from "@/components/sidebar-order-history"
import { NavFrame } from "@/components/nav-frame"

export function AppNav({
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
  const pathname = usePathname()
  return (
    <NavFrame
      pathname={pathname}
      alertCount={alertCount}
      inventoryPanel={
        <SidebarInventory skuCount={skuCount} inventoryImportedAt={inventoryImportedAt} />
      }
      orderHistoryPanel={
        <SidebarOrderHistory
          orderLineCount={orderLineCount}
          orderHistoryImportedAt={orderHistoryImportedAt}
          salesPaceWindowDays={salesPaceWindowDays}
        />
      }
    />
  )
}
