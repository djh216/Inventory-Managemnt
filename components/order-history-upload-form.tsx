import { importOrderHistoryCsvForm } from "@/lib/actions"

export function OrderHistoryUploadForm() {
  return (
    <form action={importOrderHistoryCsvForm} encType="multipart/form-data" className="flex min-w-0 flex-col gap-2">
      <label className="flex min-h-16 cursor-pointer flex-col justify-center rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 hover:bg-sidebar-accent/70">
        <span className="text-xs text-sidebar-foreground">Choose CSV or drop in file picker</span>
        <span className="mt-0.5 text-[10px] text-sidebar-foreground/55">Outfield export or SKU · date · bottles</span>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="mt-2 max-w-full text-[11px] text-sidebar-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-[10px] file:text-primary-foreground"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
      >
        Upload orders
      </button>
    </form>
  )
}
