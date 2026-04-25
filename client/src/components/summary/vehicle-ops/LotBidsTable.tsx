import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Info, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ARRIVALS_TABLE_HEADER_GRADIENT } from '@/components/arrivals/arrivalsTableTokens';
import { auctionApi, type AuctionEntryDTO, type AuctionSessionDTO } from '@/services/api/auction';
import { cn } from '@/lib/utils';
import { vehicleOpsPrimaryBtnClass } from './vehicleOpsUi';

/** Display-only — matches `readOnlyLotInputClass` in SellerDetailPanel (dashed, muted). */
const readOnlyBidTextClass =
  'h-9 w-full min-w-0 cursor-default border-dashed bg-muted/25 text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0';
const readOnlyBidNumericClass = cn(readOnlyBidTextClass, 'text-right tabular-nums');

const REF_FORMULA_HINT =
  'Reference seller rate defaults to buyer rate − brokerage − preset. Edits are local until PATCH wiring (TODO).';

function roundDisplay(n: number): string {
  if (!Number.isFinite(n)) return '';
  const t = Math.round(n * 100) / 100;
  return String(t);
}

export type LotBidsTableProps = {
  lotId: number;
  session: AuctionSessionDTO | null;
  loading: boolean;
  error: string | null;
  onSessionUpdated: (s: AuctionSessionDTO) => void;
};

/** Form field label styling — matches Billing mobile line-item hints. */
function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

export function LotBidsTable({ lotId, session, loading, error, onSessionUpdated }: LotBidsTableProps) {
  const [draftByEntryId, setDraftByEntryId] = useState<Record<number, { ref: string; neu: string }>>({});
  const [deleteTarget, setDeleteTarget] = useState<AuctionEntryDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Buyer carousel below lg — scroll-snap + dots (BillingPage lot-item pattern). */
  const mobileBuyersCarouselRef = useRef<HTMLDivElement | null>(null);
  const [activeEntrySlide, setActiveEntrySlide] = useState(0);

  const entries = session?.entries ?? [];

  const entryIdsKey = useMemo(() => entries.map((e) => e.auction_entry_id).join(','), [entries]);

  useEffect(() => {
    setDraftByEntryId((prev) => {
      const next: Record<number, { ref: string; neu: string }> = {};
      for (const e of entries) {
        const id = e.auction_entry_id;
        const buyer = Number(e.buyer_rate ?? e.bid_rate ?? 0);
        const brokerage = Number(e.extra_rate ?? 0);
        const preset = Number(e.preset_margin ?? 0);
        const fromApi = e.seller_rate != null && Number.isFinite(Number(e.seller_rate)) ? Number(e.seller_rate) : null;
        const computed = buyer - brokerage - preset;
        const base = fromApi ?? computed;
        const existing = prev[id];
        next[id] = existing ?? { ref: roundDisplay(base), neu: roundDisplay(base) };
      }
      return next;
    });
  }, [entries]);

  useEffect(() => {
    setActiveEntrySlide(0);
    mobileBuyersCarouselRef.current?.scrollTo({ left: 0 });
  }, [lotId, entryIdsKey]);

  const handleBuyersCarouselScroll = useCallback(() => {
    const el = mobileBuyersCarouselRef.current;
    const n = entries.length;
    if (!el || n <= 0) return;
    const step = el.scrollWidth / n;
    if (step <= 0) return;
    const idx = Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / step)));
    setActiveEntrySlide(idx);
  }, [entries.length]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const updated = await auctionApi.deleteBid(lotId, deleteTarget.auction_entry_id);
      onSessionUpdated(updated);
      toast.success('Bid removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, lotId, onSessionUpdated]);

  const busy = loading || deleting;

  const footer = useMemo(
    () => (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn(vehicleOpsPrimaryBtnClass, 'rounded-xl')}
          disabled={busy}
          onClick={() => toast.message('Add bid', { description: 'Not wired from Summary vehicle ops yet.' })}
        >
          Add New Bid
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn(vehicleOpsPrimaryBtnClass, 'rounded-xl')}
          disabled={busy}
          onClick={() => {
            // TODO(merco): PATCH auctionApi.updateBid with mapped rate/preset when product confirms field mapping.
            toast.success('Saved locally', {
              description: 'Rate changes stay in this panel until API wiring is complete.',
            });
          }}
        >
          Save
        </Button>
      </div>
    ),
    [busy],
  );

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (loading && !session) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bids…
      </div>
    );
  }

  if (!session || entries.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No bids for this lot in the current session.</p>;
  }

  return (
    <div className="min-w-0">
      {/* Desktop: unchanged wide table from lg (1024px) — aligns with VehicleOps seller strip / lot carousel. */}
      <div className="hidden max-w-full overflow-x-auto rounded-xl border border-border/30 bg-background/40 lg:block">
        <Table className="min-w-[720px] text-xs sm:text-sm">
          <TableHeader>
            <TableRow
              className={cn(
                ARRIVALS_TABLE_HEADER_GRADIENT,
                'border-0 border-b border-white/25 shadow-[0_4px_12px_rgba(91,140,255,0.35)]',
                'hover:bg-[linear-gradient(90deg,#4B7CF3_0%,#5B8CFF_45%,#7B61FF_100%)] hover:brightness-[1.03]',
              )}
            >
              <TableHead className="whitespace-nowrap text-white/95 first:rounded-tl-xl">Mark</TableHead>
              <TableHead className="text-right text-white/95">Qty</TableHead>
              <TableHead className="text-right text-white/95">Buyer rate</TableHead>
              <TableHead className="text-right text-white/95">
                <span className="inline-flex items-center gap-1">
                  Ref seller rate
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        aria-label="Reference seller rate hint"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-left text-xs">
                      {REF_FORMULA_HINT}
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead className="text-right text-white/95">Brokerage</TableHead>
              <TableHead className="text-right text-white/95">Preset</TableHead>
              <TableHead className="text-right text-white/95">
                <span className="inline-flex items-center gap-1">
                  New seller rate
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        aria-label="New seller rate hint"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-left text-xs">
                      Proposed seller-side rate; local only until PATCH is wired.
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead className="w-12 text-center text-white/95 last:rounded-tr-xl"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const id = e.auction_entry_id;
              const buyerRate = Number(e.buyer_rate ?? e.bid_rate ?? 0);
              const brokerage = Number(e.extra_rate ?? 0);
              const preset = Number(e.preset_margin ?? 0);
              const draft = draftByEntryId[id] ?? { ref: roundDisplay(buyerRate - brokerage - preset), neu: roundDisplay(buyerRate - brokerage - preset) };
              return (
                <TableRow key={id} className="border-border/30">
                  <TableCell className="font-medium">{e.buyer_mark || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.quantity ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{roundDisplay(buyerRate)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      inputMode="decimal"
                      className="h-8 w-[5.5rem] rounded-lg border-border/50 text-right tabular-nums"
                      value={draft.ref}
                      aria-label={`Reference seller rate for ${e.buyer_mark}`}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setDraftByEntryId((p) => {
                          const cur = p[id] ?? { ref: draft.ref, neu: draft.neu };
                          return { ...p, [id]: { ...cur, ref: v } };
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">₹{roundDisplay(brokerage)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">₹{roundDisplay(preset)}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      inputMode="decimal"
                      className="h-8 w-[5.5rem] rounded-lg border-border/50 text-right tabular-nums"
                      value={draft.neu}
                      aria-label={`New seller rate for ${e.buyer_mark}`}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setDraftByEntryId((p) => {
                          const cur = p[id] ?? { ref: draft.ref, neu: draft.neu };
                          return { ...p, [id]: { ...cur, neu: v } };
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className={cn(
                        'inline-flex rounded-lg p-2 text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        busy && 'pointer-events-none opacity-50',
                      )}
                      aria-label={`Delete bid ${e.bid_number}`}
                      onClick={() => setDeleteTarget(e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="lg:hidden">
        {entries.length > 1 && (
          <div className="mb-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="Buyers in this lot">
            {entries.map((e, ei) => (
              <button
                key={`vehicle-ops-bid-dot-${e.auction_entry_id}`}
                type="button"
                role="tab"
                aria-selected={activeEntrySlide === ei}
                aria-label={`Go to buyer ${ei + 1}`}
                onClick={() => {
                  const el = mobileBuyersCarouselRef.current;
                  if (!el) return;
                  const left = (el.scrollWidth / entries.length) * ei;
                  el.scrollTo({ left, behavior: 'smooth' });
                }}
                className={cn(
                  'rounded-full transition-all bg-muted-foreground/40',
                  activeEntrySlide === ei ? 'h-2 w-4 bg-primary' : 'h-2 w-2',
                )}
              />
            ))}
          </div>
        )}
        <div
          ref={mobileBuyersCarouselRef}
          onScroll={handleBuyersCarouselScroll}
          className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] touch-[pan-x_pan-y] lg:touch-auto no-scrollbar snap-x snap-mandatory"
        >
          {entries.map((e) => {
            const id = e.auction_entry_id;
            const buyerRate = Number(e.buyer_rate ?? e.bid_rate ?? 0);
            const brokerage = Number(e.extra_rate ?? 0);
            const preset = Number(e.preset_margin ?? 0);
            const draft = draftByEntryId[id] ?? { ref: roundDisplay(buyerRate - brokerage - preset), neu: roundDisplay(buyerRate - brokerage - preset) };
            return (
              <div
                key={id}
                className="glass-card w-[calc(100%-0.1rem)] shrink-0 snap-start space-y-3 rounded-xl border border-border/50 bg-card/80 p-3 shadow-sm"
              >
                <div className="flex items-end justify-between gap-2 border-b border-border/30 pb-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <FieldLabel>Mark</FieldLabel>
                    <Input
                      readOnly
                      tabIndex={-1}
                      aria-readonly
                      value={e.buyer_mark || '—'}
                      className={readOnlyBidTextClass}
                    />
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'mb-0.5 inline-flex shrink-0 rounded-lg p-2 text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      busy && 'pointer-events-none opacity-50',
                    )}
                    aria-label={`Delete bid ${e.bid_number}`}
                    onClick={() => setDeleteTarget(e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1">
                    <FieldLabel>Qty</FieldLabel>
                    <Input
                      readOnly
                      tabIndex={-1}
                      aria-readonly
                      value={String(e.quantity ?? 0)}
                      className={readOnlyBidNumericClass}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <FieldLabel>Buyer rate (₹)</FieldLabel>
                    <Input
                      readOnly
                      tabIndex={-1}
                      aria-readonly
                      value={`₹${roundDisplay(buyerRate)}`}
                      className={readOnlyBidNumericClass}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <FieldLabel>Brokerage (₹)</FieldLabel>
                    <Input
                      readOnly
                      tabIndex={-1}
                      aria-readonly
                      value={`₹${roundDisplay(brokerage)}`}
                      className={readOnlyBidNumericClass}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <FieldLabel>Preset (₹)</FieldLabel>
                    <Input
                      readOnly
                      tabIndex={-1}
                      aria-readonly
                      value={`₹${roundDisplay(preset)}`}
                      className={readOnlyBidNumericClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <FieldLabel>Ref seller rate (₹)</FieldLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Reference seller rate hint"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-left text-xs">
                          {REF_FORMULA_HINT}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      inputMode="decimal"
                      className="h-10 w-full min-w-0 rounded-lg border-border/50 text-right tabular-nums text-sm"
                      value={draft.ref}
                      aria-label={`Reference seller rate for ${e.buyer_mark}`}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setDraftByEntryId((p) => {
                          const cur = p[id] ?? { ref: draft.ref, neu: draft.neu };
                          return { ...p, [id]: { ...cur, ref: v } };
                        });
                      }}
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <FieldLabel>New seller rate (₹)</FieldLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="New seller rate hint"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-left text-xs">
                          Proposed seller-side rate; local only until PATCH is wired.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      inputMode="decimal"
                      className="h-10 w-full min-w-0 rounded-lg border-border/50 text-right tabular-nums text-sm"
                      value={draft.neu}
                      aria-label={`New seller rate for ${e.buyer_mark}`}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        setDraftByEntryId((p) => {
                          const cur = p[id] ?? { ref: draft.ref, neu: draft.neu };
                          return { ...p, [id]: { ...cur, neu: v } };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {footer}

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this bid?"
        description="Removes the bid from the auction session for this lot."
        onConfirm={handleDelete}
      />
    </div>
  );
}
