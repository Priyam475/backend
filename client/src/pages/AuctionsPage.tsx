import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Gavel, Eye, EyeOff, PenLine, Plus, Trash2,
  ShoppingCart, User, Package, Truck, CircleDollarSign, Banknote, ChevronDown,
  Search, AlertTriangle, Merge, TrendingUp, TrendingDown, Hash,
  ChevronLeft, ChevronRight, List, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import ScribblePad from '@/components/ScribblePad';
import InlineScribblePad from '@/components/InlineScribblePad';
import { contactApi, auctionApi } from '@/services/api';
import type {
  LotSummaryDTO,
  AuctionSessionDTO,
  AuctionEntryDTO,
  AuctionBidCreateRequest,
} from '@/services/api/auction';
import type { Contact } from '@/types/models';
import { toast } from 'sonner';
import ForbiddenPage from '@/components/ForbiddenPage';
import { usePermissions } from '@/lib/permissions';

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
  was_modified: boolean;
  status?: LotStatus;
}

type LotStatus = 'available' | 'sold' | 'partial' | 'pending';

type PresetType = 'PROFIT' | 'LOSS';

interface SaleEntry {
  id: string;
  bidNumber: number;
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

// ── In-memory draft only (no localStorage). Session-only; backend draft API not implemented. ──
interface AuctionDraft {
  selectedLotId: string | null;
  entries: SaleEntry[];
  rate: string;
  qty: string;
  extraRate: string;
  preset: number;
  presetType: PresetType;
  showExtraRate: boolean;
  entryMode: 'scribble' | 'search';
  scribbleMark: string;
}

let inMemoryAuctionDraft: AuctionDraft | null = null;

function saveDraft(draft: AuctionDraft) {
  inMemoryAuctionDraft = draft;
}

function loadDraft(): AuctionDraft | null {
  return inMemoryAuctionDraft;
}

function clearDraft() {
  inMemoryAuctionDraft = null;
}

// ── Get lot status (uses API status when available, else draft for pending) ──────────────────
function getLotStatus(lotId: string, bagCount: number, apiStatus?: string): LotStatus {
  const draft = loadDraft();
  if (draft?.selectedLotId === lotId && draft.entries.length > 0) return 'pending';
  if (apiStatus === 'sold' || apiStatus === 'partial' || apiStatus === 'available') return apiStatus as LotStatus;
  return 'available';
}

const STATUS_CONFIG: Record<LotStatus, { label: string; bg: string; text: string; dot: string }> = {
  available: { label: 'Available', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  sold: { label: 'Sold', bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  partial: { label: 'Partial', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  pending: { label: 'Pending', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
};

// ── Map API DTOs to UI types ──────────────────────────────
function lotSummaryToLotInfo(dto: LotSummaryDTO): LotInfo {
  return {
    lot_id: String(dto.lot_id),
    lot_name: dto.lot_name ?? '',
    bag_count: dto.bag_count ?? 0,
    original_bag_count: dto.original_bag_count ?? dto.bag_count ?? 0,
    commodity_name: dto.commodity_name ?? '',
    seller_name: dto.seller_name ?? '',
    seller_mark: dto.seller_mark ?? '',
    seller_vehicle_id: String(dto.seller_vehicle_id ?? ''),
    vehicle_number: dto.vehicle_number ?? '',
    was_modified: dto.was_modified ?? false,
    status: (dto.status as LotStatus) ?? 'available',
  };
}

function sessionEntryToSaleEntry(e: AuctionEntryDTO): SaleEntry {
  return {
    id: String(e.auction_entry_id),
    bidNumber: e.bid_number,
    buyerName: e.buyer_name ?? '',
    buyerMark: e.buyer_mark ?? '',
    buyerContactId: e.buyer_id != null ? String(e.buyer_id) : null,
    rate: Number(e.bid_rate),
    quantity: e.quantity ?? 0,
    amount: Number(e.amount ?? 0),
    isSelfSale: e.is_self_sale ?? false,
    isScribble: e.is_scribble ?? false,
    tokenAdvance: Number(e.token_advance ?? 0),
    extraRate: Number(e.extra_rate ?? 0),
    presetApplied: Number(e.preset_margin ?? 0),
    presetType: (e.preset_type as PresetType) ?? 'PROFIT',
    sellerRate: Number(e.seller_rate ?? e.bid_rate),
    buyerRate: Number(e.buyer_rate ?? e.bid_rate),
  };
}

const AuctionsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { canAccessModule, can } = usePermissions();
  const canView = canAccessModule('Auctions / Sales');
  if (!canView) {
    return <ForbiddenPage moduleName="Auctions" />;
  }
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
  const [lotNumberSearch, setLotNumberSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LotStatus | 'all'>('all');
  const [showLotList, setShowLotList] = useState(false);

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

  // API loading / 409 retry
  const [lotsLoading, setLotsLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [addBidRetryAllowIncrease, setAddBidRetryAllowIncrease] = useState(false);

  // New entry form
  const [selectedBuyer, setSelectedBuyer] = useState<Contact | null>(null);
  const [rate, setRate] = useState('');
  const [qty, setQty] = useState('');
  const [extraRate, setExtraRate] = useState('');

  // Skip initial draft restore flag
  const draftRestored = useRef(false);

  // Load buyers and lots from API
  useEffect(() => {
    contactApi.list().then(setBuyers);
    loadLots();
  }, []);

  const loadLots = useCallback(async (opts?: { q?: string; status?: string }) => {
    setLotsLoading(true);
    try {
      const list = await auctionApi.listLots({
        page: 0,
        size: 500,
        q: opts?.q || undefined,
        status: opts?.status || undefined,
      });
      const lots: LotInfo[] = list.map(lotSummaryToLotInfo);
      setAvailableLots(lots);
      return lots;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load lots');
      setAvailableLots([]);
      return [];
    } finally {
      setLotsLoading(false);
    }
  }, []);

  // ── Restore draft after lots are loaded from API ─────────
  useEffect(() => {
    if (draftRestored.current || availableLots.length === 0) return;
    const draft = loadDraft();
    if (!draft || !draft.selectedLotId) return;
    draftRestored.current = true;
    const lot = availableLots.find(l => l.lot_id === draft.selectedLotId);
    if (!lot) return;
    setSelectedLot(lot);
    setShowLotSelector(false);
    setRate(draft.rate || '');
    setQty(draft.qty || '');
    setExtraRate(draft.extraRate || '');
    setPreset(draft.preset || 0);
    setPresetType(draft.presetType || 'PROFIT');
    setShowExtraRate(draft.showExtraRate || false);
    setEntryMode(draft.entryMode || 'scribble');
    setScribbleMark(draft.scribbleMark || '');
    setSessionLoading(true);
    auctionApi
      .getOrStartSession(lot.lot_id)
      .then((session: AuctionSessionDTO) => {
        setEntries(session.entries.map(sessionEntryToSaleEntry));
      })
      .catch(() => { /* entries stay empty from draft if API fails */ })
      .finally(() => setSessionLoading(false));
    toast.info('Draft restored from previous session');
  }, [availableLots]);

  // ── Auto-save draft on state change ─────────────────────
  useEffect(() => {
    if (!draftRestored.current) return;
    saveDraft({
      selectedLotId: selectedLot?.lot_id || null,
      entries,
      rate,
      qty,
      extraRate,
      preset,
      presetType,
      showExtraRate,
      entryMode,
      scribbleMark,
    });
  }, [selectedLot, entries, rate, qty, extraRate, preset, presetType, showExtraRate, entryMode, scribbleMark]);

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
    if (lotNumberSearch) {
      const q = lotNumberSearch.toLowerCase();
      result = result.filter(l => l.lot_name.toLowerCase().includes(q) || l.lot_id.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(l => getLotStatus(l.lot_id, l.bag_count, l.status) === statusFilter);
    }
    return result;
  }, [availableLots, lotSearchQuery, lotNumberSearch, statusFilter]);

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

  // ── Field validations (Arrivals-page pattern: useMemo returning boolean) ──────────────────

  const isBuyerMarkInvalid = useMemo(() => {
    const mark = entryMode === 'scribble' ? scribbleMark : (selectedBuyer?.mark || '');
    if (!mark.trim()) return false; // not yet entered — don't flag until user types
    if (mark.length > 50) return true;
    return !/^[a-zA-Z0-9\s\[\]\(\)\{\}\-_.]+$/.test(mark);
  }, [entryMode, scribbleMark, selectedBuyer]);

  const isRateInvalid = useMemo(() => {
    if (!rate || !rate.trim()) return false;
    const r = parseFloat(rate);
    if (Number.isNaN(r)) return true;
    return r < 0.01 || r > 1_000_000;
  }, [rate]);

  const isQtyInvalid = useMemo(() => {
    if (!qty || !qty.trim()) return false;
    const q = parseInt(qty, 10);
    if (Number.isNaN(q)) return true;
    if (q < 1) return true;
    if (q > 1_000_000) return true;
    return false;
  }, [qty]);

  const isQtyExceedsRemaining = useMemo(() => {
    if (!qty || !qty.trim()) return false;
    const q = parseInt(qty, 10);
    if (Number.isNaN(q) || q <= 0) return false;
    return remaining > 0 && q > remaining;
  }, [qty, remaining]);

  const isExtraRateInvalid = useMemo(() => {
    if (!showExtraRate) return false;
    if (!extraRate || !extraRate.trim()) return false;
    const e = parseFloat(extraRate);
    if (Number.isNaN(e)) return true;
    return e < 0 || e > 1_000_000;
  }, [showExtraRate, extraRate]);

  const isTokenAdvanceFieldInvalid = useCallback((value: string | number) => {
    const v = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(v)) return true;
    return v < 0 || v > 1_000_000;
  }, []);

  const isLotSearchInvalid = useMemo(() => {
    if (!lotSearchQuery) return false;
    return lotSearchQuery.length > 50;
  }, [lotSearchQuery]);

  const isLotNumberSearchInvalid = useMemo(() => {
    if (!lotNumberSearch) return false;
    if (!/^\d+$/.test(lotNumberSearch.trim())) return true;
    const n = parseInt(lotNumberSearch.trim(), 10);
    return n < 1 || n > 9999;
  }, [lotNumberSearch]);

  const isBuyerSearchInvalid = useMemo(() => {
    if (!buyerSearch) return false;
    return buyerSearch.length > 10;
  }, [buyerSearch]);

  const hasScribbleValidationErrors = useMemo(() => {
    return isBuyerMarkInvalid || isRateInvalid || isQtyInvalid || isExtraRateInvalid;
  }, [isBuyerMarkInvalid, isRateInvalid, isQtyInvalid, isExtraRateInvalid]);

  const hasSearchValidationErrors = useMemo(() => {
    return isRateInvalid || isQtyInvalid || isExtraRateInvalid;
  }, [isRateInvalid, isQtyInvalid, isExtraRateInvalid]);

  // ── Lot navigation (prev/next) ─────────────────────────
  const currentLotIndex = useMemo(() => {
    if (!selectedLot) return -1;
    return availableLots.findIndex(l => l.lot_id === selectedLot.lot_id);
  }, [selectedLot, availableLots]);

  const navigateToLot = (direction: 'prev' | 'next') => {
    if (currentLotIndex === -1) return;
    const newIndex = direction === 'prev' ? currentLotIndex - 1 : currentLotIndex + 1;
    if (newIndex < 0 || newIndex >= availableLots.length) return;
    selectLot(availableLots[newIndex]);
  };

  const canGoPrev = currentLotIndex > 0;
  const canGoNext = currentLotIndex >= 0 && currentLotIndex < availableLots.length - 1;

  // Status counts for lot selector
  const statusCounts = useMemo(() => {
    const counts = { available: 0, sold: 0, partial: 0, pending: 0 };
    availableLots.forEach(l => {
      const s = getLotStatus(l.lot_id, l.bag_count, l.status);
      counts[s]++;
    });
    return counts;
  }, [availableLots]);

  // REQ-AUC-003 / REQ-AUC-005: Calculate seller rate based on preset type
  const calcSellerRate = useCallback((bidRate: number, presetVal: number, type: PresetType) => {
    if (presetVal === 0) return bidRate;
    return type === 'PROFIT' ? bidRate - presetVal : bidRate + presetVal;
  }, []);

  // REQ-AUC-009: Allow quantity increase with confirmation
  const tryAddEntry = (entry: Omit<SaleEntry, 'id' | 'bidNumber'>) => {
    if (!can('Auctions / Sales', 'Create')) {
      toast.error('You do not have permission to add auction bids.');
      return;
    }
    if (!selectedLot) return;
    const currentSold = entries.reduce((s, e) => s + e.quantity, 0);
    const newTotal = currentSold + entry.quantity;

    if (newTotal > selectedLot.bag_count) {
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

  const finalizeEntry = useCallback(async (entry: Omit<SaleEntry, 'id' | 'bidNumber'>, allowLotIncrease?: boolean) => {
    if (!selectedLot) return;
    const allow = allowLotIncrease ?? addBidRetryAllowIncrease;
    const body: AuctionBidCreateRequest = {
      buyer_name: entry.buyerName,
      buyer_mark: entry.buyerMark,
      buyer_id: entry.buyerContactId ? parseInt(entry.buyerContactId, 10) : undefined,
      rate: entry.rate,
      quantity: entry.quantity,
      is_scribble: entry.isScribble,
      is_self_sale: entry.isSelfSale,
      extra_rate: entry.extraRate ?? 0,
      preset_applied: entry.presetApplied ?? 0,
      preset_type: entry.presetType ?? 'PROFIT',
      token_advance: entry.tokenAdvance ?? 0,
      allow_lot_increase: allow,
    };
    try {
      const session = await auctionApi.addBid(selectedLot.lot_id, body);
      setEntries(session.entries.map(sessionEntryToSaleEntry));
      setRate('');
      setQty('');
      setExtraRate('');
      setSelectedBuyer(null);
      setBuyerSearch('');
      setAddBidRetryAllowIncrease(false);
    } catch (err: unknown) {
      const isConflict = err && typeof err === 'object' && (err as { isConflict?: boolean }).isConflict === true;
      if (isConflict) {
        setAddBidRetryAllowIncrease(true);
        toast.error('Quantity exceeds lot. Tap "Add" again to allow lot increase and retry.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to add bid');
      }
    }
  }, [selectedLot, addBidRetryAllowIncrease]);

  const confirmQtyIncrease = async () => {
    if (!qtyIncreaseDialog || !selectedLot) return;
    await finalizeEntry(qtyIncreaseDialog.pendingEntry, true);
    setQtyIncreaseDialog(null);
    toast.success('Bid added with lot increase allowed.');
  };

  const handleDuplicateMerge = async () => {
    if (!duplicateMarkDialog || !selectedLot) return;
    const { existingEntry, rate: newRate, qty: newQty } = duplicateMarkDialog;
    if (existingEntry.rate === newRate) {
      try {
        await auctionApi.deleteBid(selectedLot.lot_id, Number(existingEntry.id));
        const mergedQty = existingEntry.quantity + newQty;
        const session = await auctionApi.addBid(selectedLot.lot_id, {
          buyer_name: duplicateMarkDialog.buyerName,
          buyer_mark: duplicateMarkDialog.mark,
          buyer_id: duplicateMarkDialog.buyerContactId ? parseInt(duplicateMarkDialog.buyerContactId, 10) : undefined,
          rate: newRate,
          quantity: mergedQty,
          is_scribble: duplicateMarkDialog.isScribble,
          is_self_sale: false,
          extra_rate: showExtraRate ? (parseInt(extraRate) || 0) : 0,
          preset_applied: preset,
          preset_type: presetType,
          token_advance: existingEntry.tokenAdvance ?? 0,
        });
        setEntries(session.entries.map(sessionEntryToSaleEntry));
        toast.success(`Merged ${newQty} bags into existing bid #${existingEntry.bidNumber}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to merge bid');
      }
    } else {
      await finalizeEntry({
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
    setDuplicateMarkDialog(null);
    toast.info('Enter a different mark for this buyer');
  };

  const handleFormSubmit = () => {
    if (!selectedBuyer || !rate || !qty) return;
    const entryRate = parseInt(rate);
    const entryQty = parseInt(qty);
    if (entryRate <= 0 || entryQty <= 0) return;
    if (hasSearchValidationErrors) {
      toast.error('Please fix validation errors before adding a bid.');
      return;
    }
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
    if (isRateInvalid || isExtraRateInvalid) {
      toast.error('Please fix validation errors before adding a bid.');
      return;
    }
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
    if (hasScribbleValidationErrors) {
      toast.error('Please fix validation errors before adding a bid.');
      return;
    }
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

  const removeEntry = useCallback(async (id: string) => {
    if (!selectedLot) return;
    if (!can('Auctions / Sales', 'Delete')) {
      toast.error('You do not have permission to delete auction bids.');
      return;
    }
    try {
      const session = await auctionApi.deleteBid(selectedLot.lot_id, Number(id));
      setEntries(session.entries.map(sessionEntryToSaleEntry));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove bid');
    }
  }, [selectedLot]);

  const setTokenAdvanceAmount = useCallback(async (id: string, amount: number) => {
    if (!selectedLot) return;
    if (!can('Auctions / Sales', 'Edit')) {
      toast.error('You do not have permission to edit auction bids.');
      return;
    }
    if (isTokenAdvanceFieldInvalid(amount)) {
      toast.error('Token advance must be between ₹0 and ₹10,00,000.');
      return;
    }
    try {
      const session = await auctionApi.updateBid(selectedLot.lot_id, Number(id), { token_advance: amount });
      setEntries(session.entries.map(sessionEntryToSaleEntry));
      setShowTokenInput(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update token advance');
    }
  }, [selectedLot]);

  const applyPreset = (value: number) => setPreset(prev => prev === value ? 0 : value);

  const selectLot = useCallback((lot: LotInfo) => {
    setSelectedLot(lot);
    setShowLotSelector(false);
    setShowLotList(false);
    setEntries([]);
    setRate('');
    setQty('');
    setLotNumberSearch('');
    setSessionLoading(true);
    auctionApi
      .getOrStartSession(lot.lot_id)
      .then((session: AuctionSessionDTO) => {
        const info = lotSummaryToLotInfo(session.lot);
        setSelectedLot(info);
        setEntries(session.entries.map(sessionEntryToSaleEntry));
      })
      .catch(() => toast.error('Failed to load session'))
      .finally(() => setSessionLoading(false));
  }, []);

  const goBackToSelector = () => {
    // Don't clear entries — they're auto-saved
    setShowLotSelector(true);
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
                <button onClick={() => navigate('/home')} aria-label="Go back" className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gavel className="w-5 h-5" /> Sales Pad
                  </h1>
                  <p className="text-white/70 text-xs">Select a lot to begin auction</p>
                </div>
              </div>
              {/* General search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  placeholder="Search lot, seller, vehicle…"
                  value={lotSearchQuery}
                  onChange={e => setLotSearchQuery(e.target.value)}
                  maxLength={50}
                  className={cn("w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30",
                    isLotSearchInvalid && "border-red-400 ring-2 ring-red-400/30")}
                />
                {isLotSearchInvalid && <p className="text-[9px] text-red-300 mt-0.5 ml-1">⚠ Max 50 characters</p>}
              </div>
              {/* Lot Number search */}
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  placeholder="Search by Lot Number…"
                  value={lotNumberSearch}
                  onChange={e => setLotNumberSearch(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  maxLength={4}
                  className={cn("w-full h-10 pl-10 pr-4 rounded-xl bg-white/15 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30",
                    isLotNumberSearchInvalid && "border-red-400 ring-2 ring-red-400/30")}
                />
                {isLotNumberSearchInvalid && <p className="text-[9px] text-red-300 mt-0.5 ml-1">⚠ Numeric, 1–9999</p>}
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
              <div className="flex gap-3">
                <div className="relative w-56">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="Lot Number…"
                    value={lotNumberSearch}
                    onChange={e => setLotNumberSearch(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    maxLength={4}
                    className={cn("w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50",
                      isLotNumberSearchInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")}
                  />
                  {isLotNumberSearchInvalid && <p className="text-[9px] text-red-500 mt-0.5 ml-1">⚠ Numeric, 1–9999</p>}
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="Search lot, seller, vehicle…"
                    value={lotSearchQuery}
                    onChange={e => setLotSearchQuery(e.target.value)}
                    maxLength={50}
                    className={cn("w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50",
                      isLotSearchInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")}
                  />
                  {isLotSearchInvalid && <p className="text-[9px] text-red-500 mt-0.5 ml-1">⚠ Max 50 characters</p>}
                </div>
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

        {/* Status Filter Bar */}
        <div className="px-4 mt-4 mb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setStatusFilter('all')}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                statusFilter === 'all'
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-muted/40 text-muted-foreground')}>
              All ({availableLots.length})
            </button>
            {(Object.entries(STATUS_CONFIG) as [LotStatus, typeof STATUS_CONFIG['available']][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                  statusFilter === key
                    ? `${cfg.bg} ${cfg.text} shadow-md ring-1 ring-current/20`
                    : 'bg-muted/40 text-muted-foreground')}>
                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                {cfg.label} ({statusCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Mode */}
        <div className="px-4 mt-2 mb-3">
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
          {lotsLoading ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground font-medium">Loading lots…</p>
            </div>
          ) : availableLots.length === 0 ? (
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
              <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term or filter</p>
              <Button onClick={() => { setLotSearchQuery(''); setLotNumberSearch(''); setStatusFilter('all'); }} variant="outline" className="mt-4 rounded-xl">
                Clear Filters
              </Button>
            </div>
          ) : lotNavMode === 'vehicle' ? (
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
            <button onClick={goBackToSelector}
              aria-label="Go back" className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Gavel className="w-5 h-5" /> Sales Pad
              </h1>
              <p className="text-white/70 text-xs">Live auction operations</p>
            </div>
            {/* Lot navigation & list toggle */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigateToLot('prev')} disabled={!canGoPrev}
                aria-label="Previous lot" className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  canGoPrev ? 'bg-white/20 backdrop-blur' : 'bg-white/10 opacity-40')}>
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setShowLotList(!showLotList)}
                aria-label="Lot list" className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <List className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => navigateToLot('next')} disabled={!canGoNext}
                aria-label="Next lot" className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  canGoNext ? 'bg-white/20 backdrop-blur' : 'bg-white/10 opacity-40')}>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
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

          {/* Lot position indicator */}
          {selectedLot && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-[10px] text-white/60">Lot {currentLotIndex + 1} of {availableLots.length}</span>
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
                {selectedLot && <span className="ml-2 text-primary font-medium">({currentLotIndex + 1}/{availableLots.length})</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigateToLot('prev')} disabled={!canGoPrev}
                variant="outline" size="icon" className="rounded-xl h-10 w-10">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowLotList(!showLotList)}
                variant={showLotList ? 'default' : 'outline'} size="icon" className="rounded-xl h-10 w-10">
                <List className="w-4 h-4" />
              </Button>
              <Button onClick={() => navigateToLot('next')} disabled={!canGoNext}
                variant="outline" size="icon" className="rounded-xl h-10 w-10">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={goBackToSelector}
                variant="outline" className="rounded-xl ml-2">
                ← Change Lot
              </Button>
            </div>
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

      {/* ═══ LOT LIST OVERLAY ═══ */}
      <AnimatePresence>
        {showLotList && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-4 mb-3 overflow-hidden">
            <div className="glass-card rounded-2xl p-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Quick Lot Navigation</p>
                <div className="relative w-40">
                  <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input placeholder="Lot #" value={lotNumberSearch}
                    onChange={e => setLotNumberSearch(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    maxLength={4}
                    className={cn("w-full h-7 pl-7 pr-2 rounded-lg bg-muted/50 text-foreground text-xs border border-border focus:outline-none focus:border-primary/50",
                      isLotNumberSearchInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                </div>
              </div>
              <div className="space-y-1">
                {(lotNumberSearch
                  ? availableLots.filter(l => l.lot_name.toLowerCase().includes(lotNumberSearch.toLowerCase()) || l.lot_id.toLowerCase().includes(lotNumberSearch.toLowerCase()))
                  : availableLots
                ).map(lot => {
                  const status = getLotStatus(lot.lot_id, lot.bag_count, lot.status);
                  const cfg = STATUS_CONFIG[status];
                  const isActive = selectedLot?.lot_id === lot.lot_id;
                  return (
                    <button key={lot.lot_id} onClick={() => selectLot(lot)}
                      className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all",
                        isActive ? 'bg-primary/15 ring-1 ring-primary/30' : 'hover:bg-muted/50')}>
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                      <span className={cn("font-semibold truncate flex-1", isActive ? 'text-primary' : 'text-foreground')}>{lot.lot_name}</span>
                      <span className="text-muted-foreground truncate max-w-[80px]">{lot.seller_name}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", cfg.bg, cfg.text)}>{cfg.label}</span>
                      <span className="text-muted-foreground font-medium">{lot.bag_count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className={cn("grid gap-3", isDesktop ? "grid-cols-[1fr_280px]" : "grid-cols-1")}>
                  <InlineScribblePad
                    onMarkDetected={setScribbleMark}
                    canvasHeight={isDesktop ? 120 : 140}
                  />
                  <div className="space-y-2">
                    {scribbleMark && (
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[9px] font-semibold uppercase", isBuyerMarkInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                          Mark: {isBuyerMarkInvalid && "⚠ Max 50, alphanumeric + spaces"}
                        </span>
                        <span className={cn("px-2.5 py-1 rounded-lg text-white text-sm font-bold shadow-sm",
                          isBuyerMarkInvalid ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        )}>{scribbleMark}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isRateInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                          Rate (₹) {isRateInvalid && "⚠ 0.01–10,00,000"}
                        </label>
                        <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder={highestBid ? String(highestBid) : '0'}
                          min={0.01} max={1000000} step="0.01"
                          className={cn("h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20", isRateInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                      </div>
                      <div>
                        <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isQtyInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                          Qty (Bags) {isQtyInvalid ? "⚠ Must be ≥ 1" : isQtyExceedsRemaining ? "⚠ Exceeds remaining" : ""}
                        </label>
                        <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
                          min={1} max={1000000}
                          className={cn("h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20", (isQtyInvalid || isQtyExceedsRemaining) && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                      </div>
                    </div>
                    <AnimatePresence>
                      {showExtraRate && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isExtraRateInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            Extra Rate (₹) {isExtraRateInvalid && "⚠ 0–10,00,000"}
                          </label>
                          <Input type="number" value={extraRate} onChange={e => setExtraRate(e.target.value)} placeholder="0"
                            min={0} max={1000000} step="0.01"
                            className={cn("h-11 rounded-xl text-center font-bold bg-amber-500/10 border-amber-400/30", isExtraRateInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex gap-2">
                      <Button onClick={handleScribbleInlineAdd}
                        disabled={!scribbleMark || !rate || !qty || parseInt(qty) <= 0 || parseInt(rate) <= 0 || hasScribbleValidationErrors}
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

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isRateInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                      Rate (₹) {isRateInvalid && "⚠ 0.01–10,00,000"}
                    </label>
                    <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder={highestBid ? String(highestBid) : '0'}
                      min={0.01} max={1000000} step="0.01"
                      className={cn("h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20", isRateInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                  </div>
                  <div>
                    <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isQtyInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                      Qty (Bags) {isQtyInvalid ? "⚠ Must be ≥ 1" : isQtyExceedsRemaining ? "⚠ Exceeds remaining" : ""}
                    </label>
                    <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
                      min={1} max={1000000}
                      className={cn("h-11 rounded-xl text-center font-bold text-lg bg-muted/20 border-primary/20", (isQtyInvalid || isQtyExceedsRemaining) && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                  </div>
                </div>

                <AnimatePresence>
                  {showExtraRate && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3">
                      <label className={cn("text-[9px] font-semibold uppercase mb-0.5 block", isExtraRateInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                        Extra Rate (₹) {isExtraRateInvalid && "⚠ 0–10,00,000"}
                      </label>
                      <Input type="number" value={extraRate} onChange={e => setExtraRate(e.target.value)} placeholder="0"
                        min={0} max={1000000} step="0.01"
                        className={cn("h-11 rounded-xl text-center font-bold bg-amber-500/10 border-amber-400/30", isExtraRateInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2 mt-3">
                  <Button onClick={handleFormSubmit}
                    disabled={!selectedBuyer || !rate || !qty || parseInt(qty) <= 0 || parseInt(rate) <= 0 || hasSearchValidationErrors}
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
                            min={0}
                            max={1000000}
                            className="h-8 rounded-lg text-xs text-center flex-1"
                            onBlur={e => {
                              const v = parseInt(e.target.value) || 0;
                              if (isTokenAdvanceFieldInvalid(v)) {
                                toast.error('Token advance must be between ₹0 and ₹10,00,000.');
                                return;
                              }
                              setTokenAdvanceAmount(entry.id, v);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const v = parseInt((e.target as HTMLInputElement).value) || 0;
                                if (isTokenAdvanceFieldInvalid(v)) {
                                  toast.error('Token advance must be between ₹0 and ₹10,00,000.');
                                  return;
                                }
                                setTokenAdvanceAmount(entry.id, v);
                              }
                            }}
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
                <Button
                  disabled={completeLoading}
                  onClick={async () => {
                    if (!selectedLot) return;
                    setCompleteLoading(true);
                    if (!can('Auctions / Sales', 'Approve')) {
                      toast.error('You do not have permission to complete auctions.');
                      return;
                    }
                    try {
                      await auctionApi.completeAuction(selectedLot.lot_id);
                      clearDraft();
                      setShowLotSelector(true);
                      setSelectedLot(null);
                      setEntries([]);
                      toast.success('Auction saved! Navigate to Logistics or Weighing.');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to complete auction');
                    } finally {
                      setCompleteLoading(false);
                    }
                  }}
                  className="mt-2 w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm shadow-md">
                  {completeLoading ? 'Completing…' : '✓ Save & Complete Auction'}
                </Button>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Scribble Pad */}
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

// ── Lot Row Component with Status Badge ──────────────────
const LotRow = ({ lot, onSelect }: { lot: LotInfo; onSelect: (lot: LotInfo) => void }) => {
  const status = getLotStatus(lot.lot_id, lot.bag_count, lot.status);
  const cfg = STATUS_CONFIG[status];

  return (
    <button onClick={() => onSelect(lot)}
      className="w-full glass-card rounded-2xl p-3 flex items-center gap-3 hover:shadow-lg transition-all text-left group">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md flex-shrink-0 relative overflow-hidden">
        <Package className="w-4 h-4 text-white relative z-10" />
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">
            {lot.lot_name}{lot.was_modified ? '*' : ''} — {lot.commodity_name}
          </p>
          <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 flex-shrink-0", cfg.bg, cfg.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
        </div>
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
};

export default AuctionsPage;
