/**
 * Tab 2 — Vehicle Operations: stats from auction `LotSummaryDTO` / `AuctionResultDTO` and
 * billing `BillLineItemDTO` (weight + presetApplied). RD card gated by `trader.preset_enabled` (see AuctionsPage).
 * TODO(merco): if auction results for older days exceed `fetchAllAuctionResults` cap, add server filter by vehicleId;
 * same for billing pagination when many bills.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cog, Info, MapPin, Package, Settings2, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { ArrivalFullDetail, ArrivalSummary } from '@/services/api/arrivals';
import { arrivalsApi } from '@/services/api';
import { VehicleOpsSellerWorkspace } from '@/components/summary/vehicle-ops/VehicleOpsSellerWorkspace';
import { auctionApi, type LotSummaryDTO, fetchAllAuctionResults } from '@/services/api/auction';
import { billingApi } from '@/services/api/billing';
import type { AuctionResultDTO } from '@/services/api/auction';
import type { SalesBillDTO } from '@/services/api/billing';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const BILLING_RD_ACTUAL_DIVISOR_KG = 1000; // line weights in kg; divide for t-scale display — confirm vs product
const MAX_BILLING_PAGES = 6;
const BILLS_PAGE_SIZE = 100;

const LOTS_LOAD_USER_MSG = 'Bag totals could not be loaded.';
const AUCTION_RD_USER_MSG = 'Estimated rate difference could not be loaded.';

const RD_EST_FORMULA_TOOLTIP =
  'Estimated RD: sum of (preset applied × quantity) for each auction result entry for this vehicle.';

const RD_ACTUAL_FORMULA_TOOLTIP =
  `Actual RD: sum of (preset applied × billed line weight) for this arrival’s lots, divided by ${BILLING_RD_ACTUAL_DIVISOR_KG} (billed weights in kg). ` +
  'If no billed weight, the raw sum may be shown.';

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function collectLotIdKeys(detail: ArrivalFullDetail | null): Set<string> {
  const s = new Set<string>();
  if (!detail) return s;
  for (const se of detail.sellers ?? []) {
    for (const l of se.lots ?? []) {
      if (l.id != null) s.add(String(l.id));
    }
  }
  return s;
}

/** `AuctionResultDTO.sellerVehicleId` is SellerInVehicle id — match those for this vehicle’s lots, not the vehicle id. */
function sumEstimatedRdForSellerVehicles(
  results: AuctionResultDTO[],
  sellerVehicleIds: Set<number>,
): number {
  if (sellerVehicleIds.size === 0) return 0;
  const rows = results.filter((r) => sellerVehicleIds.has(r.sellerVehicleId));
  let sum = 0;
  for (const r of rows) {
    for (const e of r.entries ?? []) {
      const p = e.presetApplied;
      if (p == null || p === 0) continue;
      const q = e.quantity ?? 0;
      sum += p * q;
    }
  }
  return sum;
}

function aggregateBillingPresetWeightForLots(
  bills: SalesBillDTO[],
  lotIdSet: Set<string>,
): { weightedPresetSum: number; totalBilledWeight: number } {
  let weightedPresetSum = 0;
  let totalBilledWeight = 0;
  for (const b of bills) {
    for (const g of b.commodityGroups ?? []) {
      for (const line of g.items ?? []) {
        const lid = line.lotId;
        if (lid == null || !lotIdSet.has(String(lid))) continue;
        const w = line.weight ?? 0;
        const p = line.presetApplied;
        if (p == null || w === 0) continue;
        const prod = p * w;
        weightedPresetSum += prod;
        totalBilledWeight += w;
      }
    }
  }
  return { weightedPresetSum, totalBilledWeight };
}

type Props = {
  arrival: ArrivalSummary;
  isDesktop: boolean;
  onBack: () => void;
};

const cardTitleRowClass =
  'mb-2 flex justify-center items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

const SummaryVehicleOperationsView = ({ arrival, isDesktop, onBack }: Props) => {
  const { trader } = useAuth();
  const canShowRd = trader?.preset_enabled !== false;

  const [allLots, setAllLots] = useState<LotSummaryDTO[]>([]);
  const [auctionErr, setAuctionErr] = useState(false);
  const [lotErr, setLotErr] = useState(false);
  const [rdEst, setRdEst] = useState<number | null>(null);
  const [rdActual, setRdActual] = useState<number | null>(null);
  const [billingUnbounded, setBillingUnbounded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [arrivalFullDetail, setArrivalFullDetail] = useState<ArrivalFullDetail | null>(null);

  const vid = arrival.vehicleId;

  /** `seller_vehicle_id` on lots is the SellerInVehicle row id, not the vehicle id — match by vehicle number. */
  const lotRows = useMemo(() => {
    const n = (arrival.vehicleNumber ?? '').trim().toLowerCase();
    if (!n) return [];
    return allLots.filter((l) => (l.vehicle_number ?? '').trim().toLowerCase() === n);
  }, [allLots, arrival.vehicleNumber]);

  const bagBlock = useMemo(() => {
    const soldBags = lotRows.reduce((s, l) => s + (l.sold_bags ?? 0), 0);
    const pendingBags = Math.max(
      0,
      lotRows.reduce((s, l) => s + Math.max(0, l.bag_count - (l.sold_bags ?? 0)), 0),
    );
    return { soldBags, pendingBags };
  }, [lotRows]);

  const fromLabel = arrival.godown?.trim() || arrival.origin?.trim() || '—';

  const runLoad = useCallback(async () => {
    setLoading(true);
    setAuctionErr(false);
    setLotErr(false);
    setBillingUnbounded(false);
    setRdEst(null);
    setRdActual(null);

    const detail = (await arrivalsApi.getById(vid).catch(() => null)) as ArrivalFullDetail | null;
    setArrivalFullDetail(detail);
    const lotKeys = collectLotIdKeys(detail);

    let lotsList: LotSummaryDTO[] = [];
    try {
      const res = await auctionApi.listLots({ size: 2000, sort: 'id,asc' });
      lotsList = Array.isArray(res) ? res : [];
      setAllLots(lotsList);
    } catch {
      setAllLots([]);
      setLotErr(true);
    }

    if (!canShowRd) {
      setLoading(false);
      return;
    }

    try {
      const results = await fetchAllAuctionResults(12, 100);
      const vn = (arrival.vehicleNumber ?? '').trim().toLowerCase();
      const forVehicle = vn
        ? lotsList.filter((l) => (l.vehicle_number ?? '').trim().toLowerCase() === vn)
        : [];
      const svIds = new Set(
        forVehicle
          .map((l) => Number(l.seller_vehicle_id))
          .filter((x) => !Number.isNaN(x) && x > 0),
      );
      setRdEst(svIds.size > 0 ? sumEstimatedRdForSellerVehicles(results, svIds) : 0);
    } catch {
      setAuctionErr(true);
    }

    try {
      if (lotKeys.size === 0) {
        setLoading(false);
        return;
      }

      const allBills: SalesBillDTO[] = [];
      for (let p = 0; p < MAX_BILLING_PAGES; p += 1) {
        const page = await billingApi.getPage({ page: p, size: BILLS_PAGE_SIZE, sort: 'billDate,desc' });
        allBills.push(...(page.content ?? []));
        if (page.content.length < BILLS_PAGE_SIZE) break;
        if (p === MAX_BILLING_PAGES - 1) {
          setBillingUnbounded(true);
        }
      }
      const { weightedPresetSum, totalBilledWeight } = aggregateBillingPresetWeightForLots(allBills, lotKeys);
      if (totalBilledWeight > 0) {
        setRdActual(weightedPresetSum / BILLING_RD_ACTUAL_DIVISOR_KG);
      } else {
        setRdActual(weightedPresetSum > 0 ? weightedPresetSum : null);
      }
    } catch {
      setRdActual(null);
    } finally {
      setLoading(false);
    }
  }, [canShowRd, vid, arrival.vehicleNumber]);

  useEffect(() => {
    setArrivalFullDetail(null);
  }, [vid]);

  useEffect(() => {
    void runLoad();
  }, [runLoad]);

  const statusLine = `Lot ${arrival.lotCount} · ${arrival.sellerCount} sellers · Vehicle operations`;
  const hero = (
    <div
      className={cn(
        'relative mb-4 overflow-hidden rounded-b-3xl bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 px-4 pb-6',
        isDesktop ? 'pt-4' : 'pt-[max(2rem,env(safe-area-inset-top))]',
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(123,97,255,0.2)_0%,transparent_40%)]" />
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 touch-manipulation backdrop-blur"
          aria-label="Back to summary"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-white">Vehicle {arrival.vehicleNumber}</h1>
          <p className="line-clamp-2 text-xs text-white/80">{statusLine}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur text-white">
          <Cog className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  const threeCards = (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="glass-card rounded-2xl border border-border/40 p-4 shadow-sm">
        <div className={cardTitleRowClass}>
          <Truck className="h-3.5 w-3.5 shrink-0" />
          Vehicle
        </div>
        <p className="text-sm font-bold text-foreground">#{arrival.vehicleNumber}</p>
        <p className="mt-1 flex min-w-0 items-start gap-1.5 text-sm text-foreground/90">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6075FF]" aria-hidden />
          <span className="min-w-0" title={fromLabel}>
            From: {fromLabel}
          </span>
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-border/40 p-4 shadow-sm">
        <div className={cardTitleRowClass}>
          <Package className="h-3.5 w-3.5 shrink-0" />
          Bag summary
        </div>
        {lotErr ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">{LOTS_LOAD_USER_MSG}</p>
        ) : (
          <p className="mt-2 text-center text-sm font-semibold tabular-nums text-foreground">
            {bagBlock.pendingBags} / {bagBlock.soldBags}
          </p>
        )}
      </div>

      {canShowRd ? (
        <div className="glass-card rounded-2xl border border-border/40 p-4 shadow-sm">
          <div className={cardTitleRowClass}>
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>Rate difference (preset)</span>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">…</p> : null}
          {auctionErr ? (
            <p className="mb-2 text-center text-sm text-muted-foreground">{AUCTION_RD_USER_MSG}</p>
          ) : null}
          {billingUnbounded ? (
            <p className="mb-2 text-center text-[11px] text-muted-foreground">
              Actual RD may be incomplete; try again after more billing is recorded.
            </p>
          ) : null}
          <div className="mt-1 space-y-2.5">
            <div className="flex w-full min-w-0 items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-muted-foreground">Estimated RD</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="How estimated RD is calculated"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left text-xs leading-snug">
                    {RD_EST_FORMULA_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="shrink-0 text-right font-medium tabular-nums text-foreground">
                {rdEst != null && !Number.isNaN(rdEst) ? formatInr(rdEst) : '—'}
              </span>
            </div>
            <div className="flex w-full min-w-0 items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-muted-foreground">Actual RD</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="How actual RD is calculated"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left text-xs leading-snug">
                    {RD_ACTUAL_FORMULA_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="shrink-0 text-right font-medium tabular-nums text-foreground">
                {rdActual != null && !Number.isNaN(rdActual) ? formatInr(rdActual) : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
      {!isDesktop ? hero : null}
      {isDesktop ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-10 w-fit shrink-0 gap-1.5 rounded-xl border-border/60"
            aria-label="Back to summary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Settings2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              Vehicle operations
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Vehicle {arrival.vehicleNumber}</p>
          </div>
        </div>
      ) : null}
      {threeCards}
      <VehicleOpsSellerWorkspace
        arrivalDetail={arrivalFullDetail}
        lotSummariesForVehicle={lotRows}
        detailLoading={loading && arrivalFullDetail == null}
      />
    </motion.div>
  );
};

export default SummaryVehicleOperationsView;
