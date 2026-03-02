import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Printer, Package, User, Hash, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { useAuctionResults } from '@/hooks/useAuctionResults';
import { printLogApi, arrivalsApi } from '@/services/api';
import type { ArrivalDetail } from '@/services/api/arrivals';

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
  

  const { auctionResults: auctionData } = useAuctionResults();
  const [arrivalDetails, setArrivalDetails] = useState<ArrivalDetail[]>([]);

  useEffect(() => {
    arrivalsApi.listDetail(0, 500).then(setArrivalDetails).catch(() => setArrivalDetails([]));
  }, []);

  // REQ-LOG-004: Load bids from completed auctions (arrival data from API)
  useEffect(() => {
    const allBids: BidInfo[] = [];
    auctionData.forEach((auction: any) => {
      (auction.entries || []).forEach((entry: any) => {
        let sellerName = auction.sellerName || 'Unknown';
        let vehicleNumber = auction.vehicleNumber || 'Unknown';
        const commodityName = auction.commodityName || '';
        let lotName = auction.lotName || '';

        arrivalDetails.forEach((arr) => {
          (arr.sellers || []).forEach((seller) => {
            (seller.lots || []).forEach((lot) => {
              if (String(lot.id) === String(auction.lotId)) {
                sellerName = seller.sellerName;
                vehicleNumber = arr.vehicleNumber || vehicleNumber;
                lotName = lot.lotName || lotName;
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
          lotId: String(auction.lotId),
          lotName,
          sellerName,
          sellerSerial: getDailySellerSerial(sellerName),
          lotNumber: getDailyLotNumber(String(auction.lotId)),
          vehicleNumber,
          commodityName,
        });
      });
    });
    setBids(allBids);
  }, [auctionData, arrivalDetails]);

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

  const handleDirectPrint = async (bid: BidInfo, type: 'sticker' | 'chiti') => {
    toast.info(`🖨 Printing ${type === 'sticker' ? 'Sticker' : 'Chiti'}…`);

    const printedAt = new Date().toISOString();
    try {
      await printLogApi.create({
        reference_type: type === 'sticker' ? 'STICKER' : 'CHITI',
        reference_id: String(bid.bidNumber),
        print_type: type.toUpperCase(),
        printed_at: printedAt,
      });
    } catch {
      // backend optional
    }

    // Generate print content in a hidden iframe
    const printContent = type === 'sticker' ? generateStickerHTML(bid) : generateChitiHTML(bid);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
      toast.error('Printer not connected. Please check printer connection.');
      document.body.removeChild(printFrame);
      return;
    }

    frameDoc.open();
    frameDoc.write(printContent);
    frameDoc.close();

    // Wait for content to render, then print
    setTimeout(() => {
      try {
        printFrame.contentWindow?.print();
        toast.success(`${type === 'sticker' ? 'Sticker' : 'Chiti'} sent to printer!`);
      } catch {
        toast.error('Printer not connected. Please check printer connection.');
      }
      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 300);
  };

  function generateStickerHTML(bid: BidInfo): string {
    return `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
      .sticker { border: 2px dashed #333; border-radius: 12px; padding: 20px; max-width: 320px; margin: auto; }
      .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 12px; margin-bottom: 12px; }
      .header small { color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 10px; }
      .header h2 { margin: 4px 0; font-size: 18px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .box { background: #f5f5f5; border-radius: 8px; padding: 10px; text-align: center; }
      .box small { display: block; color: #888; font-size: 9px; text-transform: uppercase; font-weight: 600; }
      .box .big { font-size: 32px; font-weight: 900; }
      .mark-box { background: linear-gradient(135deg,#e8f0fe,#f3e8ff); border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 12px; }
      .mark-box small { display: block; color: #888; font-size: 9px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
      .mark-box .mark { font-size: 48px; font-weight: 900; letter-spacing: 4px; }
      .qty-box { background: #fff8e1; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 12px; }
      .qty-box small { display: block; color: #888; font-size: 9px; text-transform: uppercase; font-weight: 600; }
      .qty-box .big { font-size: 28px; font-weight: 900; }
      .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; color: #666; text-align: center; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <div class="sticker">
        <div class="header"><small>Navigation Sticker</small><h2>Mercotrace</h2></div>
        <div class="grid">
          <div class="box"><small>Seller S.No.</small><div class="big">${bid.sellerSerial}</div></div>
          <div class="box"><small>Lot / Door No.</small><div class="big">${bid.lotNumber}</div></div>
        </div>
        <div class="mark-box"><small>Buyer Mark</small><div class="mark">${bid.buyerMark}</div></div>
        <div class="qty-box"><small>Quantity</small><div class="big">${bid.quantity} bags</div></div>
        <div class="footer">
          <div><b>Seller:</b> ${bid.sellerName}</div>
          <div><b>Lot:</b> ${bid.lotName}</div>
          <div><b>Commodity:</b> ${bid.commodityName}</div>
          <div><b>Date:</b> ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </body></html>`;
  }

  function generateChitiHTML(bid: BidInfo): string {
    return `<!DOCTYPE html><html><head><style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; }
      .chiti { border: 2px dashed #333; border-radius: 12px; padding: 20px; max-width: 320px; margin: auto; }
      .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 12px; margin-bottom: 12px; }
      .header small { color: #888; text-transform: uppercase; letter-spacing: 2px; font-size: 10px; }
      .header h2 { margin: 4px 0; font-size: 16px; }
      .row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: #f9f9f9; margin-bottom: 4px; }
      .row .label { font-size: 11px; color: #888; width: 90px; flex-shrink: 0; }
      .row .value { font-size: 13px; font-weight: 700; }
      @media print { body { margin: 0; } }
    </style></head><body>
      <div class="chiti">
        <div class="header"><small>Auction Chiti</small><h2>Bid #${bid.bidNumber}</h2></div>
        <div class="row"><span class="label">Seller S.No.</span><span class="value">${bid.sellerSerial}</span></div>
        <div class="row"><span class="label">Lot / Door No.</span><span class="value">${bid.lotNumber}</span></div>
        <div class="row"><span class="label">Buyer Mark</span><span class="value">${bid.buyerMark}</span></div>
        <div class="row"><span class="label">Buyer Name</span><span class="value">${bid.buyerName}</span></div>
        <div class="row"><span class="label">Quantity</span><span class="value">${bid.quantity} bags</span></div>
        <div class="row"><span class="label">Rate</span><span class="value">₹${bid.rate}/bag</span></div>
        <div class="row"><span class="label">Seller</span><span class="value">${bid.sellerName}</span></div>
        <div class="row"><span class="label">Lot Name</span><span class="value">${bid.lotName}</span></div>
        <div class="row"><span class="label">Commodity</span><span class="value">${bid.commodityName}</span></div>
      </div>
    </body></html>`;
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
307:                   <Printer className="w-5 h-5" /> Print Hub
308:                 </h1>
309:                 <p className="text-white/70 text-xs">Print stickers & chiti for completed bids</p>
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
                <Printer className="w-5 h-5 text-emerald-500" /> Print Hub
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
                  <button onClick={() => handleDirectPrint(bid, 'sticker')}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold shadow-sm">
                    Sticker
                  </button>
                  <button onClick={() => handleDirectPrint(bid, 'chiti')}
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
