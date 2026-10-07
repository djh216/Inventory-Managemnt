import type { Metadata } from "next"
import { Fraunces, Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"
import { AppNavLoader } from "@/components/app-nav-loader"
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
    default: "Wine inventory",
    template: "%s · Wine inventory",
  },
  description:
    "Live wine inventory with order-driven depletion, days-of-supply, and reorder alerts for winery partners.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="min-h-full md:pl-60 has-[[data-sidebar=wide]]:md:pl-80">
          <Suspense fallback={<NavFrame pathname={null} />}>
            <AppNavLoader />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl px-4 py-5 has-[[data-page=wide]]:max-w-[min(112rem,calc(100vw-15rem))] has-[[data-sidebar=wide]]:has-[[data-page=wide]]:max-w-[min(112rem,calc(100vw-20rem))] md:px-8 md:py-8">
            {children}
          </main>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
