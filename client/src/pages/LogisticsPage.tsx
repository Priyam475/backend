import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Printer, Package, User, Search, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { useAuctionResults } from '@/hooks/useAuctionResults';
import { printLogApi, arrivalsApi, logisticsApi } from '@/services/api';
import type { ArrivalDetail } from '@/services/api/arrivals';

// ── Types ─────────────────────────────────────────────────
export interface BidInfo {
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
  origin?: string;
  godown?: string;
}

type FilterMode = 'LOT' | 'BUYER' | 'SELLER';

const FILTER_TABS: { key: FilterMode; label: string; icon: typeof Layers; desc: string }[] = [
  { key: 'LOT', label: 'Lot', icon: Layers, desc: 'Sales sticker per lot' },
  { key: 'BUYER', label: 'Buyer', icon: User, desc: 'Consolidated chiti for buyer' },
  { key: 'SELLER', label: 'Seller', icon: Package, desc: 'Chiti for seller lots' },
];

const LogisticsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [bids, setBids] = useState<BidInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('LOT');
  

  const { auctionResults: auctionData } = useAuctionResults();
  const [arrivalDetails, setArrivalDetails] = useState<ArrivalDetail[]>([]);

  useEffect(() => {
    arrivalsApi.listDetail(0, 500).then(setArrivalDetails).catch(() => setArrivalDetails([]));
  }, []);

  // REQ-LOG-004: Load bids from completed auctions; enrich with origin/godown; daily serials from API (no localStorage)
  useEffect(() => {
    const allBids: BidInfo[] = [];
    auctionData.forEach((auction: any) => {
      (auction.entries || []).forEach((entry: any) => {
        let sellerName = auction.sellerName || 'Unknown';
        let vehicleNumber = auction.vehicleNumber || 'Unknown';
        const commodityName = auction.commodityName || '';
        let lotName = auction.lotName || '';
        let origin: string | undefined;
        let godown: string | undefined;

        arrivalDetails.forEach((arr) => {
          (arr.sellers || []).forEach((seller) => {
            (seller.lots || []).forEach((lot) => {
              if (String(lot.id) === String(auction.lotId)) {
                sellerName = seller.sellerName;
                vehicleNumber = arr.vehicleNumber || vehicleNumber;
                lotName = lot.lotName || lotName;
                origin = arr.origin;
                godown = arr.godown;
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
          sellerSerial: 0,
          lotNumber: 0,
          vehicleNumber,
          commodityName,
          origin,
          godown,
        });
      });
    });

    const sellerNames = [...new Set(allBids.map(b => b.sellerName).filter(Boolean))];
    const lotIds = [...new Set(allBids.map(b => b.lotId).filter(Boolean))];
    if (sellerNames.length === 0 && lotIds.length === 0) {
      setBids(allBids);
      return;
    }
    logisticsApi.allocateDailySerials({ sellerNames, lotIds })
      .then((res) => {
        const withSerials = allBids.map(b => ({
          ...b,
          sellerSerial: res.sellerSerials[b.sellerName] ?? b.sellerSerial,
          lotNumber: res.lotNumbers[b.lotId] ?? b.lotNumber,
        }));
        setBids(withSerials);
      })
      .catch(() => setBids(allBids));
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

  const lotList = useMemo(() => filteredBids, [filteredBids]);

  const buyerGroups = useMemo(() => {
    const byBuyer = new Map<string, BidInfo[]>();
    filteredBids.forEach(b => {
      const key = b.buyerMark || b.buyerName || '';
      const list = byBuyer.get(key) ?? [];
      list.push(b);
      byBuyer.set(key, list);
    });
    return Array.from(byBuyer.entries()).map(([mark, list]) => ({
      buyerMark: mark,
      buyerName: list[0]?.buyerName ?? mark,
      bids: list,
    }));
  }, [filteredBids]);

  const sellerGroups = useMemo(() => {
    const bySeller = new Map<string, { name: string; serial: number; bids: BidInfo[] }>();
    filteredBids.forEach(b => {
      if (!bySeller.has(b.sellerName)) bySeller.set(b.sellerName, { name: b.sellerName, serial: b.sellerSerial, bids: [] });
      bySeller.get(b.sellerName)!.bids.push(b);
    });
    return Array.from(bySeller.values());
  }, [filteredBids]);

  const uniqueLots = useMemo(() => new Set(bids.map(b => b.lotId)).size, [bids]);
  const uniqueBuyers = useMemo(() => new Set(bids.map(b => b.buyerMark || b.buyerName)).size, [bids]);
  const uniqueSellers = useMemo(() => new Set(bids.map(b => b.sellerName)).size, [bids]);

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
          ${bid.origin ? `<div><b>Origin:</b> ${bid.origin}</div>` : ''}
          ${bid.godown ? `<div><b>Godown:</b> ${bid.godown}</div>` : ''}
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
        ${bid.origin ? `<div class="row"><span class="label">Origin</span><span class="value">${bid.origin}</span></div>` : ''}
        ${bid.godown ? `<div class="row"><span class="label">Godown</span><span class="value">${bid.godown}</span></div>` : ''}
      </div>
    </body></html>`;
  }

  function generateBuyerChitiHTML(bidList: BidInfo[]): string {
    const totalBags = bidList.reduce((s, b) => s + b.quantity, 0);
    const totalAmount = bidList.reduce((s, b) => s + b.quantity * b.rate, 0);
    const rows = bidList.map(b => `
      <tr><td>${b.sellerSerial}</td><td>${b.lotNumber}</td><td>${b.lotName}</td><td>${b.buyerMark}</td><td>${b.quantity}</td><td>₹${b.rate}</td><td>${b.quantity * b.rate}</td><td>${b.sellerName}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0;padding:16px;}
      .chiti{border:2px dashed #333;border-radius:12px;padding:20px;max-width:600px;margin:auto;}
      .header{text-align:center;border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px;text-align:left;}
      th{background:#f5f5f5;}
      .totals{margin-top:12px;font-weight:700;}
      @media print{body{margin:0;}}
    </style></head><body>
      <div class="chiti">
        <div class="header"><small>Buyer Chiti (consolidated)</small><h2>${bidList[0]?.buyerMark ?? ''} – ${bidList[0]?.buyerName ?? ''}</h2></div>
        <table><thead><tr><th>S#</th><th>L#</th><th>Lot</th><th>Mark</th><th>Bags</th><th>Rate</th><th>Amt</th><th>Seller</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals">Total Bags: ${totalBags} &nbsp; Total Amount: ₹${totalAmount.toFixed(2)}</div>
        <p style="margin-top:8px;font-size:11px;color:#666;">Date: ${new Date().toLocaleDateString()}</p>
      </div>
    </body></html>`;
  }

  function generateSellerChitiHTML(bidList: BidInfo[]): string {
    const totalBags = bidList.reduce((s, b) => s + b.quantity, 0);
    const totalAmount = bidList.reduce((s, b) => s + b.quantity * b.rate, 0);
    const rows = bidList.map(b => `
      <tr><td>${b.sellerSerial}</td><td>${b.lotNumber}</td><td>${b.lotName}</td><td>${b.buyerMark}</td><td>${b.quantity}</td><td>₹${b.rate}</td><td>${b.quantity * b.rate}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0;padding:16px;}
      .chiti{border:2px dashed #333;border-radius:12px;padding:20px;max-width:600px;margin:auto;}
      .header{text-align:center;border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px;text-align:left;}
      th{background:#f5f5f5;}
      .totals{margin-top:12px;font-weight:700;}
      @media print{body{margin:0;}}
    </style></head><body>
      <div class="chiti">
        <div class="header"><small>Seller Chiti (consolidated)</small><h2>${bidList[0]?.sellerName ?? ''}</h2></div>
        <table><thead><tr><th>S#</th><th>L#</th><th>Lot</th><th>Mark</th><th>Bags</th><th>Rate</th><th>Amt</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals">Total Bags: ${totalBags} &nbsp; Total Amount: ₹${totalAmount.toFixed(2)}</div>
        <p style="margin-top:8px;font-size:11px;color:#666;">Date: ${new Date().toLocaleDateString()}</p>
      </div>
    </body></html>`;
  }

  function generateSalePadHTML(bidList: BidInfo[]): string {
    const rows = bidList.map((b, i) => `
      <tr><td>${i + 1}</td><td>${b.sellerName}</td><td>${b.lotName}</td><td>${b.buyerMark}</td><td>${b.quantity}</td><td>₹${b.rate}</td><td>₹${(b.quantity * b.rate).toFixed(2)}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0;padding:16px;}
      .pad{border:1px solid #333;padding:20px;max-width:800px;margin:auto;}
      .header{text-align:center;border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px;}
      th{background:#f5f5f5;}
      @media print{body{margin:0;}}
    </style></head><body>
      <div class="pad"><div class="header"><h2>Sale Pad</h2><p>${new Date().toLocaleDateString()}</p></div>
        <table><thead><tr><th>Sl</th><th>Seller</th><th>Lot</th><th>Mark</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </body></html>`;
  }

  function generateTenderSlipHTML(bidList: BidInfo[]): string {
    const rows = bidList.map(b => `<tr><td>${b.lotName}</td><td>${b.quantity}</td><td>₹${b.rate}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0;padding:16px;}
      .slip{border:1px solid #333;padding:20px;max-width:900px;margin:auto;}
      .header{text-align:center;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:8px;}
      th{background:#f5f5f5;}
      @media print{body{margin:0;}}
    </style></head><body>
      <div class="slip"><div class="header"><h2>Tender Slip</h2><p>${new Date().toLocaleDateString()}</p></div>
        <table><thead><tr><th>LOT</th><th>BAGS</th><th>RATE</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </body></html>`;
  }

  function generateDispatchControlHTML(bidList: BidInfo[]): string {
    const bySeller = new Map<string, BidInfo[]>();
    bidList.forEach(b => {
      const list = bySeller.get(b.sellerName) ?? [];
      list.push(b);
      bySeller.set(b.sellerName, list);
    });
    const sections = Array.from(bySeller.entries()).map(([sellerName, list]) => {
      const rows = list.map(b => `<tr><td>${b.lotName}</td><td>${b.godown ?? '-'}</td><td>${b.buyerMark}</td><td>${b.quantity}</td></tr>`).join('');
      return `<div class="block"><h3>${sellerName}</h3><table><thead><tr><th>Lot</th><th>Godown</th><th>Mark</th><th>Bags</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;margin:0;padding:16px;}
      .dispatch{max-width:800px;margin:auto;}
      .header{text-align:center;margin-bottom:16px;}
      .block{margin-bottom:20px;}
      .block h3{margin:8px 0;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:6px;}
      th{background:#f5f5f5;}
      @media print{body{margin:0;}}
    </style></head><body>
      <div class="dispatch"><div class="header"><h2>Dispatch Control</h2><p>${new Date().toLocaleDateString()}</p></div>${sections}</div>
    </body></html>`;
  }

  const triggerPrint = (html: string) => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.print();
        } finally {
          setTimeout(() => document.body.removeChild(printFrame), 1000);
        }
      }, 300);
    } else {
      document.body.removeChild(printFrame);
    }
  };

  const handleBulkPrint = async (type: 'SALE_PAD' | 'TENDER_SLIP' | 'DISPATCH', html: string) => {
    toast.info(`Printing ${type.replace('_', ' ')}…`);
    try {
      await printLogApi.create({
        reference_type: type,
        reference_id: undefined,
        print_type: type,
      });
    } catch {
      // optional
    }
    triggerPrint(html);
    toast.success('Sent to printer!');
  };

  // ═══ BID LIST SCREEN ═══
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Mobile Header — client_origin layout */}
      {!isDesktop && (
        <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate('/home')} aria-label="Go back"
                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5" /> Print Hub
                </h1>
                <p className="text-white/70 text-xs">Direct print · No preview</p>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input aria-label="Search" placeholder="Search lot, buyer, seller…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilterMode(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
                    filterMode === tab.key ? 'bg-white text-emerald-700 shadow-sm' : 'bg-white/20 text-white/80'
                  )}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar — client_origin layout */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-500" /> Print Hub
              </h2>
              <p className="text-sm text-muted-foreground">{bids.length} bids · Direct print · No preview</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input aria-label="Search" placeholder="Search…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50" />
              </div>
              <Button variant="outline" size="sm" onClick={() => handleBulkPrint('SALE_PAD', generateSalePadHTML(filteredBids))} className="text-xs">Sale Pad</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkPrint('TENDER_SLIP', generateTenderSlipHTML(filteredBids))} className="text-xs">Tender Slip</Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkPrint('DISPATCH', generateDispatchControlHTML(filteredBids))} className="text-xs">Dispatch</Button>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setFilterMode(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border',
                  filterMode === tab.key ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                )}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className="text-[10px] font-normal opacity-70">— {tab.desc}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Lots</p>
              <p className="text-2xl font-black text-foreground">{uniqueLots}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Buyers</p>
              <p className="text-2xl font-black text-foreground">{uniqueBuyers}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Sellers</p>
              <p className="text-2xl font-black text-foreground">{uniqueSellers}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick action buttons on mobile — client_origin */}
      {!isDesktop && (
        <div className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => handleBulkPrint('SALE_PAD', generateSalePadHTML(filteredBids))}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-muted text-foreground text-[10px] font-bold border border-border">📋 Sale Pad</button>
          <button onClick={() => handleBulkPrint('TENDER_SLIP', generateTenderSlipHTML(filteredBids))}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-muted text-foreground text-[10px] font-bold border border-border">📄 Tender Slip</button>
          <button onClick={() => handleBulkPrint('DISPATCH', generateDispatchControlHTML(filteredBids))}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-muted text-foreground text-[10px] font-bold border border-border">🚛 Dispatch</button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-2">
        {bids.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Printer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No completed bids yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Complete an auction first</p>
            <Button onClick={() => navigate('/auctions')} className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl">
              Go to Auctions
            </Button>
          </div>
        ) : filterMode === 'LOT' ? (
          lotList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matching lots</p>
          ) : lotList.map((bid, i) => (
            <motion.div key={`${bid.lotNumber}-${i}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-xs">L{bid.lotNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground truncate">
                      {bid.lotName !== String(bid.lotNumber) ? `${bid.lotNumber} / ${bid.lotName}` : `Lot #${bid.lotNumber}`}
                    </p>
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">[{bid.buyerMark}]</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>S#{bid.sellerSerial} {bid.sellerName}</span>
                    <span>•</span>
                    <span>{bid.quantity} bags</span>
                    <span>•</span>
                    <span>{bid.origin || bid.vehicleNumber}</span>
                  </div>
                </div>
                <button onClick={() => handleDirectPrint(bid, 'sticker')}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold shadow-sm flex-shrink-0">🖨 Sticker</button>
              </div>
            </motion.div>
          ))
        ) : filterMode === 'BUYER' ? (
          buyerGroups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matching buyers</p>
          ) : buyerGroups.map((g, i) => (
            <motion.div key={g.buyerMark}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-xs">[{g.buyerMark}]</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{g.buyerName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{g.bids.length} lots</span>
                    <span>•</span>
                    <span>{g.bids.reduce((s, b) => s + b.quantity, 0)} bags</span>
                    <span>•</span>
                    <span>₹{g.bids.reduce((s, b) => s + b.quantity * b.rate, 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button onClick={async () => {
                  toast.info('🖨 Printing Buyer Chiti…');
                  try { await printLogApi.create({ reference_type: 'BUYER_CHITI', reference_id: g.buyerMark, print_type: 'BUYER_CHITI' }); } catch { /* optional */ }
                  triggerPrint(generateBuyerChitiHTML(g.bids));
                  toast.success('Buyer Chiti sent to printer!');
                }}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-bold shadow-sm flex-shrink-0">🖨 Chiti</button>
              </div>
            </motion.div>
          ))
        ) : (
          sellerGroups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matching sellers</p>
          ) : sellerGroups.map((g, i) => (
            <motion.div key={g.name}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card rounded-2xl p-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-black text-xs">S{g.serial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{g.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{g.bids.length} lots</span>
                    <span>•</span>
                    <span>{g.bids.reduce((s, b) => s + b.quantity, 0)} bags</span>
                    <span>•</span>
                    <span>₹{g.bids.reduce((s, b) => s + b.quantity * b.rate, 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button onClick={async () => {
                  toast.info('🖨 Printing Seller Chiti…');
                  try { await printLogApi.create({ reference_type: 'SELLER_CHITI', reference_id: g.name, print_type: 'SELLER_CHITI' }); } catch { /* optional */ }
                  triggerPrint(generateSellerChitiHTML(g.bids));
                  toast.success('Seller Chiti sent to printer!');
                }}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow-sm flex-shrink-0">🖨 Chiti</button>
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
