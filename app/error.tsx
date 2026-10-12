"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <h2 className="font-heading text-2xl tracking-tight">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The page failed to render. Try again, or restart the dev server if you are running locally.
      </p>
      <Button type="button" className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}
