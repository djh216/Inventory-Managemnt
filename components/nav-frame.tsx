import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Desk" },
  { href: "/catalog", label: "Catalog" },
  { href: "/stock", label: "Stock" },
  { href: "/ledger", label: "Ledger" },
]

function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({ pathname, stacked }: { pathname: string | null; stacked?: boolean }) {
  return (
    <nav className={cn("flex gap-1", stacked ? "flex-col" : "overflow-x-auto")} aria-label="Sections">
      {links.map((link) => {
        const current = isCurrent(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              stacked && "px-3",
              current && "bg-sidebar-accent text-sidebar-foreground",
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function NavFrame({
  pathname,
  footer,
}: {
  pathname: string | null
  footer?: ReactNode
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="h-1 bg-primary" />
        <div className="px-5 pt-6 pb-4">
          <p className="font-heading text-[2rem] leading-none tracking-tight">Marlow</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/55">
            & Vine
          </p>
          <p className="mt-4 text-xs leading-5 text-sidebar-foreground/55">
            Northern California wholesale
          </p>
        </div>
        <div className="px-3">
          <NavLinks pathname={pathname} stacked />
        </div>
        <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
          <p className="text-[11px] leading-5 text-sidebar-foreground/55">
            Oakland bonded, Napa cold room, and Fillmore will-call. The sample cellar lives on this machine.
          </p>
          {footer}
        </div>
      </aside>
      <div className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
        <div className="h-1 bg-primary" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-heading text-2xl leading-none">Marlow</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
              & Vine
            </p>
          </div>
          {footer}
        </div>
        <div className="px-2 pb-2">
          <NavLinks pathname={pathname} />
        </div>
      </div>
    </>
  )
}
