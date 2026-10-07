import type { Metadata } from "next"
import { Fraunces, Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { AppNav } from "@/components/app-nav"
import { NavFrame } from "@/components/nav-frame"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Marlow & Vine",
    template: "%s · Marlow & Vine",
  },
  description:
    "Inventory desk for Marlow & Vine, a Northern California wine distributor. Track cases on the floor, holds, and postings across three houses.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="min-h-full md:pl-60">
          <Suspense fallback={<NavFrame pathname={null} />}>
            <AppNav />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</main>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
