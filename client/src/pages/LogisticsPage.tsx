import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Printer, Package, User, Truck, Hash, Search,
  StickyNote, ClipboardList, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

// ── localStorage helpers ──────────────────────────────────
function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// ── Types ─────────────────────────────────────────────────
interface BidInfo {
  bidNumber: number;
  buyerMark: string;
  buyerName: string;
  quantity: number;
  rate: number;
  lotId: string;
  lotName: string;
  sellerName: string;
  sellerSerial: number;
  lotNumber: number;
  vehicleNumber: string;
  commodityName: string;
}

// REQ-LOG-001: Daily seller serial (reset daily)
function getDailySellerSerial(sellerName: string): number {
  const today = new Date().toISOString().split('T')[0];
  const key = `mkt_seller_serials_${today}`;
  const serials: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
  if (serials[sellerName]) return serials[sellerName];
  const next = Object.keys(serials).length + 1;
  serials[sellerName] = next;
  localStorage.setItem(key, JSON.stringify(serials));
  return next;
}

// REQ-LOG-002: Daily lot number (reset daily)
function getDailyLotNumber(lotId: string): number {
  const today = new Date().toISOString().split('T')[0];
  const key = `mkt_lot_numbers_${today}`;
  const numbers: Record<string, number> = JSON.parse(localStorage.getItem(key) || '{}');
  if (numbers[lotId]) return numbers[lotId];
  const next = Object.keys(numbers).length + 1;
  numbers[lotId] = next;
  localStorage.setItem(key, JSON.stringify(numbers));
  return next;
}

const LogisticsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [bids, setBids] = useState<BidInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBid, setSelectedBid] = useState<BidInfo | null>(null);
  const [viewMode, setViewMode] = useState<'sticker' | 'chiti'>('sticker');

  // REQ-LOG-004: Load bids from completed auctions
  useEffect(() => {
    const auctionData = getStore<any>('mkt_auction_results');
    const arrivals = getStore<any>('mkt_arrival_records');

    const allBids: BidInfo[] = [];
    auctionData.forEach((auction: any) => {
      (auction.entries || []).forEach((entry: any) => {
        // Find lot info from arrivals
        let sellerName = auction.sellerName || 'Unknown';
        let vehicleNumber = auction.vehicleNumber || 'Unknown';
        let commodityName = auction.commodityName || '';
        let lotName = auction.lotName || '';

        // Try to enrich from arrivals
        arrivals.forEach((arr: any) => {
          (arr.sellers || []).forEach((seller: any) => {
            (seller.lots || []).forEach((lot: any) => {
              if (lot.lot_id === auction.lotId) {
                sellerName = seller.seller_name;
                vehicleNumber = arr.vehicle?.vehicle_number || vehicleNumber;
                commodityName = lot.commodity_name || commodityName;
                lotName = lot.lot_name || lotName;
              }
            });
          });
        });

        allBids.push({
          bidNumber: entry.bidNumber,
          buyerMark: entry.buyerMark,
          buyerName: entry.buyerName,
          quantity: entry.quantity,
          rate: entry.rate,
          lotId: auction.lotId,
          lotName,
          sellerName,
          sellerSerial: getDailySellerSerial(sellerName),
          lotNumber: getDailyLotNumber(auction.lotId),
          vehicleNumber,
          commodityName,
        });
      });
    });
    setBids(allBids);
  }, []);

  const filteredBids = useMemo(() => {
    if (!searchQuery) return bids;
    const q = searchQuery.toLowerCase();
    return bids.filter(b =>
      b.buyerMark.toLowerCase().includes(q) ||
      b.buyerName.toLowerCase().includes(q) ||
      b.sellerName.toLowerCase().includes(q) ||
      b.lotName.toLowerCase().includes(q) ||
      b.vehicleNumber.toLowerCase().includes(q) ||
      String(b.bidNumber).includes(q)
    );
  }, [bids, searchQuery]);

  const handlePrint = (bid: BidInfo, type: 'sticker' | 'chiti') => {
    setSelectedBid(bid);
    setViewMode(type);
  };

  // ═══ STICKER / CHITI PREVIEW ═══
  if (selectedBid) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
        {!isDesktop ? (
        <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBid(null)} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  {viewMode === 'sticker' ? 'Print Sticker' : 'Print Chiti'}
                </h1>
                <p className="text-white/70 text-xs">Bid #{selectedBid.bidNumber} Preview</p>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-500" />
                {viewMode === 'sticker' ? 'Print Sticker' : 'Print Chiti'}
              </h2>
              <p className="text-sm text-muted-foreground">Bid #{selectedBid.bidNumber} Preview</p>
            </div>
            <Button onClick={() => setSelectedBid(null)} variant="outline" className="rounded-xl">
              ← Back to List
            </Button>
          </div>
        )}

        <div className="px-4 mt-6 space-y-4">
          {/* Toggle Sticker / Chiti */}
          <div className="flex gap-2">
            <button onClick={() => setViewMode('sticker')}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                viewMode === 'sticker'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'bg-muted/40 text-muted-foreground')}>
              <StickyNote className="w-4 h-4" /> Sticker
            </button>
            <button onClick={() => setViewMode('chiti')}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                viewMode === 'chiti'
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md'
                  : 'bg-muted/40 text-muted-foreground')}>
              <ClipboardList className="w-4 h-4" /> Chiti
            </button>
          </div>

          {/* Preview Card — Sticker (REQ-LOG-003) */}
          {viewMode === 'sticker' ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border-2 border-dashed border-border rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="text-center border-b border-border/50 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Navigation Sticker</p>
                <p className="text-lg font-bold text-foreground mt-1">Mercotrace</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Seller S.No.</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{selectedBid.sellerSerial}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lot / Door No.</p>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{selectedBid.lotNumber}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Buyer Mark</p>
                <p className="text-5xl font-black text-foreground tracking-wider">{selectedBid.buyerMark}</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Quantity</p>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{selectedBid.quantity} <span className="text-sm font-semibold">bags</span></p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
                <div><span className="font-semibold">Seller:</span> {selectedBid.sellerName}</div>
                <div><span className="font-semibold">Vehicle:</span> {selectedBid.vehicleNumber}</div>
                <div><span className="font-semibold">Lot:</span> {selectedBid.lotName}</div>
                <div><span className="font-semibold">Commodity:</span> {selectedBid.commodityName}</div>
              </div>
            </motion.div>
          ) : (
            /* Chiti — Bid info for coolie (REQ-LOG-003) */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border-2 border-dashed border-border rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="text-center border-b border-border/50 pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Auction Chiti</p>
                <p className="text-lg font-bold text-foreground mt-1">Bid #{selectedBid.bidNumber}</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Seller S.No.', value: String(selectedBid.sellerSerial), icon: Hash, color: 'text-emerald-500' },
                  { label: 'Lot / Door No.', value: String(selectedBid.lotNumber), icon: Package, color: 'text-blue-500' },
                  { label: 'Buyer Mark', value: selectedBid.buyerMark, icon: User, color: 'text-primary' },
                  { label: 'Buyer Name', value: selectedBid.buyerName, icon: User, color: 'text-violet-500' },
                  { label: 'Quantity', value: `${selectedBid.quantity} bags`, icon: Package, color: 'text-amber-500' },
                  { label: 'Rate', value: `₹${selectedBid.rate}/bag`, icon: Hash, color: 'text-green-500' },
                  { label: 'Seller', value: selectedBid.sellerName, icon: User, color: 'text-cyan-500' },
                  { label: 'Vehicle', value: selectedBid.vehicleNumber, icon: Truck, color: 'text-indigo-500' },
                  { label: 'Lot Name', value: selectedBid.lotName, icon: Package, color: 'text-rose-500' },
                  { label: 'Commodity', value: selectedBid.commodityName, icon: Package, color: 'text-teal-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20">
                    <item.icon className={cn("w-4 h-4 flex-shrink-0", item.color)} />
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0 w-24">{item.label}</span>
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => {
              // Simulate print
              const printLog = getStore<any>('mkt_print_logs');
              printLog.push({
                print_log_id: crypto.randomUUID(),
                trader_id: '',
                reference_type: viewMode === 'sticker' ? 'STICKER' : 'CHITI',
                reference_id: String(selectedBid.bidNumber),
                print_type: viewMode.toUpperCase(),
                printed_at: new Date().toISOString(),
              });
              localStorage.setItem('mkt_print_logs', JSON.stringify(printLog));
              toast.success(`${viewMode === 'sticker' ? 'Sticker' : 'Chiti'} sent to printer!`);
            }}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg text-base">
              <Printer className="w-5 h-5 mr-2" />
              Print {viewMode === 'sticker' ? 'Sticker' : 'Chiti'}
            </Button>
          </div>
        </div>
        {!isDesktop && <BottomNav />}
      </div>
    );
  }

  // ═══ BID LIST SCREEN ═══
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
                animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5" /> Logistics & Navigation
                </h1>
                <p className="text-white/70 text-xs">Print stickers & chiti for completed bids</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input aria-label="Search bid, buyer, seller" placeholder="Search bid, buyer, seller…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-500" /> Logistics & Navigation
              </h2>
              <p className="text-sm text-muted-foreground">{bids.length} completed bids · Print stickers & chiti</p>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input aria-label="Search" placeholder="Search bid, buyer, seller…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Bids</p>
              <p className="text-2xl font-black text-foreground">{bids.length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Bags</p>
              <p className="text-2xl font-black text-foreground">{bids.reduce((s, b) => s + b.quantity, 0)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Sellers</p>
              <p className="text-2xl font-black text-foreground">{new Set(bids.map(b => b.sellerName)).size}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {filteredBids.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Printer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {bids.length === 0 ? 'No completed bids yet' : 'No matching bids found'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {bids.length === 0 ? 'Complete an auction first to generate stickers' : 'Try a different search'}
            </p>
            {bids.length === 0 && (
              <Button onClick={() => navigate('/auctions')} className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl">
                Go to Auctions
              </Button>
            )}
          </div>
        ) : (
          filteredBids.map((bid, i) => (
            <motion.div key={`${bid.bidNumber}-${i}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-sm">{bid.buyerMark}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground truncate">{bid.buyerName}</p>
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">#{bid.bidNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>S#{bid.sellerSerial}</span>
                    <span>•</span>
                    <span>L#{bid.lotNumber}</span>
                    <span>•</span>
                    <span>{bid.quantity} bags</span>
                    <span>•</span>
                    <span>{bid.sellerName}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => handlePrint(bid, 'sticker')}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold shadow-sm">
                    Sticker
                  </button>
                  <button onClick={() => handlePrint(bid, 'chiti')}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-bold shadow-sm">
                    Chiti
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {!isDesktop && <BottomNav />}
    </div>
  );
};

export default LogisticsPage;
