import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ArrivalSellerFullDetail } from '@/services/api/arrivals';
import type { LotSummaryDTO } from '@/services/api/auction';
import { lotSummaryBelongsToSeller, sellerBagSoldPending, sellerKeyFromArrivalSeller } from './vehicleOpsUtils';

/** UI-only strip until backend exposes seller/lot pipeline status. */
export type PlaceholderStripKind = 'not_started' | 'in_progress' | 'completed';

// TODO(merco): Wire strip color to real seller/lot completion from server (not index/hash).
export function placeholderStripKind(index: number): PlaceholderStripKind {
  const r = (index * 17 + 3) % 3;
  if (r === 0) return 'not_started';
  if (r === 1) return 'in_progress';
  return 'completed';
}

const STRIP_CLASS: Record<PlaceholderStripKind, string> = {
  not_started: 'bg-rose-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-emerald-500',
};

export type SellerListSidebarProps = {
  sellers: ArrivalSellerFullDetail[];
  lotSummaries: LotSummaryDTO[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  /** Global index in filtered list for placeholder strip only */
  stripIndexOffset?: number;
};

export function SellerListSidebar({
  sellers,
  lotSummaries,
  selectedKey,
  onSelectKey,
  stripIndexOffset = 0,
}: SellerListSidebarProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="listbox"
      aria-label="Sellers on this vehicle"
      className={cn(
        'flex min-h-0 gap-2 pb-1 [-webkit-overflow-scrolling:touch]',
        /* Horizontal strip + touch pan for phone/tablet; vertical sidebar from lg (1024px) with VehicleOpsSellerWorkspace grid. */
        'touch-[pan-x_pan-y] overflow-x-auto no-scrollbar',
        'lg:flex-col lg:touch-auto lg:gap-2 lg:overflow-y-visible lg:overflow-x-visible lg:pb-0 lg:pr-1',
      )}
    >
      {sellers.map((seller, i) => {
        const key = sellerKeyFromArrivalSeller(seller);
        const lots = lotSummaries.filter((l) => lotSummaryBelongsToSeller(l, seller));
        const { sold, pending } = sellerBagSoldPending(lots);
        const name = (seller.sellerName ?? '').trim() || '—';
        const mark = (seller.sellerMark ?? '').trim() || '—';
        const selected = selectedKey === key;
        const strip = placeholderStripKind(i + stripIndexOffset);
        return (
          <button
            key={key}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelectKey(key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                const next = sellers[i + 1];
                if (next) {
                  const nk = sellerKeyFromArrivalSeller(next);
                  onSelectKey(nk);
                  itemRefs.current[i + 1]?.focus();
                }
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = sellers[i - 1];
                if (prev) {
                  const pk = sellerKeyFromArrivalSeller(prev);
                  onSelectKey(pk);
                  itemRefs.current[i - 1]?.focus();
                }
              }
            }}
            className={cn(
              'flex min-w-[220px] shrink-0 touch-manipulation rounded-2xl border text-left transition-colors lg:min-w-0',
              selected
                ? 'border-[#6075FF]/50 bg-violet-500/10 shadow-sm dark:bg-violet-500/15'
                : 'border-border/40 bg-white/80 hover:bg-muted/30 dark:bg-card/80',
            )}
          >
            <span className={cn('w-1.5 shrink-0 self-stretch rounded-l-2xl', STRIP_CLASS[strip])} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
              <span className="truncate text-sm font-semibold text-foreground">
                {name} / {mark}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Sold / Pending{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {sold} / {pending}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
