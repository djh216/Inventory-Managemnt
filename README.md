# Wine inventory desk

Inventory management built around **Cursor Initial Inventory Upload 10.6.26.csv** (276 SKUs).

The upload columns map directly to the book:

| CSV column | In the app |
| --- | --- |
| Label | Full product name in the catalog |
| SKU | Product code (synthetic code if the file left SKU blank) |
| Quantity On Hand | Bottles on the floor |
| Quantity Available | Bottles free to sell |
| On hand − available | **Committed** (held) quantity |

All quantities are stored as **bottles**, matching the spreadsheet. The UI also shows case equivalents using each line’s case pack (usually 12; 3-packs use 3).

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

On first launch, the app imports `data/inventory-upload.csv` into `data/books.json` (local only, not committed). Postings and new wines are saved there. **Restore upload** in the sidebar re-imports the CSV and clears local postings.

## Sections

- **Desk** — totals for on hand, available, committed, and largest commitments from the upload.
- **Catalog** — search and filter the full label list; post receipts, shipments, holds, and counts.
- **Stock** — same quantities by warehouse (single **Main inventory** location from the upload).
- **Ledger** — activity after import (empty until you post).

## Replace the upload

Replace `data/inventory-upload.csv` with a new export using the same column headers, then click **Restore upload** or delete `data/books.json` and restart.

## Tests

```bash
npx tsc --noEmit
npx eslint app components lib --max-warnings 0
npx tsx --test lib/csv-import.test.ts lib/posting.test.ts
```
