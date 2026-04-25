import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Printer, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ArrivalSellerFullDetail } from '@/services/api/arrivals';
import type { AuctionSessionDTO, LotSummaryDTO } from '@/services/api/auction';
import { auctionApi } from '@/services/api/auction';
import { cn } from '@/lib/utils';
import { formatLotLabelFromSummary, sellerBagSoldPending, sellerKeyFromArrivalSeller } from './vehicleOpsUtils';
import { LotBidsTable } from './LotBidsTable';

export type SellerDetailPanelProps = {
  seller: ArrivalSellerFullDetail | null;
  /** Lots for this seller on the current vehicle (pre-filtered). */
  sellerLots: LotSummaryDTO[];
  onPrint: () => void;
};

type LotSessionState = {
  session: AuctionSessionDTO | null;
  loading: boolean;
  error: string | null;
};

export function SellerDetailPanel({ seller, sellerLots, onPrint }: SellerDetailPanelProps) {
  const [expandedLotId, setExpandedLotId] = useState<number | null>(null);
  const [sessionByLotId, setSessionByLotId] = useState<Record<number, LotSessionState>>({});

  const sortedLots = useMemo(
    () => [...sellerLots].sort((a, b) => (a.lot_id ?? 0) - (b.lot_id ?? 0)),
    [sellerLots],
  );

  const sellerKey = seller ? sellerKeyFromArrivalSeller(seller) : '';
  const firstLotId = sortedLots[0]?.lot_id ?? null;

  useEffect(() => {
    // Default UX: first lot expanded so bids are visible without an extra tap.
    setExpandedLotId(firstLotId);
    setSessionByLotId({});
  }, [sellerKey, firstLotId]);

  useEffect(() => {
    if (expandedLotId == null) return;
    const lotId = expandedLotId;
    let cancelled = false;

    setSessionByLotId((m) => {
      const cur = m[lotId];
      if (cur?.session && !cur.error) return m;
      if (cur?.loading) return m;
      return { ...m, [lotId]: { session: cur?.session ?? null, loading: true, error: null } };
    });

    void (async () => {
      try {
        const session = await auctionApi.getOrStartSession(lotId);
        if (cancelled) return;
        setSessionByLotId((m) => ({ ...m, [lotId]: { session, loading: false, error: null } }));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load session';
        setSessionByLotId((m) => ({ ...m, [lotId]: { session: null, loading: false, error: msg } }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expandedLotId]);

  const toggleLot = useCallback((lotId: number) => {
    setExpandedLotId((cur) => (cur === lotId ? null : lotId));
  }, []);

  const onSessionUpdated = useCallback((lotId: number, s: AuctionSessionDTO) => {
    setSessionByLotId((m) => ({ ...m, [lotId]: { session: s, loading: false, error: null } }));
  }, []);

  const soldPending = useMemo(() => sellerBagSoldPending(sellerLots), [sellerLots]);

  if (!seller) {
    return (
      <div className="glass-card flex min-h-[12rem] items-center justify-center rounded-2xl border border-border/40 p-8 text-sm text-muted-foreground">
        Select a seller to view lots and bids.
      </div>
    );
  }

  const name = (seller.sellerName ?? '').trim() || '—';
  const mark = (seller.sellerMark ?? '').trim() || '—';
  const serial = seller.sellerSerialNumber != null ? String(seller.sellerSerialNumber) : '—';

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3">
      <div className="glass-card flex flex-wrap items-center gap-3 rounded-2xl border border-border/40 p-4 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-600 dark:text-violet-300">
          <UserRound className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Seller serial <span className="font-semibold tabular-nums text-foreground">{serial}</span>
          </p>
          <p className="truncate text-base font-bold text-foreground">
            {name} / {mark}
          </p>
          <p className="text-xs text-muted-foreground">
            Sold / Pending bags{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {soldPending.sold} / {soldPending.pending}
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
          onClick={onPrint}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        {sortedLots.length === 0 ? (
          <div className="glass-card rounded-2xl border border-border/40 p-6 text-center text-sm text-muted-foreground">
            No auction lots matched this seller for this vehicle.
          </div>
        ) : (
          sortedLots.map((lot) => {
            const lid = lot.lot_id;
            const open = expandedLotId === lid;
            const st = sessionByLotId[lid];
            const sessionLoading = open && (st?.loading ?? st == null);
            const pendingBags =
              st?.session != null
                ? st.session.remaining_bags
                : Math.max(0, (lot.bag_count ?? 0) - (lot.sold_bags ?? 0));
            const label = formatLotLabelFromSummary(lot);
            return (
              <div
                key={lid}
                className="glass-card overflow-hidden rounded-2xl border border-border/40 shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6075FF]"
                  aria-expanded={open}
                  aria-controls={`lot-panel-${lid}`}
                  id={`lot-trigger-${lid}`}
                  onClick={() => toggleLot(lid)}
                >
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">#{lid}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{label}</span>
                  <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                    Pending bags for auction
                    <span className="rounded-md bg-background/80 px-1.5 py-0.5 tabular-nums text-foreground">{pendingBags}</span>
                  </span>
                  <span className="inline-flex shrink-0 sm:hidden">
                    <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
                      {pendingBags}
                    </span>
                  </span>
                  {open ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </button>
                <div
                  id={`lot-panel-${lid}`}
                  role="region"
                  aria-labelledby={`lot-trigger-${lid}`}
                  className={cn('border-t border-border/30 px-3 py-3', !open && 'hidden')}
                >
                  <p className="mb-2 text-[11px] text-muted-foreground sm:hidden">
                    Pending bags for auction:{' '}
                    <span className="font-semibold tabular-nums text-foreground">{pendingBags}</span>
                  </p>
                  <LotBidsTable
                    lotId={lid}
                    session={st?.session ?? null}
                    loading={sessionLoading}
                    error={st?.error ?? null}
                    onSessionUpdated={(s) => onSessionUpdated(lid, s)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
