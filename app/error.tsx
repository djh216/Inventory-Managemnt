"use client"

import { Button } from "@/components/ui/button"

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Books</p>
      <h1 className="mt-2 font-heading text-4xl tracking-tight">The page didn&apos;t open</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        The inventory book is still on this machine. Try the page again.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}
