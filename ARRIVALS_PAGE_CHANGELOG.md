# ArrivalsPage — Mock Data Removal & Real Backend Integration

## Summary

All mock/hardcoded data on the ArrivalsPage has been removed. The page now fetches every piece of data (stat cards, arrivals table rows, seller cards, lot cards) from real backend APIs. No new APIs were created — the existing endpoints already provided everything needed.

---

## Files Changed

### 1. Backend — `server/src/main/java/com/mercotrace/service/dto/ArrivalDTOs.java`

**What changed:** Added two optional fields to `ArrivalSellerDetailDTO`:

| Field        | Type   | Description                                   |
|------------- |--------|-----------------------------------------------|
| `contactId`  | `Long` | The seller's contact ID (for cross-referencing)|
| `origin`     | `String` | The seller's address/city (from Contact record)|

These fields are **additive** — existing consumers that do not read them are unaffected.

### 2. Backend — `server/src/main/java/com/mercotrace/service/ArrivalService.java`

**What changed:** In `listArrivalsDetail()`:

- Replaced the simple `contactNameById` string map with a `contactById` map that holds the full `Contact` object.
- Now populates `contactId` and `origin` on each `ArrivalSellerDetailDTO`:
  - `contactId` = `SellerInVehicle.getContactId()`
  - `origin` = `contact.getAddress()` (or empty string if null)

### 3. Frontend — `client/src/services/api/arrivals.ts`

**What changed:** Extended the `ArrivalSellerDetail` TypeScript interface:

```typescript
export interface ArrivalSellerDetail {
  sellerName: string;
  contactId?: number;   // NEW — optional
  origin?: string;      // NEW — optional
  lots: ArrivalLotDetail[];
}
```

### 4. Frontend — `client/src/pages/ArrivalsPage.tsx`

This is the main file with significant changes. Here is exactly what was done:

#### Removed (mock/dead code)

| Item | Description |
|------|-------------|
| `isDevMock` variable | The `?mock=1` query parameter detection and all conditional branches |
| Mock arrivals array | Hardcoded `DEV-1`, `DEV-2` vehicles with fake weights, seller counts |
| Mock contacts array | Hardcoded `Ramesh Kumar` / `Suresh Patil` with fake phones and addresses |
| Mock commodities array | Hardcoded `Onion A-Grade` / `Onion B-Grade` |
| Mock submit shortcircuit | The `if (isDevMock)` block in `handleSubmitArrival` that created fake `ArrivalSummary` objects |
| Mock table fallbacks | `sellerFallback`, `fromFallback`, `bidsFallback`, `weighedFallback`, `statusFallback` — all index-based hardcoded values |
| Mock sellers view | Hardcoded seller names/origins in the sellers tab |
| Mock lots view | Hardcoded `LOT-001`, `LOT-002` names and `#102`, `#103` IDs |
| Rename-lot modal | Entire `AnimatePresence` modal for renaming lots (was only usable with mock lot indices) |
| Rename-lot state | `renameLotIndex`, `renameLotValue`, `renamedLots` state variables |
| Unused icon imports | `Pencil`, `AlertTriangle`, `ChevronDown`, `ChevronUp`, `Tags` |
| Unused type import | `AuctionResultDTO` (the hook handles typing internally) |

#### Added (real data integration)

| Item | Description |
|------|-------------|
| `arrivalDetails` state | Holds `ArrivalDetail[]` from `arrivalsApi.listDetail()` with seller names, origins, and lot IDs |
| `weighingSessions` state | Holds `WeighingSessionDTO[]` from `weighingApi.list()` for determining weighed lots |
| `useAuctionResults()` hook | Fetches auction results to determine which lots have bids |
| `ArrivalMeta` interface | Per-arrival computed data: seller name, origin, bids count, weighed count, status |
| `arrivalMetaByVehicleId` memo | Cross-references arrivals + details + auctions + weighing to build real metrics per vehicle |
| `statusCounts` memo | Real counts of `Pending`, `Bids Created`, `Weighed` arrivals for filter chips |
| Real search/filter | `filteredArrivals` now searches against real seller names and origins, filters by real computed status |
| Real table rendering | Each table row shows real seller (with `+N more`), origin, bid count, weighed count, and computed status |
| Real sellers view | Flattens `arrivalDetails.sellers` to show actual seller cards with real names, origins, lot info |
| Real lots view | Flattens all lots across all arrivals to show real lot names, IDs, seller names, and origins |
| `Weighed` status | New status badge (green) for arrivals where all lots have been weighed |
| Post-submit detail refresh | After creating an arrival, `arrivalsApi.listDetail()` is re-fetched so the summary stays current |

---

## APIs Used (no new endpoints created)

All data comes from **existing** backend APIs. No new REST endpoints were added.

### Existing Endpoints Consumed by ArrivalsPage

#### 1. `GET /api/arrivals` — Arrival Summaries (paginated)

Returns a list of `ArrivalSummaryDTO` objects.

| Field               | Type      | Description                           |
|---------------------|-----------|---------------------------------------|
| `vehicleId`         | `Long`    | Vehicle primary key                   |
| `vehicleNumber`     | `String`  | Vehicle registration number           |
| `sellerCount`       | `int`     | Number of sellers in this arrival     |
| `lotCount`          | `int`     | Number of lots in this arrival        |
| `netWeight`         | `double`  | Net weight (loaded - empty) in kg     |
| `finalBillableWeight` | `double` | Billable weight (net - deducted) in kg|
| `freightTotal`      | `double`  | Total freight amount                  |
| `freightMethod`     | `String`  | `BY_WEIGHT`, `BY_COUNT`, `LUMPSUM`, `DIVIDE_BY_WEIGHT` |
| `arrivalDatetime`   | `Instant` | When the arrival was recorded         |

**Query params:** `page` (int), `size` (int)

**Example:** `GET /api/arrivals?page=0&size=100`

#### 2. `GET /api/arrivals/detail` — Arrival Details with Sellers & Lots (paginated)

Returns a list of `ArrivalDetailDTO` objects with nested sellers and lots.

| Field                         | Type     | Description                                    |
|-------------------------------|----------|------------------------------------------------|
| `vehicleId`                   | `Long`   | Vehicle primary key                            |
| `vehicleNumber`               | `String` | Vehicle registration number                    |
| `arrivalDatetime`             | `Instant`| When the arrival was recorded                  |
| `sellers[].sellerName`        | `String` | Seller's name from Contact                     |
| `sellers[].contactId`         | `Long`   | Seller's contact ID **(newly exposed)**        |
| `sellers[].origin`            | `String` | Seller's address/city **(newly exposed)**      |
| `sellers[].lots[].id`         | `Long`   | Lot primary key                                |
| `sellers[].lots[].lotName`    | `String` | Lot name                                       |

**Query params:** `page` (int), `size` (int)

**Example:** `GET /api/arrivals/detail?page=0&size=500`

#### 3. `GET /api/module-auctions/results` — Auction Results (paginated)

Returns `AuctionResultDTO[]`. Used to determine which lots have bids.

| Field                    | Type      | Description                     |
|--------------------------|-----------|---------------------------------|
| `lotId`                  | `Long`    | The lot that was auctioned      |
| `entries[].bidNumber`    | `int`     | Unique bid number               |
| `entries[].buyerMark`    | `String`  | Buyer identifier mark           |

**Example:** `GET /api/module-auctions/results?page=0&size=100`

#### 4. `GET /api/weighing-sessions` — Weighing Sessions (paginated)

Returns `WeighingSessionDTO[]`. Used to determine which lots have been weighed.

| Field         | Type   | Description                    |
|---------------|--------|--------------------------------|
| `lot_id`      | `Long` | The lot that was weighed       |
| `bid_number`  | `int`  | Associated bid number          |
| `net_weight`  | `double`| Net weight after deductions   |

**Example:** `GET /api/weighing-sessions?page=0&size=2000`

#### 5. `POST /api/arrivals` — Create Arrival (unchanged)

Creates a new arrival with vehicle, sellers, lots, freight. Body is `ArrivalRequestDTO`. No changes to this endpoint.

---

## How Real Data Flows Through the UI

### Stat Cards (Total Vehicles / Sellers / Lots / Weight)

| Card            | Data Source                                          |
|-----------------|------------------------------------------------------|
| Total Vehicles  | `apiArrivals.length` from `GET /api/arrivals`        |
| Total Sellers   | Sum of `sellerCount` from each `ArrivalSummary`      |
| Total Lots      | Sum of `lotCount` from each `ArrivalSummary`         |
| Total Weight    | Sum of `netWeight` from each `ArrivalSummary` / 1000 (tons) |

### Arrivals Table Columns

| Column   | Data Source                                                           |
|----------|-----------------------------------------------------------------------|
| Vehicle  | `ArrivalSummary.vehicleNumber`                                        |
| Seller   | First seller name from `ArrivalDetail.sellers[0].sellerName` + `+N more` if multiple |
| From     | First seller's `origin` from `ArrivalDetail.sellers[0].origin`        |
| Lots     | Count of lot IDs from `ArrivalDetail.sellers[].lots[]`                |
| Bids     | Count of lots that appear in `AuctionResultDTO[]` (by lot ID match)   |
| Weighed  | Count of lots that appear in `WeighingSessionDTO[]` (by lot_id match) |
| Status   | Computed: `Pending` (0 bids) / `Bids Created` (has bids, not all weighed) / `Weighed` (all lots weighed) |
| Date     | `ArrivalSummary.arrivalDatetime` formatted as locale date             |

### Status Computation Logic

```
if (bidsCount === 0)                                    → "Pending"
if (bidsCount > 0 && weighedCount < lotCount)           → "Bids Created"
if (bidsCount > 0 && weighedCount >= lotCount && lotCount > 0) → "Weighed"
```

---

## Impact on Other Pages

| Page           | Impact | Reason |
|----------------|--------|--------|
| LogisticsPage  | None   | Uses `arrivalsApi.listDetail()` — only reads `sellerName` and `lots[].id` |
| WeighingPage   | None   | Uses `arrivalsApi.listDetail()` — only reads `sellerName` and `lots[].id` |
| BillingPage    | None   | Uses `arrivalsApi.listDetail()` — only reads `sellerName` and `lots[].id` |
| PrintsPage     | None   | Uses `arrivalsApi.listDetail()` — only reads `sellerName` and `lots[].id` |
| All other pages| None   | No arrivals API dependency                                                |

The new `contactId` and `origin` fields on `ArrivalSellerDetailDTO` are **additive optional fields**. Existing consumers that don't read them are completely unaffected.
