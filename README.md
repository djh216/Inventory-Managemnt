# Wine inventory desk

Live inventory for a wine distribution operation, built on **Cursor Initial Inventory Upload 10.6.26.csv** (276 SKUs).

## What it does

1. **Live inventory** — on-hand, available, and committed bottles update as you post receipts, shipments, holds, and counts.
2. **Order tracking** — every **shipment** posting is a customer order. The **Orders** page lists outbound history.
3. **Days of supply** — over the last **28 days**, the app calculates average daily depletion from shipments and estimates **days remaining** = available ÷ daily rate.
4. **Reorder alerts** — when days remaining fall inside a wine’s **winery lead time**, the desk flags it and suggests a PO quantity to restore **target cover** (default 45 days). Use **Remove from alerts** for SKUs you don’t reorder (discontinued, direct ship, etc.); restore them from the desk or catalog anytime.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Data lives in `data/books.json` (local). The baseline upload is `data/inventory-upload.csv`. **Restore upload** re-imports the CSV.

## Workflow

1. Start from the upload (or post **Receive** when a winery PO lands).
2. Post **Ship** when you fulfill customer orders — this drives velocity and alerts.
3. Open **Live inventory** for reorder alerts grouped by urgency and winery partner.
4. In the catalog, open a wine and set **Winery partner**, **Lead time**, and **Target cover** if defaults are wrong.

## Tests

```bash
npx tsc --noEmit
npx eslint app components lib --max-warnings 0
npx tsx --test lib/csv-import.test.ts lib/posting.test.ts lib/supply.test.ts
```
