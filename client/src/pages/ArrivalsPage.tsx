import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import {
  ArrowLeft, Plus, Truck, Scale, ChevronDown, ChevronUp, Trash2,
  AlertTriangle, Search, Package, Users, Banknote, FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { contactApi, arrivalsApi, commodityApi } from '@/services/api';
import type { ArrivalSummary, ArrivalCreatePayload } from '@/services/api/arrivals';
import type { Vehicle, Contact, FreightMethod } from '@/types/models';
import { toast } from 'sonner';
import { useDesktopMode } from '@/hooks/use-desktop';
import ForbiddenPage from '@/components/ForbiddenPage';
import { usePermissions } from '@/lib/permissions';

/**
 * ArrivalsPage — SRS Part 2: Inward Logistics (REQ-ARR-001 to REQ-ARR-013)
 *
 * Hierarchical structure (REQ-ARR-010):
 *   Vehicle → Multiple Sellers → Multiple Lots
 *
 * Screens:
 *   3.3.1 Vehicle & Tonnage Entry
 *   3.3.2 Seller & Lot Entry
 *   3.3.3 Financial Trigger Logic
 *   3.3.5 Rental & Advance Logic
 *   3.3.6 Validation & Constraints
 */

// ── Types for local arrival data ──────────────────────────
interface LotEntry {
  lot_id: string;
  lot_name: string;
  quantity: number; // bag count
  commodity_name: string;
  broker_tag: string;
}

interface SellerEntry {
  seller_vehicle_id: string;
  contact_id: string;
  seller_name: string;
  seller_phone: string;
  seller_mark: string;
  lots: LotEntry[];
}

interface ArrivalRecord {
  vehicle: Vehicle;
  loaded_weight: number;
  empty_weight: number;
  deducted_weight: number;
  net_weight: number;       // REQ-ARR-001: LW - EW
  final_billable_weight: number; // REQ-ARR-001: NW - DW
  freight_method: FreightMethod;
  freight_rate: number;
  freight_total: number;
  no_rental: boolean;
  advance_paid: number;
  broker_name: string;
  sellers: SellerEntry[];
  is_multi_seller: boolean;
  godown: string;
  gatepass_number: string;
}

const FREIGHT_METHODS: { value: FreightMethod; label: string }[] = [
  { value: 'BY_WEIGHT', label: 'By Weight' },
  { value: 'BY_COUNT', label: 'By Count' },
  { value: 'LUMPSUM', label: 'Lumpsum' },
  { value: 'DIVIDE_BY_WEIGHT', label: 'Lumpsum + Divide by Weight' },
];

const NARRATION_PRESETS = [
  'Freight for vehicle arrival',
  'Coolie charges for unloading',
  'Advance paid to driver',
  'Rental charges — partial payment',
];

const ArrivalsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { canAccessModule, can } = usePermissions();
  const canView = canAccessModule('Arrivals');

  if (!canView) {
    return <ForbiddenPage moduleName="Arrivals" />;
  }
  const [apiArrivals, setApiArrivals] = useState<ArrivalSummary[]>([]);
  const [apiArrivalsLoading, setApiArrivalsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [commodityConfigs, setCommodityConfigs] = useState<any[]>([]);
  const [expandedArrival, setExpandedArrival] = useState<number | null>(null);
  const [desktopTab, setDesktopTab] = useState<'summary' | 'new-arrival'>('summary');

  // Form state for new arrival — in-memory only (no localStorage). Drafts are session-only; backend draft API not implemented.
  const [showAdd, setShowAdd] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [isMultiSeller, setIsMultiSeller] = useState<boolean>(true);

  // Step 1: Vehicle & Tonnage
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loadedWeight, setLoadedWeight] = useState('');
  const [emptyWeight, setEmptyWeight] = useState('');
  const [deductedWeight, setDeductedWeight] = useState('');
  const [freightMethod, setFreightMethod] = useState<FreightMethod>('BY_WEIGHT');
  const [freightRate, setFreightRate] = useState('');
  const [noRental, setNoRental] = useState(false);
  const [advancePaid, setAdvancePaid] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [narration, setNarration] = useState('');
  const [godown, setGodown] = useState('');
  const [gatepassNumber, setGatepassNumber] = useState('');

  // Step 2: Sellers & Lots
  const [sellers, setSellers] = useState<SellerEntry[]>([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerDropdown, setSellerDropdown] = useState(false);
  const sellerSearchWrapRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const refreshDropdownPos = useCallback(() => {
    if (sellerSearchWrapRef.current) {
      const rect = sellerSearchWrapRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  // ── Weight validation: empty > loaded ──────────────────
  const isEmptyWeightInvalid = useMemo(() => {
    const lw = parseFloat(loadedWeight) || 0;
    const ew = parseFloat(emptyWeight) || 0;
    return ew > 0 && lw > 0 && ew > lw;
  }, [loadedWeight, emptyWeight]);

  const loadArrivalsFromApi = async () => {
    setApiArrivalsLoading(true);
    try {
      const list = await arrivalsApi.list(0, 100);
      setApiArrivals(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load arrivals';
      toast.error(message);
      setApiArrivals([]);
    } finally {
      setApiArrivalsLoading(false);
    }
  };

  useEffect(() => {
    loadArrivalsFromApi();
    contactApi.list().then(setContacts);
    commodityApi.list().then(setCommodities);
    commodityApi.getAllFullConfigs().then(setCommodityConfigs);
  }, []);

  // Close seller dropdown on scroll or resize (portal is fixed-position so it won't follow)
  useEffect(() => {
    if (!sellerDropdown) return;
    const close = () => setSellerDropdown(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [sellerDropdown]);

  // REQ-ARR-001: Tonnage Calculation
  const netWeight = useMemo(() => {
    const lw = parseFloat(loadedWeight) || 0;
    const ew = parseFloat(emptyWeight) || 0;
    return Math.max(0, lw - ew);
  }, [loadedWeight, emptyWeight]);

  const finalBillableWeight = useMemo(() => {
    const dw = parseFloat(deductedWeight) || 0;
    return Math.max(0, netWeight - dw);
  }, [netWeight, deductedWeight]);

  // Freight calculation (REQ-ARR-012)
  const freightTotal = useMemo(() => {
    if (noRental) return 0;
    const rate = parseFloat(freightRate) || 0;
    switch (freightMethod) {
      case 'BY_WEIGHT': return finalBillableWeight * rate;
      case 'BY_COUNT': {
        const totalBags = sellers.reduce((s, sel) => s + sel.lots.reduce((ls, l) => ls + l.quantity, 0), 0);
        return totalBags * rate;
      }
      case 'LUMPSUM': return rate;
      case 'DIVIDE_BY_WEIGHT': return rate; // Distributed proportionally later (REQ-ARR-002)
      default: return 0;
    }
  }, [freightMethod, freightRate, noRental, finalBillableWeight, sellers]);

  // REQ-CON-004 / REQ-ARR-007: Unified contact search via mark or phone
  const filteredContacts = useMemo(() => {
    if (!sellerSearch) return [];
    const q = sellerSearch.toLowerCase();
    return contacts.filter(c =>
      (c.name?.toLowerCase()?.includes(q)) ||
      (c.phone?.includes(q)) ||
      (c.mark?.toLowerCase()?.includes(q))
    ).slice(0, 5);
  }, [sellerSearch, contacts]);

  const addSeller = (contact: Contact) => {
    if (sellers.some(s => s.contact_id === contact.contact_id)) {
      toast.error('Seller already added to this vehicle');
      return;
    }
    const newSeller: SellerEntry = {
      seller_vehicle_id: crypto.randomUUID(),
      contact_id: contact.contact_id,
      seller_name: contact.name,
      seller_phone: contact.phone,
      seller_mark: contact.mark || '',
      lots: [],
    };
    setSellers(prev => [...prev, newSeller]);
    setSellerSearch('');
    setSellerDropdown(false);
  };

  const removeSeller = (idx: number) => {
    setSellers(prev => prev.filter((_, i) => i !== idx));
  };

  // REQ-ARR-005: Lot Identification
  const addLot = (sellerIdx: number) => {
    setSellers(prev => prev.map((s, i) => {
      if (i !== sellerIdx) return s;
      return {
        ...s,
        lots: [...s.lots, {
          lot_id: crypto.randomUUID(),
          lot_name: '',
          quantity: 0,
          commodity_name: commodities[0]?.commodity_name || '',
          broker_tag: '',
        }],
      };
    }));
  };

  const updateLot = (sellerIdx: number, lotIdx: number, updates: Partial<LotEntry>) => {
    setSellers(prev => prev.map((s, i) => {
      if (i !== sellerIdx) return s;
      return {
        ...s,
        lots: s.lots.map((l, li) => li === lotIdx ? { ...l, ...updates } : l),
      };
    }));
  };

  const removeLot = (sellerIdx: number, lotIdx: number) => {
    setSellers(prev => prev.map((s, i) => {
      if (i !== sellerIdx) return s;
      return { ...s, lots: s.lots.filter((_, li) => li !== lotIdx) };
    }));
  };

  // REQ-ARR-013: Outlier validation (uses commodity config from API)
  const validateWeightOutliers = (): string[] => {
    const warnings: string[] = [];
    sellers.forEach(seller => {
      seller.lots.forEach(lot => {
        const comm = commodities.find((cm: any) => cm.commodity_name === lot.commodity_name);
        const fullCfg = comm ? commodityConfigs.find((c: any) => String(c.commodityId) === String(comm.commodity_id)) : null;
        const cfg = fullCfg?.config;
        if (cfg && cfg.minWeight > 0 && cfg.maxWeight > 0) {
          if (lot.quantity < cfg.minWeight / 50 || lot.quantity > cfg.maxWeight / 10) {
            warnings.push(`⚠️ ${lot.lot_name || 'Unnamed lot'} (${lot.commodity_name}): Quantity ${lot.quantity} bags may be outside normal range`);
          }
        }
      });
    });
    return warnings;
  };

  const handleSubmitArrival = async () => {
    // Validation
    if (isMultiSeller && !vehicleNumber.trim()) {
      toast.error('Vehicle number is required for multi-seller arrivals');
      return;
    }
    if (sellers.length === 0) {
      toast.error('At least one seller is required');
      return;
    }
    for (const seller of sellers) {
      if (seller.lots.length === 0) {
        toast.error(`${seller.seller_name}: At least one lot is required`);
        return;
      }
      for (const lot of seller.lots) {
        if (!lot.lot_name.trim()) {
          toast.error(`${seller.seller_name}: Lot name is required`);
          return;
        }
        if (lot.quantity <= 0) {
          toast.error(`${seller.seller_name} → ${lot.lot_name}: Quantity must be > 0`);
          return;
        }
      }
    }

    // REQ-ARR-013: Outlier warnings
    const warnings = validateWeightOutliers();
    if (warnings.length > 0) {
      warnings.forEach(w => toast.warning(w));
    }

    if (!can('Arrivals', 'Create')) {
      toast.error('You do not have permission to create arrivals.');
      return;
    }

    try {
      const toNumericContactId = (id: string): string => {
        const n = Number(id);
        if (Number.isNaN(n)) throw new Error('Use a contact from the Contacts list (numeric ID).');
        return String(n);
      };
      const payload: ArrivalCreatePayload = {
        vehicle_number: isMultiSeller ? vehicleNumber.trim().toUpperCase() || undefined : undefined,
        is_multi_seller: isMultiSeller,
        loaded_weight: parseFloat(loadedWeight) || 0,
        empty_weight: parseFloat(emptyWeight) || 0,
        deducted_weight: parseFloat(deductedWeight) || 0,
        freight_method: freightMethod,
        freight_rate: parseFloat(freightRate) || 0,
        no_rental: noRental,
        advance_paid: parseFloat(advancePaid) || 0,
        broker_name: brokerName || undefined,
        narration: narration || undefined,
        sellers: sellers.map(s => ({
          contact_id: toNumericContactId(s.contact_id),
          seller_name: s.seller_name,
          seller_phone: s.seller_phone,
          seller_mark: s.seller_mark || undefined,
          lots: s.lots.map(l => ({
            lot_name: l.lot_name,
            quantity: l.quantity,
            commodity_name: l.commodity_name,
            broker_tag: l.broker_tag || undefined,
          })),
        })),
      };
      const created = await arrivalsApi.create(payload);
      await loadArrivalsFromApi();
      resetForm();
      setShowAdd(false);
      setDesktopTab('summary');
      toast.success(`✅ Vehicle ${created.vehicleNumber} registered with ${created.sellerCount} seller(s) and ${created.lotCount} lot(s)`);
    } catch (err) {
      console.error('Submit arrival error:', err);
      const message = err instanceof Error ? err.message : 'Failed to submit arrival. Please try again.';
      toast.error(message);
    }
  };

  const resetForm = () => {
    setStep(1);
    setVehicleNumber('');
    setLoadedWeight('');
    setEmptyWeight('');
    setDeductedWeight('');
    setFreightMethod('BY_WEIGHT');
    setFreightRate('');
    setNoRental(false);
    setAdvancePaid('');
    setBrokerName('');
    setNarration('');
    setGodown('');
    setGatepassNumber('');
    setSellers([]);
    setSellerSearch('');
    setIsMultiSeller(true);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 pt-[max(2rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(123,97,255,0.2)_0%,transparent_40%)]" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
                animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
            ))}
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Arrivals</h1>
                  <p className="text-white/70 text-xs">{apiArrivalsLoading ? '…' : apiArrivals.reduce((s, a) => s + a.lotCount, 0)} lots · Inward Logistics</p>
                </div>
              </div>
              <button onClick={() => { resetForm(); setShowAdd(true); }} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DESKTOP: TAB LAYOUT ═══ */}
      {isDesktop && (
        <div className="px-8 pb-6">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 mb-6 border-b border-border/40">
            <button
              onClick={() => setDesktopTab('summary')}
              className={cn(
                "px-5 py-3 text-sm font-semibold transition-all relative",
                desktopTab === 'summary'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Summary
                <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold">{apiArrivalsLoading ? '…' : apiArrivals.length}</span>
              </div>
              {desktopTab === 'summary' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setDesktopTab('new-arrival'); resetForm(); }}
              className={cn(
                "px-5 py-3 text-sm font-semibold transition-all relative",
                desktopTab === 'new-arrival'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Arrival
              </div>
              {desktopTab === 'new-arrival' && (
                <motion.div layoutId="desktop-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {desktopTab === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {apiArrivalsLoading ? (
                  <div className="glass-card p-12 rounded-2xl text-center">
                    <p className="text-muted-foreground">Loading arrivals…</p>
                  </div>
                ) : apiArrivals.length === 0 ? (
                  <div className="glass-card p-12 rounded-2xl text-center">
                    <div className="relative mb-4 mx-auto w-16 h-16">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shadow-lg">
                        <Truck className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">No Arrivals Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Record your first vehicle arrival to start operations</p>
                    <Button onClick={() => { resetForm(); setDesktopTab('new-arrival'); }} className="bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl shadow-lg">
                      <Plus className="w-4 h-4 mr-2" /> New Arrival
                    </Button>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 bg-muted/30">
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Vehicle</th>
                          <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Sellers</th>
                          <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Lots</th>
                          <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Net Wt</th>
                          <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Freight</th>
                          <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiArrivals.map((a, i) => (
                          <motion.tr key={a.vehicleId + '-' + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold">{a.vehicleNumber}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{a.sellerCount}</td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">{a.lotCount}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{a.netWeight}kg</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{a.freightTotal > 0 ? `₹${a.freightTotal.toLocaleString()}` : '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(a.arrivalDatetime).toLocaleDateString()}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {desktopTab === 'new-arrival' && (
              <motion.div key="new-arrival" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {/* Sub-tabs: Multi-Seller / Single Seller */}
                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={() => { setIsMultiSeller(true); resetForm(); setIsMultiSeller(true); }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      isMultiSeller
                        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Truck className="w-4 h-4 inline mr-1.5" />
                    Multi Seller (Vehicle)
                  </button>
                  <button
                    onClick={() => { setIsMultiSeller(false); resetForm(); setIsMultiSeller(false); }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      !isMultiSeller
                        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Users className="w-4 h-4 inline mr-1.5" />
                    Single Seller
                  </button>
                  <p className="ml-3 text-xs text-muted-foreground">
                    {isMultiSeller ? 'Vehicle info required (e.g., Bangalore APMC)' : 'Vehicle info not required (e.g., Gadag, Byadagi APMC)'}
                  </p>
                </div>

                {/* Desktop form: two-column layout */}
                <div className="grid grid-cols-2 gap-6">
                  {/* LEFT: Vehicle & Tonnage */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <Truck className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Vehicle & Tonnage</h3>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>

                    {isMultiSeller && (
                      <div className="glass-card rounded-2xl p-4">
                        <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> Vehicle Number *
                        </label>
                        <Input placeholder="e.g., MH12AB1234" value={vehicleNumber}
                          onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                          className="h-11 rounded-xl text-sm font-medium" />
                      </div>
                    )}

                    <div className="glass-card rounded-2xl p-4 relative z-20 overflow-visible">
                      <label className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" /> Weigh Bridge
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Loaded Weight (kg)</label>
                          <Input type="number" placeholder="0" value={loadedWeight} onChange={e => setLoadedWeight(e.target.value)}
                            className="h-11 rounded-xl text-sm font-medium" min={0} />
                        </div>
                        <div>
                          <label className={cn("text-[10px] mb-1 block", isEmptyWeightInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            Empty Weight (kg) {isEmptyWeightInvalid && '⚠ Must be ≤ Loaded Weight'}
                          </label>
                          <Input type="number" placeholder="0" value={emptyWeight} onChange={e => setEmptyWeight(e.target.value)}
                            className={cn("h-11 rounded-xl text-sm font-medium", isEmptyWeightInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} min={0} />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-[10px] text-muted-foreground mb-1 block">Deducted Weight (Fuel/Dust) (kg)</label>
                        <Input type="number" placeholder="0" value={deductedWeight} onChange={e => setDeductedWeight(e.target.value)}
                          className="h-11 rounded-xl text-sm font-medium" min={0} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-3 text-center border border-blue-200/50 dark:border-blue-800/30">
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Net Weight (LW − EW)</p>
                          <p className="text-xl font-bold text-foreground">{netWeight}<span className="text-xs font-normal text-muted-foreground">kg</span></p>
                        </div>
                        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 p-3 text-center border border-violet-200/50 dark:border-violet-800/30">
                          <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Billable (NW − DW)</p>
                          <p className="text-xl font-bold text-foreground">{finalBillableWeight}<span className="text-xs font-normal text-muted-foreground">kg</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Godown</label>
                          <Input placeholder="Godown name (optional)" value={godown} onChange={e => setGodown(e.target.value)} className="h-11 rounded-xl text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Gatepass Number</label>
                          <Input placeholder="Gatepass no. (optional)" value={gatepassNumber} onChange={e => setGatepassNumber(e.target.value)} className="h-11 rounded-xl text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Broker</label>
                      <Input placeholder="Broker name (optional)" value={brokerName} onChange={e => setBrokerName(e.target.value)} className="h-11 rounded-xl text-sm" />
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" /> Freight Calculator
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {FREIGHT_METHODS.map(m => (
                          <button key={m.value} onClick={() => setFreightMethod(m.value)}
                            className={cn("py-2 rounded-xl text-xs font-semibold transition-all",
                              freightMethod === m.value ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'bg-muted/40 text-muted-foreground')}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <button onClick={() => setNoRental(!noRental)}
                          className={cn("w-14 h-8 rounded-full transition-all relative shadow-inner",
                            noRental ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/30' : 'bg-slate-300 dark:bg-slate-600')}>
                          <motion.div className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1" animate={{ x: noRental ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                        </button>
                        <span className="text-sm text-foreground font-medium">No Rental</span>
                      </div>
                      {!noRental && (
                        <>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="text-[10px] text-muted-foreground mb-1 block">Rate</label>
                              <Input type="number" placeholder="0" value={freightRate} onChange={e => setFreightRate(e.target.value)}
                                className="h-11 rounded-xl text-sm font-medium" min={0} />
                            </div>
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 text-center border border-amber-200/50 dark:border-amber-800/30 flex flex-col justify-center">
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Total Rental</p>
                              <p className="text-lg font-bold text-foreground">₹{freightTotal.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="text-[10px] text-muted-foreground mb-1 block">Advance Paid (to driver)</label>
                            <Input type="number" placeholder="0" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)}
                              className="h-11 rounded-xl text-sm font-medium" min={0} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">Narration</label>
                            <Input placeholder="e.g., Freight for vehicle arrival" value={narration} onChange={e => setNarration(e.target.value)}
                              className="h-11 rounded-xl text-sm" />
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {NARRATION_PRESETS.map(n => (
                                <button key={n} onClick={() => setNarration(n)}
                                  className={cn("px-2 py-1 rounded-lg text-[10px] font-medium transition-all",
                                    narration === n ? 'bg-amber-500 text-white' : 'bg-muted/50 text-muted-foreground')}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Sellers & Lots */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Sellers & Lots</h3>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" /> Add Seller
                      </label>
                      <div ref={sellerSearchWrapRef} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search by name, phone, or mark…"
                          value={sellerSearch}
                          onChange={e => { setSellerSearch(e.target.value); refreshDropdownPos(); setSellerDropdown(true); }}
                          onFocus={() => { if (sellerSearch) { refreshDropdownPos(); setSellerDropdown(true); } }}
                          onBlur={() => setTimeout(() => setSellerDropdown(false), 150)}
                          className="h-11 rounded-xl pl-10 text-sm"
                        />
                      </div>
                    </div>

                    {sellers.length === 0 && (
                      <div className="glass-card rounded-2xl p-8 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Search and add sellers to this arrival</p>
                      </div>
                    )}

                    {sellers.map((seller, si) => (
                      <motion.div key={seller.seller_vehicle_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{seller.seller_mark || seller.seller_name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{seller.seller_name}</p>
                              <p className="text-[10px] text-muted-foreground">{seller.seller_phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => addLot(si)} className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
                              <Plus className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={() => removeSeller(si)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {seller.lots.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2 italic">No lots. Click + to add a lot.</p>
                          )}
                          {seller.lots.map((lot, li) => (
                            <div key={lot.lot_id} className="rounded-xl border border-border/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lot {li + 1}</p>
                                <button onClick={() => removeLot(si, li)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Lot Name *</label>
                                  <Input placeholder="e.g., A1" value={lot.lot_name}
                                    onChange={e => updateLot(si, li, { lot_name: e.target.value })}
                                    className="h-9 rounded-lg text-sm" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Bags *</label>
                                  <Input type="number" placeholder="0" value={lot.quantity || ''}
                                    onChange={e => updateLot(si, li, { quantity: parseInt(e.target.value) || 0 })}
                                    className="h-9 rounded-lg text-sm" min={1} />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Commodity</label>
                                  <select value={lot.commodity_name}
                                    onChange={e => updateLot(si, li, { commodity_name: e.target.value })}
                                    className="h-9 w-full rounded-lg bg-background border border-input text-sm px-2">
                                    {commodities.map((c: any) => (
                                      <option key={c.commodity_id} value={c.commodity_name}>{c.commodity_name}</option>
                                    ))}
                                    {commodities.length === 0 && <option value="">No commodities</option>}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] text-muted-foreground mb-0.5 block">Broker Tag (Optional)</label>
                                <Input placeholder="e.g., AB" value={lot.broker_tag}
                                  onChange={e => updateLot(si, li, { broker_tag: e.target.value.toUpperCase() })}
                                  className="h-9 rounded-lg text-sm" maxLength={4} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    {/* Submit */}
                    <Button onClick={handleSubmitArrival}
                      disabled={sellers.length === 0}
                      className="w-full h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                      <FileText className="w-4 h-4 mr-2" /> Submit Arrival
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ MOBILE: List + Modal ═══ */}
      {!isDesktop && (
        <>
          <div className="px-4 space-y-2.5">
            {apiArrivalsLoading ? (
              <div className="glass-card p-8 rounded-2xl text-center">
                <p className="text-muted-foreground">Loading arrivals…</p>
              </div>
            ) : apiArrivals.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-2xl text-center">
                <div className="relative mb-4 mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center shadow-lg">
                    <Truck className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No Arrivals Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Record your first vehicle arrival to start operations</p>
                <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-xl shadow-lg">
                  <Plus className="w-4 h-4 mr-2" /> New Arrival
                </Button>
              </motion.div>
            ) : (
              apiArrivals.map((a, i) => (
                <motion.div key={a.vehicleId + '-' + i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="glass-card rounded-2xl overflow-hidden p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md">
                        <Truck className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold mr-1.5">{a.vehicleNumber}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.sellerCount} seller(s) · {a.lotCount} lot(s) · {a.netWeight}kg
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(a.arrivalDatetime).toLocaleDateString()}</span>
                    </div>
                    {a.freightTotal > 0 && (
                      <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2 flex justify-between text-xs">
                        <span className="text-muted-foreground">Freight</span>
                        <span className="font-bold text-foreground">₹{a.freightTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Mobile / Tablet Modal */}
          <AnimatePresence>
            {showAdd && (
              <>
                {/* Glassmorphism backdrop overlay — tablet only */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md hidden md:block lg:hidden"
                  onClick={() => setShowAdd(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={cn(
                    "fixed z-50 flex justify-center",
                    "inset-0 bg-background",
                    "md:inset-3 md:rounded-3xl md:border md:border-white/20 md:shadow-2xl md:bg-background/80 md:backdrop-blur-2xl",
                    "lg:inset-0 lg:rounded-none lg:border-0 lg:shadow-none lg:bg-background lg:backdrop-blur-none"
                  )}
                  style={{ WebkitBackdropFilter: 'blur(24px)' }}
                >
                <div className="w-full max-w-[480px] md:max-w-full overflow-y-auto">
                  <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 px-4 sticky top-0 z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowAdd(false)} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                          <h2 className="text-lg font-bold text-white">New Arrival</h2>
                          <p className="text-white/70 text-xs">Vehicle & Tonnage · Sellers & Lots</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pt-4 space-y-4 pb-36">
                    {/* ── Section 1: Arrival Details ── */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <Truck className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Arrival Details</h3>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>

                    <div className="glass-card rounded-2xl p-4 relative z-20 overflow-visible">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Arrival Type</label>
                      <div className="flex gap-2">
                        <button onClick={() => setIsMultiSeller(true)}
                          className={cn("flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                            isMultiSeller ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md' : 'bg-muted/40 text-muted-foreground')}>
                          Multi Seller (Vehicle)
                        </button>
                        <button onClick={() => setIsMultiSeller(false)}
                          className={cn("flex-1 py-3 rounded-xl text-sm font-semibold transition-all",
                            !isMultiSeller ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md' : 'bg-muted/40 text-muted-foreground')}>
                          Single Seller
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {isMultiSeller ? 'Vehicle info required (e.g., Bangalore APMC)' : 'Vehicle info not required (e.g., Gadag, Byadagi APMC)'}
                      </p>
                    </div>

                    {isMultiSeller && (
                      <div className="glass-card rounded-2xl p-4">
                        <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> Vehicle Number *
                        </label>
                        <Input placeholder="e.g., MH12AB1234" value={vehicleNumber}
                          onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                          className="h-12 rounded-xl text-base font-medium" />
                      </div>
                    )}

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5" /> Weigh Bridge
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Loaded Weight (kg)</label>
                          <Input type="number" placeholder="0" value={loadedWeight} onChange={e => setLoadedWeight(e.target.value)}
                            className="h-12 rounded-xl text-base font-medium" min={0} />
                        </div>
                        <div>
                          <label className={cn("text-[10px] mb-1 block", isEmptyWeightInvalid ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            Empty Weight (kg) {isEmptyWeightInvalid && '⚠ Must be ≤ Loaded Weight'}
                          </label>
                          <Input type="number" placeholder="0" value={emptyWeight} onChange={e => setEmptyWeight(e.target.value)}
                            className={cn("h-12 rounded-xl text-base font-medium", isEmptyWeightInvalid && "border-red-500 ring-2 ring-red-500/30 bg-red-50 dark:bg-red-950/20")} min={0} />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-[10px] text-muted-foreground mb-1 block">Deducted Weight (Fuel/Dust) (kg)</label>
                        <Input type="number" placeholder="0" value={deductedWeight} onChange={e => setDeductedWeight(e.target.value)}
                          className="h-12 rounded-xl text-base font-medium" min={0} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-3 text-center border border-blue-200/50 dark:border-blue-800/30">
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Net Weight (LW − EW)</p>
                          <p className="text-xl font-bold text-foreground">{netWeight}<span className="text-xs font-normal text-muted-foreground">kg</span></p>
                        </div>
                        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 p-3 text-center border border-violet-200/50 dark:border-violet-800/30">
                          <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Billable (NW − DW)</p>
                          <p className="text-xl font-bold text-foreground">{finalBillableWeight}<span className="text-xs font-normal text-muted-foreground">kg</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Godown</label>
                          <Input placeholder="Godown name (optional)" value={godown} onChange={e => setGodown(e.target.value)} className="h-12 rounded-xl" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Gatepass Number</label>
                          <Input placeholder="Gatepass no. (optional)" value={gatepassNumber} onChange={e => setGatepassNumber(e.target.value)} className="h-12 rounded-xl" />
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Broker</label>
                      <Input placeholder="Broker name (optional)" value={brokerName} onChange={e => setBrokerName(e.target.value)} className="h-12 rounded-xl" />
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" /> Freight Calculator
                      </label>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {FREIGHT_METHODS.map(m => (
                          <button key={m.value} onClick={() => setFreightMethod(m.value)}
                            className={cn("py-2 rounded-xl text-xs font-semibold transition-all",
                              freightMethod === m.value ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'bg-muted/40 text-muted-foreground')}>
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <button onClick={() => setNoRental(!noRental)}
                          className={cn("w-14 h-8 rounded-full transition-all relative shadow-inner",
                            noRental ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/30' : 'bg-slate-300 dark:bg-slate-600')}>
                          <motion.div className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1" animate={{ x: noRental ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                        </button>
                        <span className="text-sm text-foreground font-medium">No Rental</span>
                      </div>
                      {!noRental && (
                        <>
                          <div className="mb-3">
                            <label className="text-[10px] text-muted-foreground mb-1 block">Rate</label>
                            <Input type="number" placeholder="0" value={freightRate} onChange={e => setFreightRate(e.target.value)}
                              className="h-12 rounded-xl text-base font-medium" min={0} />
                          </div>
                          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 text-center border border-amber-200/50 dark:border-amber-800/30 mb-3">
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Total Rental</p>
                            <p className="text-xl font-bold text-foreground">₹{freightTotal.toLocaleString()}</p>
                          </div>
                          <div className="mb-3">
                            <label className="text-[10px] text-muted-foreground mb-1 block">Advance Paid (to driver)</label>
                            <Input type="number" placeholder="0" value={advancePaid} onChange={e => setAdvancePaid(e.target.value)}
                              className="h-12 rounded-xl text-base font-medium" min={0} />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground mb-1 block">Narration</label>
                            <Input placeholder="e.g., Freight for vehicle arrival" value={narration} onChange={e => setNarration(e.target.value)}
                              className="h-12 rounded-xl" />
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {NARRATION_PRESETS.map(n => (
                                <button key={n} onClick={() => setNarration(n)}
                                  className={cn("px-2 py-1 rounded-lg text-[10px] font-medium transition-all",
                                    narration === n ? 'bg-amber-500 text-white' : 'bg-muted/50 text-muted-foreground')}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── Section 2: Sellers & Lots ── */}
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Users className="w-3 h-3 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Sellers & Lots</h3>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>

                    <div className="glass-card rounded-2xl p-4">
                      <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Add Seller
                      </label>
                      <div ref={sellerSearchWrapRef} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input placeholder="Search by name, phone, or mark…" value={sellerSearch}
                          onChange={e => { setSellerSearch(e.target.value); refreshDropdownPos(); setSellerDropdown(true); }}
                          onFocus={() => { if (sellerSearch) { refreshDropdownPos(); setSellerDropdown(true); } }}
                          onBlur={() => setTimeout(() => setSellerDropdown(false), 150)}
                          className="h-12 rounded-xl pl-10" />
                      </div>
                    </div>

                    {sellers.length === 0 && (
                      <div className="glass-card rounded-2xl p-6 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Search and add sellers to this arrival</p>
                      </div>
                    )}

                    {sellers.map((seller, si) => (
                      <motion.div key={seller.seller_vehicle_id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{seller.seller_mark || seller.seller_name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{seller.seller_name}</p>
                              <p className="text-[10px] text-muted-foreground">{seller.seller_phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => addLot(si)} className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
                              <Plus className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={() => removeSeller(si)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {seller.lots.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2 italic">No lots. Tap + to add a lot.</p>
                          )}
                          {seller.lots.map((lot, li) => (
                            <div key={lot.lot_id} className="rounded-xl border border-border/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Lot {li + 1}</p>
                                <button onClick={() => removeLot(si, li)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Lot Name *</label>
                                  <Input placeholder="e.g., A1, Ka" value={lot.lot_name}
                                    onChange={e => updateLot(si, li, { lot_name: e.target.value })}
                                    className="h-10 rounded-lg text-sm" />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Bags *</label>
                                  <Input type="number" placeholder="0" value={lot.quantity || ''}
                                    onChange={e => updateLot(si, li, { quantity: parseInt(e.target.value) || 0 })}
                                    className="h-10 rounded-lg text-sm" min={1} />
                                </div>
                                <div>
                                  <label className="text-[9px] text-muted-foreground mb-0.5 block">Commodity</label>
                                  <select value={lot.commodity_name}
                                    onChange={e => updateLot(si, li, { commodity_name: e.target.value })}
                                    className="h-10 w-full rounded-lg bg-background border border-input text-sm px-2">
                                    {commodities.map((c: any) => (
                                      <option key={c.commodity_id} value={c.commodity_name}>{c.commodity_name}</option>
                                    ))}
                                    {commodities.length === 0 && <option value="">No commodities</option>}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] text-muted-foreground mb-0.5 block">Broker Tag (Optional)</label>
                                <Input placeholder="e.g., AB" value={lot.broker_tag}
                                  onChange={e => updateLot(si, li, { broker_tag: e.target.value.toUpperCase() })}
                                  className="h-10 rounded-lg text-sm" maxLength={4} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    {/* ── Sticky Submit Button ── */}
                    <div className="h-4" />
                  </div>

                  {/* Fixed bottom submit bar - sits above bottom nav */}
                  <div className="fixed bottom-14 left-0 right-0 z-[60] bg-background/90 backdrop-blur-xl border-t border-border/40 px-4 py-3 md:px-6">
                    <div className="max-w-[480px] md:max-w-full mx-auto">
                      <Button onClick={handleSubmitArrival}
                        disabled={sellers.length === 0}
                        className="w-full h-14 rounded-xl font-bold text-base bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                        <FileText className="w-5 h-5 mr-2" /> Submit Arrival ({sellers.length} seller{sellers.length !== 1 ? 's' : ''})
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {!isDesktop && <BottomNav />}

      {/* ── Seller search dropdown rendered via portal so it escapes all overflow:hidden parents ── */}
      {sellerDropdown && filteredContacts.length > 0 && createPortal(
        <AnimatePresence>
          <motion.div
            key="seller-dropdown-portal"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="bg-card border border-border/50 rounded-xl shadow-2xl max-h-52 overflow-y-auto"
          >
            {filteredContacts.map(c => (
              <button
                key={c.contact_id}
                onMouseDown={e => { e.preventDefault(); addSeller(c); }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 border-b border-border/20 last:border-0"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold">{c.mark || c.name.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-foreground font-medium">{c.name}</span>
                  {c.mark && <span className="text-muted-foreground text-xs ml-1">({c.mark})</span>}
                </div>
                <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">{c.phone}</span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ArrivalsPage;