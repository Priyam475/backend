import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Gavel, Eye, EyeOff, PenLine, Plus, Trash2,
  ShoppingCart, User, Package, Truck, CircleDollarSign, Banknote, ChevronDown,
  Search, AlertTriangle, Merge, TrendingUp, TrendingDown, Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import ScribblePad from '@/components/ScribblePad';
import InlineScribblePad from '@/components/InlineScribblePad';
import { contactApi } from '@/services/api';
import type { Contact } from '@/types/models';
import { toast } from 'sonner';

// ── localStorage helpers ──────────────────────────────────
function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Types ─────────────────────────────────────────────────
interface LotInfo {
  lot_id: string;
  lot_name: string;
  bag_count: number;
  original_bag_count: number;
  commodity_name: string;
  seller_name: string;
  seller_mark: string;
  seller_vehicle_id: string;
  vehicle_number: string;
  was_modified: boolean; // REQ-AUC-009: * indicator
}

type PresetType = 'PROFIT' | 'LOSS';

interface SaleEntry {
  id: string;
  bidNumber: number; // REQ: sequential bid number
  buyerName: string;
  buyerMark: string;
  buyerContactId: string | null;
  rate: number;
  quantity: number;
  amount: number;
  isSelfSale: boolean;
  isScribble: boolean;
  tokenAdvance: number;
  extraRate: number;
  presetApplied: number;
  presetType: PresetType;
  sellerRate: number;
  buyerRate: number;
}

const presetButtons = [10, 20, 50];

// ── Get next bid number ──────────────────────────────────
function getNextBidNumber(): number {
  const current = parseInt(localStorage.getItem('mkt_bid_counter') || '0');
  const next = current + 1;
  localStorage.setItem('mkt_bid_counter', String(next));
  return next;
}

const AuctionsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [buyers, setBuyers] = useState<Contact[]>([]);
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [showExtraRate, setShowExtraRate] = useState(false);
  const [showScribble, setShowScribble] = useState(false);
  const [scribbleMark, setScribbleMark] = useState('');
  const [entryMode, setEntryMode] = useState<'scribble' | 'search'>('scribble');
  const [preset, setPreset] = useState(0);
  const [presetType, setPresetType] = useState<PresetType>('PROFIT');
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState<string | null>(null);
  const [buyerSearch, setBuyerSearch] = useState('');

  // Lot selection
  const [showLotSelector, setShowLotSelector] = useState(true);
  const [availableLots, setAvailableLots] = useState<LotInfo[]>([]);
  const [selectedLot, setSelectedLot] = useState<LotInfo | null>(null);
  const [lotSearchQuery, setLotSearchQuery] = useState('');
  const [lotNavMode, setLotNavMode] = useState<'all' | 'vehicle' | 'seller' | 'lot_number'>('all');

  // Duplicate mark dialog
  const [duplicateMarkDialog, setDuplicateMarkDialog] = useState<{
    mark: string; buyerName: string; buyerContactId: string | null;
    rate: number; qty: number; isScribble: boolean;
    existingEntry: SaleEntry;
  } | null>(null);

  // Quantity increase confirmation
  const [qtyIncreaseDialog, setQtyIncreaseDialog] = useState<{
    currentTotal: number; lotTotal: number; attemptedQty: number;
    pendingEntry: Omit<SaleEntry, 'id' | 'bidNumber'>;
  } | null>(null);

  // New entry form
  const [selectedBuyer, setSelectedBuyer] = useState<Contact | null>(null);
  const [rate, setRate] = useState('');
  const [qty, setQty] = useState('');
  const [extraRate, setExtraRate] = useState('');

  // Load lots from arrivals
  useEffect(() => {
    contactApi.list().then(setBuyers);
    loadLots();
  }, []);

  const loadLots = () => {
    const arrivals = getStore<any>('mkt_arrival_records');
    const lots: LotInfo[] = [];
    arrivals.forEach((arr: any) => {
      const vehicleNumber = arr.vehicle?.vehicle_number || 'Unknown';
      (arr.sellers || []).forEach((seller: any) => {
        (seller.lots || []).forEach((lot: any) => {
          lots.push({
            lot_id: lot.lot_id,
            lot_name: lot.lot_name,
            bag_count: lot.quantity,
            original_bag_count: lot.quantity,
            commodity_name: lot.commodity_name || '',
            seller_name: seller.seller_name,
            seller_mark: seller.seller_mark || '',
            seller_vehicle_id: seller.seller_vehicle_id,
            vehicle_number: vehicleNumber,
            was_modified: false,
          });
        });
      });
    });
    setAvailableLots(lots);
  };

  // Filter lots
  const filteredLots = useMemo(() => {
    let result = availableLots;
    if (lotSearchQuery) {
      const q = lotSearchQuery.toLowerCase();
      result = result.filter(l =>
        l.lot_name.toLowerCase().includes(q) ||
        l.seller_name.toLowerCase().includes(q) ||
        l.seller_mark.toLowerCase().includes(q) ||
        l.vehicle_number.toLowerCase().includes(q) ||
        l.commodity_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [availableLots, lotSearchQuery]);

  // Group lots by vehicle for navigation
  const lotsByVehicle = useMemo(() => {
    const map = new Map<string, LotInfo[]>();
    filteredLots.forEach(l => {
      const key = l.vehicle_number;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return map;
  }, [filteredLots]);

  // Filtered buyers for dropdown
  const filteredBuyers = useMemo(() => {
    if (!buyerSearch) return buyers;
    const q = buyerSearch.toLowerCase();
    return buyers.filter(b =>
      b.name?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      b.mark?.toLowerCase().includes(q)
    );
  }, [buyers, buyerSearch]);

  const totalSold = useMemo(() => entries.reduce((s, e) => s + e.quantity, 0), [entries]);
  const remaining = selectedLot ? selectedLot.bag_count - totalSold : 0;
  const highestBid = useMemo(() => Math.max(0, ...entries.map(e => e.rate)), [entries]);

  // REQ-AUC-003 / REQ-AUC-005: Calculate seller rate based on preset type
  const calcSellerRate = useCallback((bidRate: number, presetVal: number, type: PresetType) => {
    if (presetVal === 0) return bidRate;
    return type === 'PROFIT' ? bidRate - presetVal : bidRate + presetVal;
  }, []);

  // REQ-AUC-009: Allow quantity increase with confirmation
  const tryAddEntry = (entry: Omit<SaleEntry, 'id' | 'bidNumber'>) => {
    if (!selectedLot) return;
    const currentSold = entries.reduce((s, e) => s + e.quantity, 0);
    const newTotal = currentSold + entry.quantity;

    if (newTotal > selectedLot.bag_count) {
      // Show confirmation to increase lot quantity
      setQtyIncreaseDialog({
        currentTotal: currentSold,
        lotTotal: selectedLot.bag_count,
        attemptedQty: entry.quantity,
        pendingEntry: entry,
      });
      return;
    }

    commitEntry(entry);
  };

  const commitEntry = (entry: Omit<SaleEntry, 'id' | 'bidNumber'>) => {
    // Check duplicate mark in this lot
    const existingWithMark = entries.find(e => e.buyerMark === entry.buyerMark && !e.isSelfSale);
    if (existingWithMark && !entry.isSelfSale) {
      setDuplicateMarkDialog({
        mark: entry.buyerMark,
        buyerName: entry.buyerName,
        buyerContactId: entry.buyerContactId,
        rate: entry.rate,
        qty: entry.quantity,
        isScribble: entry.isScribble,
        existingEntry: existingWithMark,
      });
      return;
    }

    finalizeEntry(entry);
  };

  const finalizeEntry = (entry: Omit<SaleEntry, 'id' | 'bidNumber'>) => {
    const newEntry: SaleEntry = {
      ...entry,
      id: crypto.randomUUID(),
      bidNumber: getNextBidNumber(),
    };
    setEntries(prev => [...prev, newEntry]);
    setRate('');
    setQty('');
    setExtraRate('');
    setSelectedBuyer(null);
    setBuyerSearch('');
  };

  // Handle quantity increase confirmation
  const confirmQtyIncrease = () => {
    if (!qtyIncreaseDialog || !selectedLot) return;
    const newBagCount = qtyIncreaseDialog.currentTotal + qtyIncreaseDialog.attemptedQty;
    // Update lot in state with * marker
    setSelectedLot({
      ...selectedLot,
      bag_count: newBagCount,
      was_modified: true,
    });
    // Also update in localStorage
    updateLotInStorage(selectedLot.lot_id, newBagCount);
    commitEntry(qtyIncreaseDialog.pendingEntry);
    setQtyIncreaseDialog(null);
    toast.success(`Lot quantity increased to ${newBagCount} bags*`);
  };

  const updateLotInStorage = (lotId: string, newQty: number) => {
    const lots = getStore<any>('mkt_lots');
    const idx = lots.findIndex((l: any) => l.lot_id === lotId);
    if (idx !== -1) {
      lots[idx].bag_count = newQty;
      lots[idx].was_modified = true;
      setStore('mkt_lots', lots);
    }
    // Also update in arrival records
    const arrivals = getStore<any>('mkt_arrival_records');
    arrivals.forEach((arr: any) => {
      (arr.sellers || []).forEach((seller: any) => {
        (seller.lots || []).forEach((lot: any) => {
          if (lot.lot_id === lotId) {
            lot.quantity = newQty;
          }
        });
      });
    });
    setStore('mkt_arrival_records', arrivals);
  };

  // Handle duplicate mark dialog
  const handleDuplicateMerge = () => {
    if (!duplicateMarkDialog) return;
    const { existingEntry, rate: newRate, qty: newQty } = duplicateMarkDialog;
    if (existingEntry.rate === newRate) {
      // Same rate → merge quantities
      setEntries(prev => prev.map(e =>
        e.id === existingEntry.id
          ? { ...e, quantity: e.quantity + newQty, amount: e.rate * (e.quantity + newQty) }
          : e
      ));
      toast.success(`Merged ${newQty} bags into existing bid #${existingEntry.bidNumber}`);
    } else {
      // Different rate → keep separate
      finalizeEntry({
        buyerName: duplicateMarkDialog.buyerName,
        buyerMark: duplicateMarkDialog.mark,
        buyerContactId: duplicateMarkDialog.buyerContactId,
        rate: newRate,
        quantity: newQty,
        amount: newRate * newQty,
        isSelfSale: false,
        isScribble: duplicateMarkDialog.isScribble,
        tokenAdvance: 0,
        extraRate: showExtraRate ? (parseInt(extraRate) || 0) : 0,
        presetApplied: preset,
        presetType,
        sellerRate: calcSellerRate(newRate, preset, presetType),
        buyerRate: newRate,
      });
      toast.info(`Kept as separate bid (different rate)`);
    }
    setDuplicateMarkDialog(null);
  };

  const handleDuplicateNewMark = () => {
    // User chose to enter a different mark — clear dialog & let them re-enter
    setDuplicateMarkDialog(null);
    toast.info('Enter a different mark for this buyer');
  };

  const handleFormSubmit = () => {
    if (!selectedBuyer || !rate || !qty) return;
    const entryRate = parseInt(rate);
    const entryQty = parseInt(qty);
    if (entryRate <= 0 || entryQty <= 0) return;
    const extra = showExtraRate ? (parseInt(extraRate) || 0) : 0;

    tryAddEntry({
      buyerName: selectedBuyer.name,
      buyerMark: selectedBuyer.mark || selectedBuyer.name.charAt(0),
      buyerContactId: selectedBuyer.contact_id,
      rate: entryRate,
      quantity: entryQty,
      amount: entryRate * entryQty,
      isSelfSale: false,
      isScribble: false,
      tokenAdvance: 0,
      extraRate: extra,
      presetApplied: preset,
      presetType,
      sellerRate: calcSellerRate(entryRate, preset, presetType),
      buyerRate: entryRate,
    });
  };

  const handleScribbleConfirm = (initials: string, quantity: number) => {
    const currentRate = parseInt(rate) || highestBid || 0;
    if (currentRate <= 0) return;
    const extra = showExtraRate ? (parseInt(extraRate) || 0) : 0;

    tryAddEntry({
      buyerName: `[${initials}]`,
      buyerMark: initials,
      buyerContactId: null,
      rate: currentRate,
      quantity,
      amount: currentRate * quantity,
      isSelfSale: false,
      isScribble: true,
      tokenAdvance: 0,
      extraRate: extra,
      presetApplied: preset,
      presetType,
      sellerRate: calcSellerRate(currentRate, preset, presetType),
      buyerRate: currentRate,
    });
    setShowScribble(false);
    setScribbleMark('');
  };

  const handleScribbleInlineAdd = () => {
    if (!scribbleMark || !rate || !qty) return;
    const entryRate = parseInt(rate);
    const entryQty = parseInt(qty);
    if (entryRate <= 0 || entryQty <= 0) return;
    const extra = showExtraRate ? (parseInt(extraRate) || 0) : 0;

    tryAddEntry({
      buyerName: `[${scribbleMark}]`,
      buyerMark: scribbleMark,
      buyerContactId: null,
      rate: entryRate,
      quantity: entryQty,
      amount: entryRate * entryQty,
      isSelfSale: false,
      isScribble: true,
      tokenAdvance: 0,
      extraRate: extra,
      presetApplied: preset,
      presetType,
      sellerRate: calcSellerRate(entryRate, preset, presetType),
      buyerRate: entryRate,
    });
    setScribbleMark('');
    setRate('');
    setQty('');
    setExtraRate('');
  };

  const handleSelfSale = () => {
    if (remaining <= 0 || !selectedLot) return;
    const currentRate = highestBid || parseInt(rate) || 0;
    tryAddEntry({
      buyerName: 'Self Sale',
      buyerMark: 'SS',
      buyerContactId: null,
      rate: currentRate,
      quantity: remaining,
      amount: currentRate * remaining,
      isSelfSale: true,
      isScribble: false,
      tokenAdvance: 0,
      extraRate: 0,
      presetApplied: 0,
      presetType,
      sellerRate: currentRate,
      buyerRate: currentRate,
    });
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const setTokenAdvanceAmount = (id: string, amount: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, tokenAdvance: amount } : e));
    setShowTokenInput(null);
  };

  const applyPreset = (value: number) => setPreset(prev => prev === value ? 0 : value);

  const selectLot = (lot: LotInfo) => {
    setSelectedLot(lot);
    setShowLotSelector(false);
    setEntries([]);
    setRate('');
    setQty('');
  };

  // ═══ LOT SELECTOR SCREEN ═══
  if (showLotSelector) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
        {/* Mobile Header */}
        {!isDesktop && (
          <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
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
                    <Gavel className="w-5 h-5" /> Sales Pad
                  </h1>
                  <p className="text-white/70 text-xs">Select a lot to begin auction</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  placeholder="Search lot, seller, vehicle…"
                  value={lotSearchQuery}
                  onChange={e => setLotSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30"
                />
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
                  <Gavel className="w-5 h-5 text-blue-500" /> Sales Pad — Lot Selection
                </h2>
                <p className="text-sm text-muted-foreground">{availableLots.length} lots available · Select a lot to begin auction</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search lot, seller, vehicle…"
                  value={lotSearchQuery}
                  onChange={e => setLotSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Lots</p>
                <p className="text-2xl font-black text-foreground">{availableLots.length}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Bags</p>
                <p className="text-2xl font-black text-foreground">{availableLots.reduce((s, l) => s + l.bag_count, 0)}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vehicles</p>
                <p className="text-2xl font-black text-foreground">{new Set(availableLots.map(l => l.vehicle_number)).size}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Sellers</p>
                <p className="text-2xl font-black text-foreground">{new Set(availableLots.map(l => l.seller_name)).size}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Mode */}
        <div className="px-4 mt-4 mb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { key: 'all', label: 'All Lots', icon: Package },
              { key: 'vehicle', label: 'By Vehicle', icon: Truck },
              { key: 'seller', label: 'By Seller', icon: User },
              { key: 'lot_number', label: 'By Lot #', icon: Hash },
            ].map(m => (
              <button key={m.key} onClick={() => setLotNavMode(m.key as any)}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  lotNavMode === m.key
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                    : 'bg-muted/40 text-muted-foreground')}>
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lot List */}
        <div className="px-4 space-y-2">
          {availableLots.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No lots available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Register arrivals first to create lots</p>
              <Button onClick={() => navigate('/arrivals')} className="mt-4 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl">
                Go to Arrivals
              </Button>
            </div>
          ) : filteredLots.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No results found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
              <Button onClick={() => setLotSearchQuery('')} variant="outline" className="mt-4 rounded-xl">
                Clear Search
              </Button>
            </div>
          ) : lotNavMode === 'vehicle' ? (
            // Group by vehicle
            Array.from(lotsByVehicle.entries()).map(([vehicle, lots]) => (
              <div key={vehicle} className="glass-card rounded-2xl overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border-b border-border/30 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{vehicle}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{lots.length} lot(s)</span>
                </div>
                <div className="divide-y divide-border/20">
                  {lots.map(lot => (
                    <LotRow key={lot.lot_id} lot={lot} onSelect={selectLot} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Flat list (all / seller / lot_number modes)
            filteredLots.map(lot => (
              <LotRow key={lot.lot_id} lot={lot} onSelect={selectLot} />
            ))
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ═══ SALES PAD (AUCTION) SCREEN ═══
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
      <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
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
            <button onClick={() => { setShowLotSelector(true); setEntries([]); setSelectedLot(null); }}
              aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5" /> Sales Pad
              </h1>
              <p className="text-white/70 text-xs">Live auction operations</p>
            </div>
          </div>

          {/* Lot Info Strip */}
          {selectedLot && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: User, label: 'Seller', value: selectedLot.seller_name },
                { icon: Truck, label: 'Vehicle', value: selectedLot.vehicle_number },
                { icon: Package, label: 'Lot', value: `${selectedLot.lot_name} • ${selectedLot.commodity_name}` },
                { icon: ShoppingCart, label: 'Bags', value: `${remaining}/${selectedLot.bag_count}${selectedLot.was_modified ? '*' : ''}` },
              ].map((item) => (
                <div key={item.label} className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                  <item.icon className="w-3.5 h-3.5 text-white/70 mx-auto mb-0.5" />
                  <p className="text-[9px] text-white/60 uppercase">{item.label}</p>
                  <p className="text-[11px] font-semibold text-white truncate">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Gavel className="w-5 h-5 text-blue-500" /> Sales Pad — Live Auction
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedLot ? `${selectedLot.lot_name} · ${selectedLot.seller_name} · ${selectedLot.commodity_name}` : 'No lot selected'}
              </p>
            </div>
            <Button onClick={() => { setShowLotSelector(true); setEntries([]); setSelectedLot(null); }}
              variant="outline" className="rounded-xl">
              ← Change Lot
            </Button>
          </div>
          {selectedLot && (
            <div className="grid grid-cols-5 gap-4">
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Seller</p>
                <p className="text-sm font-bold text-foreground truncate">{selectedLot.seller_name}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vehicle</p>
                <p className="text-sm font-bold text-foreground">{selectedLot.vehicle_number}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Remaining</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{remaining}<span className="text-xs font-normal ml-1">bags</span></p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Highest Bid</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">₹{highestBid}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-rose-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Entries</p>
                <p className="text-2xl font-black text-foreground">{entries.length}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {/* REQ-AUC-003: Preset & Toggle Bar with Profit/Loss */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preset Margin</p>
            <button
              onClick={() => setShowExtraRate(!showExtraRate)}
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                showExtraRate ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'
              )}
            >
              {showExtraRate ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Extra Rate
            </button>
          </div>

          {/* Preset Type Toggle (Profit / Loss) */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setPresetType('PROFIT')}
              className={cn("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                presetType === 'PROFIT'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground')}>
              <TrendingUp className="w-3.5 h-3.5" /> Profit
            </button>
            <button onClick={() => setPresetType('LOSS')}
              className={cn("flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                presetType === 'LOSS'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-muted/40 text-muted-foreground')}>
              <TrendingDown className="w-3.5 h-3.5" /> Loss
            </button>
          </div>

          <div className="flex items-center gap-2">
            {presetButtons.map(val => (
              <button
                key={val}
                onClick={() => applyPreset(val)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-bold transition-all',
                  preset === val
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                )}
              >
                {presetType === 'PROFIT' ? '−' : '+'}{val}
              </button>
            ))}
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-muted/30 min-w-[60px]">
              <CircleDollarSign className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{preset}</span>
            </div>
          </div>
          {/* REQ-AUC-005: Display logic guided by preset type */}
          {preset > 0 && highestBid > 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-muted-foreground mt-2">
              Buyer pays <span className="text-foreground font-semibold">₹{highestBid}</span> · Seller gets{' '}
              <span className={cn("font-semibold", presetType === 'PROFIT' ? 'text-success' : 'text-amber-500')}>
                ₹{calcSellerRate(highestBid, preset, presetType)}
              </span>
              <span className="ml-1">({presetType === 'PROFIT' ? `B − ${preset}` : `B + ${preset}`})</span>
            </motion.p>
          )}
        </motion.div>

        {/* Entry Form with Inline Scribble */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-3 space-y-3">
          {/* Entry mode tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEntryMode('scribble')}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                entryMode === 'scribble'
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20'
                  : 'bg-muted/40 text-muted-foreground')}
            >
              <PenLine className="w-3.5 h-3.5" /> Scribble Pad
            </button>
            <button
              onClick={() => setEntryMode('search')}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                entryMode === 'search'
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20'
                  : 'bg-muted/40 text-muted-foreground')}
            >
              <Search className="w-3.5 h-3.5" /> Search Buyer
            </button>
          </div>

          <AnimatePresence mode="wait">
            {entryMode === 'scribble' ? (
              <motion.div key="scribble" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                {/* Inline Scribble Pad */}
                <div className={cn("grid gap-3", isDesktop ? "grid-cols-[1fr_280px]" : "grid-cols-1")}>
                  <InlineScribblePad
                    onMarkDetected={setScribbleMark}
                    canvasHeight={isDesktop ? 120 : 140}
                  />
                  <div className="space-y-2">
                    {/* Detected mark display */}
                    {scribbleMark && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase">Mark:</span>
                        <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold shadow-sm">{scribbleMark}</span>
                      </div>
                    )}
                    {/* Rate & Qty */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Rate (₹)</label>
                        <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder={highestBid ? String(highestBid) : '0'}
                          className="h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20" />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Qty (Bags)</label>
                        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
                          className="h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20" />
                      </div>
                    </div>
                    {/* Extra Rate */}
                    <AnimatePresence>
                      {showExtraRate && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Extra Rate (₹)</label>
                          <Input type="number" value={extraRate} onChange={e => setExtraRate(e.target.value)} placeholder="0"
                            className="h-11 rounded-xl text-center font-bold bg-amber-500/10 border-amber-400/30" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Add button */}
                    <div className="flex gap-2">
                      <Button onClick={handleScribbleInlineAdd}
                        disabled={!scribbleMark || !rate || !qty || parseInt(qty) <= 0 || parseInt(rate) <= 0}
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold shadow-md shadow-violet-500/20">
                        <Plus className="w-4 h-4 mr-1" /> Add Bid
                      </Button>
                      <Button onClick={handleSelfSale} disabled={remaining <= 0}
                        variant="outline" className="h-11 rounded-xl px-4 border-amber-400/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                        Self Sale
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="search" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                {/* Buyer search mode */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      placeholder={selectedBuyer ? `${selectedBuyer.name} ${selectedBuyer.mark ? `(${selectedBuyer.mark})` : ''}` : 'Search buyer by name, phone, mark…'}
                      value={buyerSearch}
                      onChange={e => { setBuyerSearch(e.target.value); setShowBuyerDropdown(true); if (selectedBuyer) setSelectedBuyer(null); }}
                      onFocus={() => setShowBuyerDropdown(true)}
                      className={cn(
                        "w-full h-11 rounded-xl bg-muted/30 border border-border/50 pl-10 pr-3 text-sm focus:outline-none focus:border-primary/50",
                        selectedBuyer ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    />
                    {selectedBuyer && (
                      <button onClick={() => { setSelectedBuyer(null); setBuyerSearch(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {showBuyerDropdown && filteredBuyers.length > 0 && !selectedBuyer && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-12 left-0 right-0 z-20 bg-card border border-border/50 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                        {filteredBuyers.slice(0, 8).map(b => (
                          <button key={b.contact_id} onClick={() => {
                            setSelectedBuyer(b);
                            setBuyerSearch('');
                            setShowBuyerDropdown(false);
                          }}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b border-border/20 last:border-0">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-[10px] font-bold">{b.mark || b.name.charAt(0)}</span>
                            </div>
                            <span className="text-foreground">{b.name}</span>
                            {b.mark && <span className="text-muted-foreground text-xs">({b.mark})</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Rate & Qty */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Rate (₹)</label>
                    <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder={highestBid ? String(highestBid) : '0'}
                      className="h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20" />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Qty (Bags)</label>
                    <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
                      className="h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20" />
                  </div>
                </div>

                {/* Extra Rate */}
                <AnimatePresence>
                  {showExtraRate && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3">
                      <label className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5 block">Extra Rate (₹)</label>
                      <Input type="number" value={extraRate} onChange={e => setExtraRate(e.target.value)} placeholder="0"
                        className="h-11 rounded-xl text-center font-bold bg-amber-500/10 border-amber-400/30" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleFormSubmit}
                    disabled={!selectedBuyer || !rate || !qty || parseInt(qty) <= 0 || parseInt(rate) <= 0}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-md shadow-primary/20">
                    <Plus className="w-4 h-4 mr-1" /> Add Bid
                  </Button>
                  <Button onClick={handleSelfSale} disabled={remaining <= 0}
                    variant="outline" className="h-11 rounded-xl px-4 border-amber-400/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                    Self Sale
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Auction Grid — entries list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Auction Grid · {entries.length} entries
            </p>
            {entries.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-bold text-foreground">₹{entries.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
              </p>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No bids yet. Start the auction!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'glass-card rounded-2xl p-3 relative overflow-hidden',
                    entry.isSelfSale && 'border-l-4 border-l-amber-500',
                    entry.isScribble && 'border-l-4 border-l-violet-500'
                  )}
                >
                  <div className={cn(
                    'absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-15',
                    entry.isSelfSale ? 'bg-amber-500' : entry.isScribble ? 'bg-violet-500' : 'bg-primary'
                  )} />

                  <div className="relative z-10 flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0',
                      entry.isSelfSale ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                      entry.isScribble ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' :
                      'bg-gradient-to-br from-blue-500 to-cyan-400'
                    )}>
                      <span className="text-white font-bold text-xs">{entry.buyerMark}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-foreground truncate">{entry.buyerName}</p>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">#{entry.bidNumber}</span>
                        {entry.isScribble && <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-500 text-[8px] font-bold">SCRIBBLE</span>}
                        {entry.isSelfSale && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-bold">SELF</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>₹{entry.rate}/bag</span>
                        <span>{entry.quantity} bags</span>
                        {entry.extraRate > 0 && showExtraRate && <span className="text-amber-500">+₹{entry.extraRate}</span>}
                        {entry.presetApplied > 0 && !entry.isSelfSale && (
                          <span className={cn("text-[10px]", entry.presetType === 'PROFIT' ? 'text-success' : 'text-amber-500')}>
                            SR: ₹{entry.sellerRate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">₹{entry.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <button onClick={() => setShowTokenInput(showTokenInput === entry.id ? null : entry.id)}
                          className={cn('p-1 rounded-md transition-colors', entry.tokenAdvance > 0 ? 'bg-success/15 text-success' : 'bg-muted/50 text-muted-foreground hover:text-foreground')}>
                          <Banknote className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeEntry(entry.id)} className="p-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Token advance input — REQ-AUC-008 */}
                  <AnimatePresence>
                    {showTokenInput === entry.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="mt-2 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground whitespace-nowrap">Token ₹</p>
                          <Input
                            type="number"
                            defaultValue={entry.tokenAdvance || ''}
                            placeholder="0"
                            className="h-8 rounded-lg text-xs text-center flex-1"
                            onBlur={e => setTokenAdvanceAmount(entry.id, parseInt(e.target.value) || 0)}
                            onKeyDown={e => { if (e.key === 'Enter') setTokenAdvanceAmount(entry.id, parseInt((e.target as HTMLInputElement).value) || 0); }}
                          />
                          {entry.tokenAdvance > 0 && <span className="text-[10px] text-success font-semibold">✓ ₹{entry.tokenAdvance}</span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Remaining indicator */}
        {entries.length > 0 && selectedLot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Sold</span>
              <span className="font-bold text-foreground">
                {totalSold} / {selectedLot.bag_count}{selectedLot.was_modified ? '*' : ''} bags
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalSold / selectedLot.bag_count) * 100)}%` }}
                className={cn('h-full rounded-full', totalSold >= selectedLot.bag_count ? 'bg-success' : 'bg-gradient-to-r from-primary to-accent')}
              />
            </div>
            {remaining > 0 && <p className="text-[10px] text-muted-foreground mt-1">{remaining} bags remaining</p>}
            {remaining <= 0 && (
              <>
                <p className="text-[10px] text-success font-semibold mt-1">✓ All bags sold!</p>
                <Button onClick={() => {
                  if (!selectedLot) return;
                  const results = getStore<any>('mkt_auction_results');
                  // Avoid duplicates
                  if (results.some((r: any) => r.lotId === selectedLot.lot_id)) return;
                  results.push({
                    lotId: selectedLot.lot_id,
                    lotName: selectedLot.lot_name,
                    sellerName: selectedLot.seller_name,
                    vehicleNumber: selectedLot.vehicle_number,
                    commodityName: selectedLot.commodity_name,
                    entries: entries.map(e => ({
                      bidNumber: e.bidNumber,
                      buyerMark: e.buyerMark,
                      buyerName: e.buyerName,
                      rate: e.rate,
                      quantity: e.quantity,
                      amount: e.amount,
                      isSelfSale: e.isSelfSale,
                      isScribble: e.isScribble,
                    })),
                    completedAt: new Date().toISOString(),
                  });
                  setStore('mkt_auction_results', results);
                  toast.success('Auction saved! Navigate to Logistics or Weighing.');
                }}
                  className="mt-2 w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm shadow-md">
                  ✓ Save & Complete Auction
                </Button>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Scribble Pad — REQ-AUC-006 */}
      <ScribblePad open={showScribble} onClose={() => setShowScribble(false)} onConfirm={handleScribbleConfirm} />

      {/* ═══ DUPLICATE MARK DIALOG ═══ */}
      <AnimatePresence>
        {duplicateMarkDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={() => setDuplicateMarkDialog(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-card rounded-2xl p-5 shadow-2xl border border-border/50" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-center text-foreground mb-1">Reusing Mark "{duplicateMarkDialog.mark}"?</h3>
              <p className="text-sm text-center text-muted-foreground mb-4">
                This mark already exists in this lot (Bid #{duplicateMarkDialog.existingEntry.bidNumber}).
                {duplicateMarkDialog.existingEntry.rate === duplicateMarkDialog.rate
                  ? ' Same rate — bids will be merged.'
                  : ' Different rate — bids will be kept separate.'}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleDuplicateNewMark} variant="outline" className="flex-1 h-12 rounded-xl">
                  Different Mark
                </Button>
                <Button onClick={handleDuplicateMerge}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  {duplicateMarkDialog.existingEntry.rate === duplicateMarkDialog.rate ? 'Merge' : 'Keep Separate'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ QUANTITY INCREASE CONFIRMATION ═══ */}
      <AnimatePresence>
        {qtyIncreaseDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={() => setQtyIncreaseDialog(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-card rounded-2xl p-5 shadow-2xl border border-border/50" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-center text-foreground mb-1">Increase Lot Quantity?</h3>
              <p className="text-sm text-center text-muted-foreground mb-4">
                Lot has <strong>{qtyIncreaseDialog.lotTotal}</strong> bags, <strong>{qtyIncreaseDialog.currentTotal}</strong> already sold.
                Adding <strong>{qtyIncreaseDialog.attemptedQty}</strong> bags exceeds the limit.
                <br />New total will be: <strong>{qtyIncreaseDialog.currentTotal + qtyIncreaseDialog.attemptedQty}</strong> bags*
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setQtyIncreaseDialog(null)} variant="outline" className="flex-1 h-12 rounded-xl">Cancel</Button>
                <Button onClick={confirmQtyIncrease}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                  Increase & Add
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

// ── Lot Row Component ──────────────────────────────────────
const LotRow = ({ lot, onSelect }: { lot: LotInfo; onSelect: (lot: LotInfo) => void }) => (
  <button onClick={() => onSelect(lot)}
    className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:shadow-lg transition-all text-left group">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden">
      <Package className="w-4 h-4 text-white relative z-10" />
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm text-foreground truncate">
        {lot.lot_name}{lot.was_modified ? '*' : ''} — {lot.commodity_name}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {lot.seller_name} {lot.seller_mark && `(${lot.seller_mark})`} · {lot.vehicle_number}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-bold text-foreground">{lot.bag_count}</p>
      <p className="text-[10px] text-muted-foreground">bags</p>
    </div>
  </button>
);

export default AuctionsPage;
