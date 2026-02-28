import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShoppingBag, Search, Package, Truck, User, Hash,
  Check, DollarSign, Tag, AlertTriangle, Sun, TrendingUp, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { selfSaleApi, type OpenLotDTO, type ClosureDTO } from '@/services/api';

/** UI shape for an open lot (derived from OpenLotDTO). */
interface LotInfo {
  lot_id: string;
  lot_name: string;
  bag_count: number;
  commodity_name: string;
  seller_name: string;
  seller_mark: string;
  vehicle_number: string;
  status: 'OPEN' | 'CLOSED';
}

function openLotToLotInfo(d: OpenLotDTO): LotInfo {
  return {
    lot_id: String(d.lotId),
    lot_name: d.lotName,
    bag_count: d.bagCount,
    commodity_name: d.commodityName,
    seller_name: d.sellerName,
    seller_mark: d.sellerMark ?? '',
    vehicle_number: d.vehicleNumber,
    status: 'OPEN',
  };
}

const SelfSalePage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [lots, setLots] = useState<LotInfo[]>([]);
  const [openLotsLoading, setOpenLotsLoading] = useState(true);
  const [openLotsError, setOpenLotsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedLot, setSelectedLot] = useState<LotInfo | null>(null);
  const [rate, setRate] = useState('');
  const [mode, setMode] = useState<'COMMISSION' | 'TRADING'>('COMMISSION');
  const [showConfirm, setShowConfirm] = useState(false);
  const [records, setRecords] = useState<ClosureDTO[]>([]);
  const [closuresPage, setClosuresPage] = useState(0);
  const [closuresTotal, setClosuresTotal] = useState(0);
  const [closuresLoading, setClosuresLoading] = useState(true);
  const [closuresError, setClosuresError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadOpenLots = useCallback(async () => {
    setOpenLotsLoading(true);
    setOpenLotsError(null);
    try {
      const { content } = await selfSaleApi.getOpenLots({ page: 0, size: 100, search: searchInput || undefined });
      setLots(content.map(openLotToLotInfo));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load open lots';
      setOpenLotsError(msg);
      setLots([]);
      toast.error(msg);
    } finally {
      setOpenLotsLoading(false);
    }
  }, [searchInput]);

  const loadClosures = useCallback(async () => {
    setClosuresLoading(true);
    setClosuresError(null);
    try {
      const { content, totalElements } = await selfSaleApi.getClosures({ page: closuresPage, size: 10 });
      setRecords(content);
      setClosuresTotal(totalElements);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load closed self-sales';
      setClosuresError(msg);
      setRecords([]);
      toast.error(msg);
    } finally {
      setClosuresLoading(false);
    }
  }, [closuresPage]);

  useEffect(() => {
    loadOpenLots();
  }, [loadOpenLots]);

  useEffect(() => {
    loadClosures();
  }, [loadClosures]);

  // Debounce search -> loadOpenLots
  useEffect(() => {
    const t = setTimeout(() => setSearchInput(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => lots, [lots]);

  const handleCloseLot = async () => {
    if (!selectedLot || !rate) return;
    const r = parseFloat(rate);
    if (r <= 0) return;
    setSubmitting(true);
    try {
      await selfSaleApi.createClosure({
        lotId: Number(selectedLot.lot_id),
        rate: r,
        mode,
      });
      toast.success(`Lot ${selectedLot.lot_name} closed as self-sale at ₹${r}`);
      setShowConfirm(false);
      setSelectedLot(null);
      setRate('');
      loadOpenLots();
      loadClosures();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create self-sale closure';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = useMemo(() => records.reduce((s, r) => s + r.amount, 0), [records]);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {/* Mobile Header — warm amber/orange gradient */}
      {!isDesktop && (
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
          <div className="absolute top-4 right-4 opacity-10">
            <Sun className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Self-Sale
                </h1>
                <p className="text-white/80 text-xs font-medium">Close lots within your entity</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Open Lots</p>
                <p className="text-white text-lg font-bold">{filtered.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Total Sold</p>
                <p className="text-white text-lg font-bold">₹{totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input aria-label="Search" placeholder="Search lot, seller, commodity…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur-md text-white placeholder:text-white/50 text-sm font-medium border border-white/20 focus:outline-none focus:border-white/40 transition-colors" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 pt-6 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search lots by name, seller, commodity…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11" />
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">{filtered.length} open</span>
            </div>
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className={cn("px-4 space-y-3", isDesktop ? "lg:px-8" : "mt-4")}>
        {/* Section Label */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Open Lots</h2>
          <span className="ml-auto text-xs font-medium text-muted-foreground">Tap to close as self-sale</span>
        </div>

        {/* Open Lots */}
        {openLotsLoading ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading open lots…</p>
          </div>
        ) : openLotsError ? (
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-destructive font-medium">{openLotsError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => loadOpenLots()}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 mx-auto mb-4 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No Open Lots Available</p>
            <p className="text-xs text-muted-foreground">Create arrivals first, then come back to close lots via self-sale</p>
          </div>
        ) : (
          <div className={cn("grid gap-3", isDesktop ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {filtered.map((lot, i) => (
              <motion.div key={lot.lot_id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-4 cursor-pointer border-l-4 border-l-amber-400 hover:shadow-lg hover:border-l-orange-500 transition-all active:scale-[0.98]"
                onClick={() => { setSelectedLot(lot); setShowConfirm(true); }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{lot.lot_name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{lot.commodity_name} · <span className="text-amber-600 dark:text-amber-400 font-semibold">{lot.bag_count} bags</span></p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 bg-muted/50 rounded-md px-2 py-0.5"><User className="w-3 h-3" /> {lot.seller_name}</span>
                  <span className="inline-flex items-center gap-1 bg-muted/50 rounded-md px-2 py-0.5"><Truck className="w-3 h-3" /> {lot.vehicle_number}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Closed Self-Sales History */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Closed Self-Sales</h3>
            {!closuresLoading && <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">{closuresTotal} entries</span>}
          </div>
          {closuresLoading ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
              <p className="text-xs text-muted-foreground mt-1">Loading…</p>
            </div>
          ) : closuresError ? (
            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-sm text-destructive">{closuresError}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => loadClosures()}>Retry</Button>
            </div>
          ) : records.length > 0 ? (
            isDesktop ? (
              <div className="glass-card rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-border/50">
                      <th className="text-left p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Lot</th>
                      <th className="text-left p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Commodity</th>
                      <th className="text-left p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Seller</th>
                      <th className="text-right p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Rate</th>
                      <th className="text-right p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Qty</th>
                      <th className="text-right p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Amount</th>
                      <th className="text-center p-3 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-amber-50/30 dark:hover:bg-amber-900/5 transition-colors">
                        <td className="p-3 font-semibold">{r.lotName}</td>
                        <td className="p-3 text-muted-foreground">{r.commodityName}</td>
                        <td className="p-3 text-muted-foreground">{r.sellerName}</td>
                        <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400">₹{r.rate}</td>
                        <td className="p-3 text-right">{r.quantity}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{Number(r.amount).toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold",
                            r.mode === 'COMMISSION' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          )}>{r.mode}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map(r => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="glass-card rounded-xl p-3 border-l-4 border-l-emerald-400">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{r.lotName}</p>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold",
                        r.mode === 'COMMISSION' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      )}>{r.mode}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.commodityName} · {r.sellerName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{r.quantity} bags × ₹{r.rate}</span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">₹{Number(r.amount).toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground">No closed self-sales yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Self-Sale Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className={cn("sm:max-w-md", isDesktop && "glass-card")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              Close Lot — Self-Sale
            </DialogTitle>
            <DialogDescription>
              Apply base rate and close <span className="font-semibold text-foreground">{selectedLot?.lot_name}</span> ({selectedLot?.bag_count} bags of {selectedLot?.commodity_name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5 block uppercase tracking-wide">Base Rate (₹ per unit)</label>
              <Input type="number" placeholder="Enter rate per unit" value={rate} onChange={e => setRate(e.target.value)}
                className="text-xl font-bold h-14 text-center border-2 border-amber-200 dark:border-amber-800 focus:border-amber-400" autoFocus />
            </div>

            <div>
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 block uppercase tracking-wide">Business Mode</label>
              <div className="flex gap-2">
                {(['COMMISSION', 'TRADING'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn("flex-1 py-3.5 rounded-xl text-sm font-bold transition-all",
                      mode === m
                        ? m === 'COMMISSION'
                          ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg'
                          : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'
                    )}>
                    {m === 'COMMISSION' ? '📊 Commission' : '🛒 Trading'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/30 rounded-lg px-3 py-1.5">
                {mode === 'COMMISSION' ? '💡 Revenue recognized as commission income' : '💡 Revenue recognized as sale proceeds'}
              </p>
            </div>

            {rate && selectedLot && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Lot Identity</span>
                  <span className="font-bold text-sm">{selectedLot.lot_name} {'{'}₹{rate}{'}'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Total Amount</span>
                  <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">₹{(parseFloat(rate) * selectedLot.bag_count).toLocaleString()}</span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1 h-12 text-base" disabled={submitting}>Cancel</Button>
            <Button onClick={handleCloseLot} disabled={!rate || parseFloat(rate) <= 0 || submitting}
              className="flex-1 h-12 text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg">
              {submitting ? <Loader2 className="w-5 h-5 mr-1.5 animate-spin" /> : <Check className="w-5 h-5 mr-1.5" />}
              {submitting ? 'Closing…' : 'Close Lot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SelfSalePage;
