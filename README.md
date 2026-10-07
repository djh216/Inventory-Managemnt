# Marlow & Vine

Inventory desk for a Northern California wine distributor. The sample company buys from estates and sells by the case to restaurants and retailers. The book tracks what is on the floor, what is held for an account, and what is still free to sell.

Three houses are on the book:

- Oakland Bonded, the main warehouse
- Napa Cold Room, for whites and anything that should stay cold
- Fillmore Will-Call, the San Francisco pickup cage

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

The first launch writes a sample cellar to `data/books.json`. That file stays on the machine and is not committed. Postings, new wines, and reorder points are saved there. **Restore sample** in the sidebar puts the original cellar back.

## What you can do

- Read the morning desk: cases on the floor, free to sell, value, and lines under their reorder point.
- Search the catalog by producer, cuvée, SKU, or appellation, and filter by color or country.
- Add a wine. An opening count posts as a receipt.
- Receive, ship, hold, release, transfer, and correct a count. A shipment can only take bottles that are free; held bottles stay until the hold is released.
- Read the ledger of recent postings. The floor count is the book balance. The ledger is the activity behind it, not a reconstruction from an empty warehouse.

Quantities are stored in bottles and shown in cases, using each wine’s case pack (12, or 6 for Champagne and Port).
