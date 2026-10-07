# Wine inventory desk

Live inventory for a wine distribution operation, built on **Cursor Initial Inventory Upload 10.6.26.csv** (276 SKUs).

## What it does

1. **Live inventory** — on-hand, available, and committed bottles update as you post receipts, shipments, holds, and counts.
2. **Order tracking** — every **shipment** posting is a customer order. The **Orders** page lists outbound history. Upload a CSV on **Days on hand** to import historical orders (pace only — inventory is not reduced again).
3. **Days on hand** — over your chosen window (default **30 days**), average daily sales from uploaded orders plus shipments gives **days on hand** = available ÷ daily pace. The **Days on hand** dashboard shows **30 / 90 / 180** day cover columns.
4. **Days of supply / reorder** — same pace math powers reorder alerts on **Live inventory** when cover hits winery lead time.
5. **Reorder alerts** — when days remaining fall inside a wine’s **winery lead time**, the desk flags it and suggests a PO quantity to restore **target cover** (default 45 days). Use **Remove from alerts** for SKUs you don’t reorder (discontinued, direct ship, etc.); restore them from the desk or catalog anytime.

### Order history CSV

Primary format: **Outfield Deals export** (`Outfield_Deals_Export-*.csv`) with columns **Lead Team Member**, **Account Name**, **Order Date**, **Line Item Product Variation Name**, **Line Item Quantity**. Product names must match the Oct 6 inventory **Label** column. Blank product rows (order headers) are skipped automatically.

A sample header is in `public/order-history-template.csv`. Simple CSVs with **SKU** (or Label), **Order Date**, and **Bottles** also work.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

## Cloud Agent environment

This **GitHub repository** is the source of truth for Cloud Agent setup. Configuration lives in [`.cursor/environment.json`](.cursor/environment.json):

- **install** — `npm ci`
- **start** — `bash .cursor/start-dev.sh` (Next.js dev server on port **4317** in tmux)

### Point Cursor at this GitHub repo (required)

The saved environment **`david-hall-dev/wine-inventory-system`** cannot be repointed from an agent session. To use **this GitHub repo** as the source of truth:

1. **Integrations** → confirm the **GitHub** app can access **`djh216/Inventory-Managemnt`**.
2. **Cloud Agents → Environments → New environment** → select **`github.com/dhj216/Inventory-Managemnt`** only (not `wine-inventory-system`).
3. Cursor should pick up **`.cursor/environment.json`** from the repo (committed config overrides dashboard overrides).
4. **Trigger build** on **`main`**, then **activate** that build.
5. Start new agents from **Inventory-Managemnt** on GitHub, not the old Origin-only environment.

Optional: [Sync from GitHub](https://cursor.com/docs/origin/mirror-github) at cursor.com/codebase if you also want an Origin mirror; GitHub remains the source of truth.

Data lives in `data/books.json` (local). The baseline upload is `data/inventory-upload.csv`. **Restore upload** re-imports the CSV.

## Workflow

1. Start from the upload (or post **Receive** when a winery PO lands).
2. Upload **order history** on **Days on hand** (or post **Ship** as new orders go out).
3. Review **Days on hand** for cover by SKU; open **Live inventory** for winery reorder alerts.
4. In the catalog, open a wine and set **Winery partner**, **Lead time**, and **Target cover** if defaults are wrong.

## Tests

```bash
npx tsc --noEmit
npx eslint app components lib --max-warnings 0
npx tsx --test lib/csv-import.test.ts lib/posting.test.ts lib/supply.test.ts lib/order-history-import.test.ts
```
