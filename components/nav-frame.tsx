import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Days on hand" },
  { href: "/inventory", label: "Live inventory", badge: true },
] as const

function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === "/") {
    return pathname === "/" || pathname === "/days-on-hand" || pathname.startsWith("/days-on-hand/")
  }
  if (href === "/inventory") {
    return (
      pathname === "/inventory" ||
      pathname.startsWith("/inventory/") ||
      pathname === "/catalog" ||
      pathname.startsWith("/catalog/") ||
      pathname === "/stock" ||
      pathname.startsWith("/stock/")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({
  pathname,
  stacked,
  alertCount = 0,
}: {
  pathname: string | null
  stacked?: boolean
  alertCount?: number
}) {
  return (
    <nav className={cn("flex gap-1", stacked ? "flex-col" : "overflow-x-auto")} aria-label="Sections">
      {links.map((link) => {
        const current = isCurrent(pathname, link.href)
        const showBadge = "badge" in link && link.badge && alertCount > 0
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              stacked && "px-3",
              current && "bg-sidebar-accent text-sidebar-foreground",
              showBadge && "flex items-center justify-between gap-2",
            )}
          >
            <span>{link.label}</span>
            {showBadge ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {alertCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function NavFrame({
  pathname,
  footer,
  alertCount = 0,
  inventoryPanel,
  orderHistoryPanel,
}: {
  pathname: string | null
  footer?: ReactNode
  alertCount?: number
  inventoryPanel?: ReactNode
  orderHistoryPanel?: ReactNode
}) {
  const showOrderHistory =
    pathname === "/" ||
    pathname === "/days-on-hand" ||
    pathname?.startsWith("/days-on-hand/")
  const showInventoryUpload =
    pathname === "/" ||
    pathname === "/inventory" ||
    pathname?.startsWith("/inventory/") ||
    pathname === "/catalog" ||
    pathname?.startsWith("/catalog/") ||
    pathname === "/stock" ||
    pathname?.startsWith("/stock/")
  const wideSidebar = showOrderHistory || showInventoryUpload
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
          wideSidebar ? "w-80" : "w-60",
        )}
      >
        <div className="h-1 bg-primary" />
        <div className="px-5 pt-6 pb-4">
          <p className="font-heading text-[2rem] leading-none tracking-tight">Inventory</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
            Oct 6 upload
          </p>
          {!wideSidebar ? (
            <p className="mt-4 text-xs leading-5 text-sidebar-foreground/55">
              Shipments drive depletion; reorder alerts fire when days of cover hit partner lead time.
            </p>
          ) : null}
        </div>
        <div className="shrink-0 px-3">
          <NavLinks pathname={pathname} stacked alertCount={alertCount} />
        </div>
        {showInventoryUpload || showOrderHistory ? <div className="min-h-0 flex-1 overflow-y-auto" /> : null}
        {showInventoryUpload && inventoryPanel ? (
          <div className="max-h-[min(40vh,calc(100vh-14rem))] shrink-0 overflow-y-auto border-t border-sidebar-border px-4 py-4">
            {inventoryPanel}
          </div>
        ) : null}
        {showOrderHistory && orderHistoryPanel ? (
          <div className="max-h-[min(40vh,calc(100vh-14rem))] shrink-0 overflow-y-auto border-t border-sidebar-border px-4 py-4">
            {orderHistoryPanel}
          </div>
        ) : null}
        <div
          className={cn(
            "shrink-0 space-y-3 border-t border-sidebar-border p-4",
            !wideSidebar && "mt-auto",
          )}
        >
          <p className="text-[11px] leading-5 text-sidebar-foreground/55">
            Post shipments as orders, receive against winery POs, and tune lead time per wine under Products.
          </p>
          {footer}
        </div>
      </aside>
      <div className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        <div className="h-1 bg-primary" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-heading text-2xl leading-none">Inventory</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
              Oct 6 upload
            </p>
          </div>
          {footer}
        </div>
        <div className="px-2 pb-2">
          <NavLinks pathname={pathname} alertCount={alertCount} />
        </div>
      </div>
    </>
  )
}
