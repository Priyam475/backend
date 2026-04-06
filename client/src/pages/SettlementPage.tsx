import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Search, User, Users, Package, Truck,
  Edit3, Save, Printer, PlusCircle, Receipt, Scale, Gavel, IndianRupee, Trash2, Loader2,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { printLogApi, settlementApi, arrivalsApi, commodityApi, contactApi, type PattiDTO } from '@/services/api';
import type { ArrivalFullDetail, ArrivalSellerFullDetail } from '@/services/api/arrivals';
import type { FullCommodityConfigDto } from '@/services/api/commodities';
import type { Commodity, Contact } from '@/types/models';
import { directPrint } from '@/utils/printTemplates';
import { generateSalesPattiPrintHTML, type PattiPrintData } from '@/utils/printDocumentTemplates';
import ForbiddenPage from '@/components/ForbiddenPage';
import { usePermissions } from '@/lib/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
// ── Types ─────────────────────────────────────────────────
interface SellerSettlement {
  sellerId: string;
  sellerName: string;
  sellerMark: string;
  vehicleNumber: string;
  /** Arrivals: Σ lot bag counts for this seller. */
  arrivalTotalBags?: number;
  /** Arrivals: vehicle net billable kg from weighing (shared per vehicle). */
  vehicleArrivalNetBillableKg?: number;
  /** Billing: Σ commodity-group line weights for this seller's lots. */
  billingNetWeightKg?: number;
  contactId?: string | null;
  sellerPhone?: string | null;
  fromLocation?: string;
  sellerSerialNo?: string | number;
  createdAt?: string;
  date?: string;
  lots: SettlementLot[];
}

interface SettlementLot {
  lotId: string;
  lotName: string;
  commodityName: string;
  /** Arrivals module: `lot.bag_count` (from settlement API). */
  arrivalBagCount?: number;
  /** Σ billing line weights for this lot (kg), when invoiced. */
  billingWeightKg?: number | null;
  entries: SettlementEntry[];
}

interface SettlementEntry {
  bidNumber: number;
  buyerMark: string;
  buyerName: string;
  /** Auction base bid per bag */
  rate: number;
  /** From auction; seller settlement rate = rate + presetMargin */
  presetMargin?: number;
  quantity: number;
  weight: number;
}

interface RateCluster {
  rate: number;
  totalQuantity: number;
  totalWeight: number;
  amount: number;
}

interface DeductionItem {
  key: string;
  label: string;
  amount: number;
  editable: boolean;
  autoPulled: boolean;
}

interface PattiData {
  pattiId: string;
  sellerName: string;
  rateClusters: RateCluster[];
  grossAmount: number;
  deductions: DeductionItem[];
  totalDeductions: number;
  netPayable: number;
  createdAt: string;
  useAverageWeight: boolean;
}

interface ArrivalSummaryRow {
  key: string;
  vehicleNumber: string;
  fromLocation: string;
  serialNo: string | number | null;
  dateLabel: string;
  sellerNames: string;
  lots: number;
  bids: number;
  weighed: number;
  sellerIds: string[];
  representativeSeller: SellerSettlement;
}

interface SavedArrivalSummaryRow {
  key: string;
  vehicleNumber: string;
  fromLocation: string;
  serialNo: string | number | null;
  dateLabel: string;
  sellerNames: string;
  sellerIds: string[];
  representativePattiId: number | null;
}

function InlineCalcTip({ label, lines }: { label: string; lines: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/60"
          aria-label={label}
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="z-[99999] max-w-[300px] text-xs leading-relaxed">
        <div className="space-y-0.5">
          {lines.map((line, idx) => (
            <p key={`${label}-${idx}`}>{line}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Map backend PattiDTO to form PattiData (numbers and ISO date). */
function mapPattiDTOToPattiData(dto: PattiDTO): PattiData {
  const toNum = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0);
  const rateClusters = (dto.rateClusters ?? []).map((c: { rate?: unknown; totalQuantity?: unknown; totalWeight?: unknown; amount?: unknown }) => ({
    rate: toNum(c.rate),
    totalQuantity: toNum(c.totalQuantity),
    totalWeight: toNum(c.totalWeight),
    amount: toNum(c.amount),
  }));
  const deductions: DeductionItem[] = (dto.deductions ?? []).map((d: { key?: string; label?: string; amount?: unknown; editable?: boolean; autoPulled?: boolean }) => ({
    key: d.key ?? `ded_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label: d.label ?? 'Deduction',
    amount: toNum(d.amount),
    editable: d.editable ?? true,
    autoPulled: d.autoPulled ?? false,
  }));
  const grossAmount = toNum(dto.grossAmount);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPayable = toNum(dto.netPayable);
  let createdAt = '';
  if (dto.createdAt != null) {
    if (typeof dto.createdAt === 'string') createdAt = dto.createdAt;
    else createdAt = new Date(dto.createdAt as number | Date).toISOString();
  } else {
    createdAt = new Date().toISOString();
  }
  return {
    pattiId: dto.pattiId ?? '',
    sellerName: dto.sellerName ?? '',
    rateClusters,
    grossAmount,
    deductions,
    totalDeductions,
    netPayable,
    createdAt,
    useAverageWeight: dto.useAverageWeight ?? false,
  };
}

function formatMoney2Display(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Restore per-seller expense form from saved patti deduction lines. */
function deductionsToSellerExpenseForm(deds: DeductionItem[]): SellerExpenseFormState {
  const byKey = Object.fromEntries(deds.map(d => [d.key, d.amount])) as Record<string, number>;
  return {
    freight: Number(byKey.freight ?? 0),
    unloading: Number(byKey.coolie ?? byKey.unloading ?? 0),
    weighman: Number(byKey.weighing ?? byKey.weighman ?? 0),
    cashAdvance: Number(byKey.advance ?? 0),
    gunnies: Number(byKey.gunnies ?? 0),
    others: Number(byKey.others ?? 0),
  };
}

/** Main patti deduction rows from primary seller expense state (labels for print/save). */
function buildDeductionItemsFromSellerExpenses(
  exp: SellerExpenseFormState,
  coolieMode: 'FLAT' | 'RECALCULATED',
  weighingEnabled: boolean,
  mergeWeighingIntoFreight: boolean
): DeductionItem[] {
  const coolieLabel =
    coolieMode === 'FLAT'
      ? 'Unloading (Coolie) — commodity slab'
      : 'Unloading (Coolie) — commodity slab (weight mode reference)';

  let freightAmt = exp.freight;
  let weighingAmt = weighingEnabled ? exp.weighman : 0;
  if (weighingEnabled && mergeWeighingIntoFreight) {
    freightAmt = exp.freight + exp.weighman;
    weighingAmt = 0;
  }

  const items: DeductionItem[] = [
    {
      key: 'freight',
      label: mergeWeighingIntoFreight && weighingEnabled ? 'Freight (incl. weighing)' : 'Freight',
      amount: freightAmt,
      editable: true,
      autoPulled: true,
    },
    { key: 'coolie', label: coolieLabel, amount: exp.unloading, editable: true, autoPulled: true },
  ];
  if (!(weighingEnabled && mergeWeighingIntoFreight)) {
    items.push({
      key: 'weighing',
      label: 'Weighing Charges',
      amount: weighingAmt,
      editable: true,
      autoPulled: true,
    });
  }
  items.push(
    { key: 'advance', label: 'Cash Advance', amount: exp.cashAdvance, editable: true, autoPulled: false },
    { key: 'gunnies', label: 'Gunnies', amount: exp.gunnies, editable: true, autoPulled: false },
    { key: 'others', label: 'Others', amount: exp.others, editable: true, autoPulled: false }
  );
  return items;
}

function totalSellerExpenses(
  exp: SellerExpenseFormState,
  weighingEnabled: boolean,
  mergeWeighingIntoFreight: boolean
): number {
  let freight = exp.freight;
  let w = weighingEnabled ? exp.weighman : 0;
  if (weighingEnabled && mergeWeighingIntoFreight) {
    freight = exp.freight + exp.weighman;
    w = 0;
  } else if (!weighingEnabled) {
    w = 0;
  }
  return freight + exp.unloading + w + exp.cashAdvance + exp.gunnies + exp.others;
}

// ── Validation constants (from Buyer Selection Section.ini) ──
const DEDUCTION_MAX = 10_000_000;
const VEHICLE_NUMBER_MIN = 10;
const VEHICLE_NUMBER_MAX = 13;

function clampMoney(value: number, min = 0, max = DEDUCTION_MAX): number {
  return Math.max(min, Math.min(max, Math.round(value * 100) / 100));
}

function isVehicleNumberValid(v: string): boolean {
  return v.length >= VEHICLE_NUMBER_MIN && v.length <= VEHICLE_NUMBER_MAX;
}

/** Seller settlement rate per bag for patti (REQ-PUT: base bid + preset margin). */
function sellerSettlementRatePerBag(entry: SettlementEntry): number {
  const base = Number(entry.rate) || 0;
  const p = entry.presetMargin ?? 0;
  return base + (Number.isFinite(p) ? p : 0);
}

function normalizeVehicleKey(v: string | undefined): string {
  return (v ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

function totalBagsForSeller(s: SellerSettlement): number {
  return s.lots.reduce((acc, l) => acc + l.entries.reduce((a2, e) => a2 + (Number(e.quantity) || 0), 0), 0);
}

/** Sales Pad style estimate: Σ (bags × 50 kg) when actual weight not yet applied. */
function totalPadEstimateWeightForSeller(s: SellerSettlement): number {
  return s.lots.reduce(
    (acc, l) => acc + l.entries.reduce((a2, e) => a2 + (Number(e.quantity) || 0) * 50, 0),
    0
  );
}

/** Arrivals module: total bags (lot.bag_count) for this seller. */
function totalArrivalBagsForSeller(s: SellerSettlement): number {
  if (typeof s.arrivalTotalBags === 'number' && !Number.isNaN(s.arrivalTotalBags)) {
    return s.arrivalTotalBags;
  }
  return s.lots.reduce((acc, l) => acc + (Number(l.arrivalBagCount) || 0), 0);
}

/** Billing module: Σ persisted line weights for this seller's lots; falls back to pad estimate if API omitted. */
function totalBillingNetWeightForSeller(s: SellerSettlement): number {
  if (s.billingNetWeightKg != null && Number.isFinite(Number(s.billingNetWeightKg))) {
    return Number(s.billingNetWeightKg);
  }
  return totalPadEstimateWeightForSeller(s);
}

function vehicleArrivalNetBillableKgForSeller(s: SellerSettlement): number | null {
  if (s.vehicleArrivalNetBillableKg == null || !Number.isFinite(Number(s.vehicleArrivalNetBillableKg))) {
    return null;
  }
  return Number(s.vehicleArrivalNetBillableKg);
}

function roundMoney2(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

/**
 * Coolie / weighman (unloading) slab at lot level:
 * If actual weight is greater than threshold: perKg = (F × actual) / threshold, total = perKg × actual.
 * If actual weight is at or below threshold: total = F × threshold.
 */
function computeSlabChargeTotal(actualWeight: number, fixedRate: number, threshold: number): number {
  const w = Math.max(0, Number(actualWeight) || 0);
  const T = Math.max(0, Number(threshold) || 0);
  const F = Math.max(0, Number(fixedRate) || 0);
  if (T <= 0) return 0;
  if (w > T) {
    const perKg = (F * w) / T;
    return perKg * w;
  }
  return F * T;
}

function findArrivalSellerForSettlement(
  arrival: ArrivalFullDetail,
  settlement: SellerSettlement
): ArrivalSellerFullDetail | undefined {
  const sellers = arrival.sellers ?? [];
  const byMark = sellers.find(
    x =>
      (x.sellerName || '').trim().toLowerCase() === (settlement.sellerName || '').trim().toLowerCase() &&
      (x.sellerMark || '').trim().toLowerCase() === (settlement.sellerMark || '').trim().toLowerCase()
  );
  if (byMark) return byMark;
  return sellers.find(
    x => (x.sellerName || '').trim().toLowerCase() === (settlement.sellerName || '').trim().toLowerCase()
  );
}

function bagsFromArrivalSeller(arrivalSeller: ArrivalSellerFullDetail | undefined): number {
  if (!arrivalSeller) return 0;
  return arrivalSeller.lots.reduce((a, l) => a + (Number(l.bagCount) || 0), 0);
}

function formatOptionalKg(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

function formatOptionalInt(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(Math.round(value));
}

function formatRupeeInr(value: number): string {
  return `₹ ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Same visual language as Billing commodity read-only cells (computed fields). */
const settlementReadOnlyCellClass =
  'h-9 lg:h-8 min-h-[2.25rem] px-2 lg:px-1.5 border border-dashed border-border/70 rounded-md bg-muted/50 text-muted-foreground inline-flex items-center justify-center w-full text-xs lg:text-[11px] cursor-not-allowed shadow-inner select-text tabular-nums';

/** Uniform editable expense amount fields (per seller). */
const settlementExpenseInputClass =
  'h-9 w-full min-w-[5.5rem] max-w-[6.75rem] rounded-md border border-border bg-background px-2 text-right text-xs tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** Per-seller registration (Sales report): registered = linked to contact registry. */
interface SellerRegFormState {
  registered: boolean;
  contactId: string | null;
  mark: string;
  name: string;
  mobile: string;
  contactSearchQuery: string;
}

interface SellerExpenseFormState {
  freight: number;
  unloading: number;
  weighman: number;
  cashAdvance: number;
  gunnies: number;
  others: number;
}

/** Vehicle-level expense lines (Add Expense modal). */
interface VehicleExpenseRow {
  id: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  freight: number;
  unloading: number;
  weighing: number;
  gunnies: number;
}

/** Add Voucher modal — selection maps to cash advance later (API TBD). */
interface VoucherPickRow {
  id: string;
  voucher: string;
  narration: string;
  receivable: number;
  remaining: number;
  received: number;
}

/** Distribute total lot weight across entries (billing total or sum of entry weights). */
function distributeLotEntryWeights(lot: SettlementLot, totalW: number): number[] {
  const sumEw = lot.entries.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  const qty = lot.entries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
  return lot.entries.map(e => {
    const ew = Number(e.weight) || 0;
    const q = Number(e.quantity) || 0;
    if (sumEw > 0) return (ew / sumEw) * totalW;
    if (qty > 0) return (q / qty) * totalW;
    return 0;
  });
}

/**
 * Lot-level Sales Patti row: amount = Σ (distributedWeight × rate per bag) / commodity divisor (same as Billing).
 */
function lotBaseSalesRow(lot: SettlementLot, divisor: number) {
  const div = divisor > 0 ? divisor : 50;
  const qty = lot.entries.reduce((s, e) => s + (Number(e.quantity) || 0), 0);
  const sumEntryW = lot.entries.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  const bw = lot.billingWeightKg;
  const useBilling = bw != null && Number.isFinite(Number(bw)) && Number(bw) > 0;
  const weight = useBilling ? Number(bw) : sumEntryW;
  const itemLabel = lot.lotName || lot.commodityName || '—';
  if (qty <= 0 || weight <= 0) {
    return {
      itemLabel,
      qty,
      weight,
      avg: 0,
      ratePerBag: 0,
      amount: 0,
      divisor: div,
    };
  }
  const distW = distributeLotEntryWeights(lot, weight);
  let amount = 0;
  lot.entries.forEach((e, i) => {
    const w = distW[i] ?? 0;
    amount += (w * sellerSettlementRatePerBag(e)) / div;
  });
  amount = roundMoney2(amount);
  const ratePerBag = weight > 0 ? roundMoney2((amount * div) / weight) : 0;
  const avg = qty > 0 ? weight / qty : 0;
  return {
    itemLabel,
    qty,
    weight,
    avg,
    ratePerBag,
    amount,
    divisor: div,
  };
}

/** User edits in Sales report table (per lot row). */
interface LotSalesOverride {
  qty?: number;
  weight?: number;
  /** Seller settlement rate per bag (₹/bag), aligned with Billing new-rate / divisor model. */
  ratePerBag?: number;
}

function hasLotSalesOverride(o: LotSalesOverride | undefined): boolean {
  if (!o) return false;
  return o.qty !== undefined || o.weight !== undefined || o.ratePerBag !== undefined;
}

/** Merge API lot totals with optional user overrides. Amount = (weight × rate per bag) / divisor. */
function mergeLotDisplayRow(lot: SettlementLot, o: LotSalesOverride | undefined, divisor: number) {
  const base = lotBaseSalesRow(lot, divisor);
  if (!hasLotSalesOverride(o)) return base;
  const qty = o!.qty !== undefined ? o!.qty : base.qty;
  const weight = o!.weight !== undefined ? o!.weight : base.weight;
  const div = base.divisor;
  const ratePerBag = o!.ratePerBag !== undefined ? o!.ratePerBag : base.ratePerBag;
  const amount = roundMoney2((weight * ratePerBag) / div);
  const avg = qty > 0 ? weight / qty : 0;
  return {
    ...base,
    qty,
    weight,
    avg,
    ratePerBag,
    amount,
  };
}

/** Stable row id for delete/hide when `lotId` is missing from API. */
function lotStableId(lot: SettlementLot, index: number): string {
  if (lot.lotId && String(lot.lotId).trim()) return String(lot.lotId).trim();
  return `__idx_${index}_${encodeURIComponent(lot.lotName || '')}_${encodeURIComponent(lot.commodityName || '')}`;
}

/** Lot-level unloading (hamali slab) + weighing (commodity threshold/charge) using Sales report weights. */
function sumLotSlabChargesForSeller(
  seller: SellerSettlement,
  removed: Set<string>,
  lotOv: Record<string, LotSalesOverride>,
  nameToId: Map<string, number>,
  configById: Map<number, FullCommodityConfigDto>,
  getDivisor: (lot: SettlementLot) => number
): { unloading: number; weighing: number } {
  let unloading = 0;
  let weighing = 0;
  seller.lots.forEach((lot, i) => {
    const sid = lotStableId(lot, i);
    if (removed.has(sid)) return;
    const merged = mergeLotDisplayRow(lot, lotOv[sid], getDivisor(lot));
    const actualW = merged.weight;
    const cname = (lot.commodityName || '').trim();
    if (!cname) return;
    const cid = nameToId.get(cname.toLowerCase());
    if (cid == null) return;
    const full = configById.get(cid);
    if (!full?.config) return;

    const slabs = [...(full.hamaliSlabs ?? [])].sort((a, b) => a.thresholdWeight - b.thresholdWeight);
    const slab = slabs[0];
    if (slab && slab.thresholdWeight > 0) {
      unloading += computeSlabChargeTotal(actualW, slab.fixedRate, slab.thresholdWeight);
    }

    const cfg = full.config;
    const wTh = cfg.weighingThreshold ?? 0;
    const wCh = cfg.weighingCharge ?? 0;
    if (wTh > 0) {
      weighing += computeSlabChargeTotal(actualW, wCh, wTh);
    }
  });
  return { unloading, weighing };
}

function buildRateClustersFromSellerLots(
  seller: SellerSettlement,
  removedIds: Set<string>,
  lotOverrides?: Record<string, LotSalesOverride>,
  getDivisor?: (lot: SettlementLot) => number
): RateCluster[] {
  const divFn = getDivisor ?? (() => 50);
  const rateMap = new Map<number, RateCluster>();
  seller.lots.forEach((lot, i) => {
    const sid = lotStableId(lot, i);
    if (removedIds.has(sid)) return;
    const ov = lotOverrides?.[sid];
    const row = mergeLotDisplayRow(lot, ov, divFn(lot));
    const ratePerBag = row.ratePerBag;
    const qty = row.qty;
    const weight = row.weight;
    const amount = row.amount;
    const existing = rateMap.get(ratePerBag);
    if (existing) {
      existing.totalQuantity += qty;
      existing.totalWeight += weight;
      existing.amount += amount;
    } else {
      rateMap.set(ratePerBag, {
        rate: ratePerBag,
        totalQuantity: qty,
        totalWeight: weight,
        amount,
      });
    }
  });
  return Array.from(rateMap.values()).sort((a, b) => b.rate - a.rate);
}

function defaultSellerExpenses(): SellerExpenseFormState {
  return { freight: 0, unloading: 0, weighman: 0, cashAdvance: 0, gunnies: 0, others: 0 };
}

function buildSellerSubPattiPrintData(
  seller: SellerSettlement,
  displayName: string,
  expenses: SellerExpenseFormState,
  removedIds: Set<string>,
  pattiId: string,
  createdAt: string,
  lotOverrides?: Record<string, LotSalesOverride>,
  getDivisor?: (lot: SettlementLot) => number
): PattiPrintData {
  const rateClusters = buildRateClustersFromSellerLots(seller, removedIds, lotOverrides, getDivisor);
  const grossAmount = rateClusters.reduce((s, c) => s + c.amount, 0);
  const deductions = [
    { key: 'freight', label: 'Freight Amount', amount: expenses.freight, autoPulled: false },
    { key: 'unloading', label: 'Unloading Charges', amount: expenses.unloading, autoPulled: false },
    { key: 'weighman', label: 'Weighman Charges', amount: expenses.weighman, autoPulled: false },
    { key: 'advance', label: 'Cash Advance', amount: expenses.cashAdvance, autoPulled: false },
    { key: 'gunnies', label: 'Gunnies', amount: expenses.gunnies, autoPulled: false },
    { key: 'others', label: 'Others', amount: expenses.others, autoPulled: false },
  ];
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const subLabel = pattiId ? `${pattiId} · Sub` : 'Sub-patti';
  return {
    pattiId: subLabel,
    sellerName: displayName,
    rateClusters,
    grossAmount,
    deductions,
    totalDeductions,
    netPayable: grossAmount - totalDeductions,
    createdAt,
    useAverageWeight: false,
  };
}

function isSellerRegDirty(current: SellerRegFormState | undefined, baseline: SellerRegFormState | undefined): boolean {
  if (!current || !baseline) return false;
  return (
    current.registered !== baseline.registered ||
    (current.contactId ?? '') !== (baseline.contactId ?? '') ||
    current.mark !== baseline.mark ||
    current.name !== baseline.name ||
    current.mobile !== baseline.mobile
  );
}

function defaultSellerForm(seller: SellerSettlement): SellerRegFormState {
  const cid = seller.contactId != null && String(seller.contactId).trim() !== '' ? String(seller.contactId).trim() : null;
  return {
    registered: !!cid,
    contactId: cid,
    mark: seller.sellerMark || '',
    name: seller.sellerName || '',
    mobile: (seller.sellerPhone ?? '').trim(),
    contactSearchQuery: '',
  };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const SettlementPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { canAccessModule, can } = usePermissions();
  const canView = canAccessModule('Settlement');
  if (!canView) {
    return <ForbiddenPage moduleName="Settlement" />;
  }
  const [sellers, setSellers] = useState<SellerSettlement[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<SellerSettlement | null>(null);
  const [selectedArrivalSellerIds, setSelectedArrivalSellerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settlementMainTab, setSettlementMainTab] = useState<'arrival-summary' | 'create-settlements'>('arrival-summary');
  const [arrivalSummaryTab, setArrivalSummaryTab] = useState<'new-patti' | 'saved-patti'>('new-patti');
  const [hasArrivalSelection, setHasArrivalSelection] = useState(false);
  
  // Patti state
  const [pattiData, setPattiData] = useState<PattiData | null>(null);
  const [existingPattiId, setExistingPattiId] = useState<number | null>(null);
  const [savedPattis, setSavedPattis] = useState<PattiDTO[]>([]);
  const [loadingPattis, setLoadingPattis] = useState(false);
  const [coolieMode, setCoolieMode] = useState<'FLAT' | 'RECALCULATED'>('FLAT');
  /** Toggle 1: use weighing charges in settlement totals. */
  const [settlementWeighingEnabled, setSettlementWeighingEnabled] = useState(true);
  /** Toggle 2: merge weighing into freight for display and main patti deductions. */
  const [settlementWeighingMergeIntoFreight] = useState(false);
  const [gunniesAmount, setGunniesAmount] = useState(0);
  /** Per seller: collapsed sales report shows qty / weight / gross summary only (Billing-style). */
  const [salesReportCollapsedBySellerId, setSalesReportCollapsedBySellerId] = useState<Record<string, boolean>>({});
  const [showPrint, setShowPrint] = useState(false);

  /** Arrival freight + billing aggregates (invoiced freight & payable); optional invoice name filter. */
  const [amountSummaryFromApi, setAmountSummaryFromApi] = useState({
    arrivalFreightAmount: 0,
    freightInvoiced: 0,
    payableInvoiced: 0,
  });
  const [arrivalFreightBaseline, setArrivalFreightBaseline] = useState(0);
  const [salesPadNetWeightBaseline, setSalesPadNetWeightBaseline] = useState(0);
  const [auctionAmountBaseline, setAuctionAmountBaseline] = useState(0);
  const [auctionQtyBaseline, setAuctionQtyBaseline] = useState(0);
  const [auctionWeightBaseline, setAuctionWeightBaseline] = useState(0);
  const [invoiceNameSearch, setInvoiceNameSearch] = useState('');
  const debouncedInvoiceName = useDebouncedValue(invoiceNameSearch, 300);

  const [amountSummaryNonce, setAmountSummaryNonce] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') setAmountSummaryNonce(n => n + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const amountSummarySellerId = useMemo(() => {
    if (selectedSeller?.sellerId) return selectedSeller.sellerId;
    if (!selectedSeller) return '';
    const vKey = normalizeVehicleKey(selectedSeller.vehicleNumber);
    if (!vKey) return '';
    const candidate = sellers.find(s => normalizeVehicleKey(s.vehicleNumber) === vKey && !!s.sellerId);
    return candidate?.sellerId ?? '';
  }, [selectedSeller, sellers]);

  useEffect(() => {
    if (!amountSummarySellerId) {
      setAmountSummaryFromApi({ arrivalFreightAmount: 0, freightInvoiced: 0, payableInvoiced: 0 });
      return;
    }
    let cancelled = false;
    settlementApi
      .getSettlementAmountSummary(amountSummarySellerId, debouncedInvoiceName.trim() || undefined)
      .then(data => {
        if (!cancelled) setAmountSummaryFromApi(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAmountSummaryFromApi({ arrivalFreightAmount: 0, freightInvoiced: 0, payableInvoiced: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [amountSummarySellerId, debouncedInvoiceName, amountSummaryNonce]);

  /** Lot IDs removed from UI per seller (pending API sync). */
  const [removedLotsBySellerId, setRemovedLotsBySellerId] = useState<Record<string, string[]>>({});
  const [deleteLotConfirm, setDeleteLotConfirm] = useState<{ sellerId: string; lotId: string; itemLabel: string } | null>(
    null
  );
  const saveMainPattiShortcutRef = useRef<() => void>(() => {});
  const salesReportCarouselRef = useRef<HTMLDivElement | null>(null);
  const [activeSalesReportSlide, setActiveSalesReportSlide] = useState(0);

  const [sellerFormById, setSellerFormById] = useState<Record<string, SellerRegFormState>>({});
  const [registeredBaselineById, setRegisteredBaselineById] = useState<Record<string, SellerRegFormState>>({});
  const [sellerExpensesById, setSellerExpensesById] = useState<Record<string, SellerExpenseFormState>>({});
  const [vehicleExpenseModalOpen, setVehicleExpenseModalOpen] = useState(false);
  const [vehicleExpenseLoading, setVehicleExpenseLoading] = useState(false);
  const [vehicleExpenseRows, setVehicleExpenseRows] = useState<VehicleExpenseRow[]>([]);

  const [addVoucherSellerId, setAddVoucherSellerId] = useState<string | null>(null);
  const [voucherSearchVoucherName, setVoucherSearchVoucherName] = useState('');
  const [voucherSearchName, setVoucherSearchName] = useState('');
  const [voucherPickRows, setVoucherPickRows] = useState<VoucherPickRow[]>([]);
  const [selectedVoucherRowIds, setSelectedVoucherRowIds] = useState<Record<string, boolean>>({});

  /** Per-seller per-lot edits for Sales report qty / weight / rate per bag. */
  const [lotSalesOverridesBySellerId, setLotSalesOverridesBySellerId] = useState<
    Record<string, Record<string, LotSalesOverride>>
  >({});

  const [fullCommodityConfigs, setFullCommodityConfigs] = useState<FullCommodityConfigDto[]>([]);
  const [commodityList, setCommodityList] = useState<Commodity[]>([]);

  useEffect(() => {
    Promise.all([commodityApi.getAllFullConfigs(), commodityApi.list()])
      .then(([cfgs, comms]) => {
        setFullCommodityConfigs(Array.isArray(cfgs) ? cfgs : []);
        setCommodityList(Array.isArray(comms) ? comms : []);
      })
      .catch(() => {
        /* optional */
      });
  }, []);

  /** Same divisor source as Billing: commodity config `ratePerUnit` (bag divisor). */
  const commodityDivisorByName = useMemo(() => {
    const map: Record<string, number> = {};
    commodityList.forEach(c => {
      const name = String(c.commodity_name ?? '').trim().toLowerCase();
      if (!name) return;
      const cid = Number(c.commodity_id);
      if (!Number.isFinite(cid)) return;
      const cfg = fullCommodityConfigs.find(f => f.commodityId === cid);
      const d = Number(cfg?.config?.ratePerUnit);
      if (d > 0) map[name] = d;
    });
    return map;
  }, [fullCommodityConfigs, commodityList]);

  const commodityAvgWeightBounds = useMemo(() => {
    const map: Record<string, { min: number; max: number }> = {};
    commodityList.forEach(c => {
      const cid = Number(c.commodity_id);
      const cfg = fullCommodityConfigs.find(f => f.commodityId === cid);
      const min = Number(cfg?.config?.minWeight ?? 0);
      const max = Number(cfg?.config?.maxWeight ?? 0);
      const name = String(c.commodity_name ?? '').trim();
      if (name && (min > 0 || max > 0)) {
        map[name] = { min, max };
      }
    });
    return map;
  }, [fullCommodityConfigs, commodityList]);

  const getLotDivisor = useCallback(
    (lot: SettlementLot) => {
      const n = (lot.commodityName || '').trim().toLowerCase();
      const d = commodityDivisorByName[n];
      return d != null && d > 0 ? d : 50;
    },
    [commodityDivisorByName]
  );

  /** Contact search (registered traders) per seller card in Sales report. */
  const [sellerContactSearchById, setSellerContactSearchById] = useState<Record<string, Contact[]>>({});
  const [sellerContactSearchLoading, setSellerContactSearchLoading] = useState<Record<string, boolean>>({});
  const [sellerRegSaving, setSellerRegSaving] = useState<Record<string, boolean>>({});

  // Load sellers from backend only (no localStorage or mock data).
  useEffect(() => {
    settlementApi
      .listSellers({ page: 0, size: 500 })
      .then((apiSellers: SellerSettlement[]) => {
        setSellers(Array.isArray(apiSellers) ? apiSellers : []);
      })
      .catch(() => {
        setSellers([]);
        toast.error('Failed to load settlement sellers');
      });
  }, []);

  // Load saved pattis when on seller list (no patti open).
  const loadSavedPattis = useCallback(() => {
    setLoadingPattis(true);
    settlementApi
      .listPattis({ page: 0, size: 20 })
      .then((list: PattiDTO[]) => {
        setSavedPattis(Array.isArray(list) ? list : []);
      })
      .catch(() => setSavedPattis([]))
      .finally(() => setLoadingPattis(false));
  }, []);

  useEffect(() => {
    if (selectedSeller == null && pattiData == null) {
      loadSavedPattis();
    }
  }, [selectedSeller, pattiData, loadSavedPattis]);

  // Generate Patti when seller is selected (new patti; clear edit id).
  // Overrides: pass when toggling to avoid stale closure (React state updates are async).
  const generatePatti = useCallback((seller: SellerSettlement, overrides?: { coolieMode?: 'FLAT' | 'RECALCULATED'; gunniesAmount?: number; arrivalSellerIds?: string[] }) => {
    setExistingPattiId(null);
    setRemovedLotsBySellerId({});
    setLotSalesOverridesBySellerId({});
    setVehicleExpenseRows([]);
    setVehicleExpenseModalOpen(false);
    setSelectedSeller(seller);
    setSelectedArrivalSellerIds(overrides?.arrivalSellerIds ?? []);
    setHasArrivalSelection(true);

    if (!isVehicleNumberValid(seller.vehicleNumber)) {
      toast.warning(`Vehicle number should be ${VEHICLE_NUMBER_MIN}–${VEHICLE_NUMBER_MAX} characters`);
    }

    const rateClusters = buildRateClustersFromSellerLots(seller, new Set(), undefined, getLotDivisor);

    const grossAmount = rateClusters.reduce((sum, c) => sum + c.amount, 0);

    const effectiveCoolieMode = overrides?.coolieMode ?? coolieMode;
    const placeholderExp: SellerExpenseFormState = {
      ...defaultSellerExpenses(),
      gunnies: overrides?.gunniesAmount ?? gunniesAmount,
    };
    const baseDeductions = buildDeductionItemsFromSellerExpenses(
      placeholderExp,
      effectiveCoolieMode,
      settlementWeighingEnabled,
      settlementWeighingMergeIntoFreight
    );

    const baseTotalDeductions = baseDeductions.reduce((s, d) => s + d.amount, 0);
    const baseNetPayable = grossAmount - baseTotalDeductions;

    const createdAt = new Date().toISOString();

    setPattiData({
      pattiId: '', // Server assigns pattiId on save (PT-YYYYMMDD-NNNN).
      sellerName: seller.sellerName,
      rateClusters,
      grossAmount,
      deductions: baseDeductions,
      totalDeductions: baseTotalDeductions,
      netPayable: baseNetPayable,
      createdAt,
      useAverageWeight: false,
    });
  }, [coolieMode, gunniesAmount, getLotDivisor, settlementWeighingEnabled, settlementWeighingMergeIntoFreight]);

  // Open a saved patti for edit: fetch by id and pre-fill form.
  const openPattiForEdit = useCallback(async (id: number, arrivalSellerIds?: string[]) => {
    try {
      const dto = await settlementApi.getPattiById(id);
      if (!dto) {
        toast.error('Patti not found');
        return;
      }
      setRemovedLotsBySellerId({});
      setLotSalesOverridesBySellerId({});
      setVehicleExpenseRows([]);
      setVehicleExpenseModalOpen(false);
      const data = mapPattiDTOToPattiData(dto);
      if (data.createdAt && new Date(data.createdAt) > new Date()) {
        toast.warning('Patti date is in the future — please verify');
      }
      setPattiData(data);
      setExistingPattiId(dto.id ?? id);
      setSelectedArrivalSellerIds(arrivalSellerIds ?? []);
      const sid = String(dto.sellerId ?? '');
      if (sid) {
        setSellerExpensesById(prev => ({
          ...prev,
          [sid]: { ...defaultSellerExpenses(), ...deductionsToSellerExpenseForm(dto.deductions ?? []) },
        }));
      }
      setSelectedSeller({
        sellerId: dto.sellerId ?? '',
        sellerName: dto.sellerName ?? '',
        sellerMark: '',
        vehicleNumber: '',
        lots: [],
      });
    } catch {
      toast.error('Failed to load patti');
    }
  }, []);

  // Save patti via backend: update if editing existing, else create.
  const savePatti = async () => {
    if (!pattiData) return;
    const payload = {
      sellerId: selectedSeller?.sellerId,
      sellerName: pattiData.sellerName,
      rateClusters: pattiData.rateClusters,
      grossAmount: pattiData.grossAmount,
      deductions: pattiData.deductions,
      totalDeductions: pattiData.totalDeductions,
      netPayable: pattiData.netPayable,
      useAverageWeight: pattiData.useAverageWeight,
    };
    if (!can('Settlement', existingPattiId != null ? 'Edit' : 'Create')) {
      toast.error('You do not have permission to save settlements.');
      return;
    }
    try {
      if (existingPattiId != null) {
        const updated = await settlementApi.updatePatti(existingPattiId, payload);
        if (updated) {
          setPattiData(prev =>
            prev ? { ...prev, pattiId: updated.pattiId ?? prev.pattiId, createdAt: updated.createdAt ?? prev.createdAt } : null
          );
          toast.success(`Sales Patti ${updated.pattiId} updated!`);
          setShowPrint(true);
          loadSavedPattis();
        } else {
          toast.error('Failed to update patti');
        }
      } else {
        const created = await settlementApi.createPatti(payload);
        if (created?.pattiId) {
          setPattiData(prev =>
            prev ? { ...prev, pattiId: created.pattiId, createdAt: created.createdAt ?? prev.createdAt } : null
          );
          if (created?.id != null) setExistingPattiId(created.id);
          toast.success(`Sales Patti ${created.pattiId} saved!`);
          setShowPrint(true);
          loadSavedPattis();
        } else {
          toast.error('Failed to save patti');
        }
      }
    } catch {
      toast.error(existingPattiId != null ? 'Failed to update patti' : 'Failed to save patti');
    }
  };

  saveMainPattiShortcutRef.current = () => {
    void savePatti();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 's' && e.key !== 'S')) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      saveMainPattiShortcutRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const getSellerLots = (seller: SellerSettlement): number =>
    seller.lots.reduce((s, l) => s + l.entries.reduce((s2, e) => s2 + e.quantity, 0), 0);

  const getSellerBids = (seller: SellerSettlement): number =>
    seller.lots.reduce((s, l) => s + l.entries.length, 0);

  const getSellerWeighed = (seller: SellerSettlement): number =>
    seller.lots.reduce((s, l) => s + l.entries.reduce((s2, e) => s2 + (e.weight > 0 ? e.quantity : 0), 0), 0);

  const filteredSellers = useMemo(() => {
    if (!searchQuery) return sellers;
    const q = searchQuery.toLowerCase();
    return sellers.filter(s =>
      s.sellerName.toLowerCase().includes(q) ||
      s.sellerMark.toLowerCase().includes(q) ||
      s.vehicleNumber.toLowerCase().includes(q)
    );
  }, [sellers, searchQuery]);

  const filteredSavedPattis = useMemo(() => {
    if (!searchQuery) return savedPattis;
    const q = searchQuery.toLowerCase();
    return savedPattis.filter(p =>
      (p.pattiId ?? '').toLowerCase().includes(q) ||
      (p.sellerName ?? '').toLowerCase().includes(q)
    );
  }, [savedPattis, searchQuery]);

  const newPattiArrivalRows = useMemo<ArrivalSummaryRow[]>(() => {
    const groups = new Map<string, ArrivalSummaryRow>();
    for (const seller of filteredSellers) {
      const v = (seller.vehicleNumber || '').trim();
      const from = (seller.fromLocation || '').trim();
      const dateRaw = seller.createdAt ?? seller.date ?? '';
      const dateObj = dateRaw ? new Date(dateRaw) : null;
      const dateLabel = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : '-';
      const key = [v.toLowerCase(), from.toLowerCase(), dateRaw].join('|');
      const existing = groups.get(key);
      const lots = getSellerLots(seller);
      const bids = getSellerBids(seller);
      const weighed = getSellerWeighed(seller);
      if (!existing) {
        groups.set(key, {
          key,
          vehicleNumber: v || '-',
          fromLocation: from || '-',
          serialNo: seller.sellerSerialNo ?? null,
          dateLabel,
          sellerNames: seller.sellerName || '-',
          lots,
          bids,
          weighed,
          sellerIds: [seller.sellerId],
          representativeSeller: seller,
        });
        continue;
      }
      const nameSet = new Set(
        `${existing.sellerNames}, ${seller.sellerName || ''}`
          .split(',')
          .map(x => x.trim())
          .filter(Boolean)
      );
      existing.sellerNames = Array.from(nameSet).join(', ');
      existing.lots += lots;
      existing.bids += bids;
      existing.weighed += weighed;
      if (!existing.sellerIds.includes(seller.sellerId)) existing.sellerIds.push(seller.sellerId);
      if (existing.serialNo == null && seller.sellerSerialNo != null) existing.serialNo = seller.sellerSerialNo;
    }
    return Array.from(groups.values());
  }, [filteredSellers]);

  const savedPattiArrivalRows = useMemo<SavedArrivalSummaryRow[]>(() => {
    const groups = new Map<string, SavedArrivalSummaryRow>();
    for (const p of filteredSavedPattis) {
      const vehicleNumber = (p.vehicleNumber || '').trim();
      const fromLocation = (p.fromLocation || '').trim();
      const serialNo = p.sellerSerialNo ?? null;
      const dateRaw = (p.date ?? p.createdAt ?? '').toString();
      const dateObj = dateRaw ? new Date(dateRaw) : null;
      const dateLabel = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : '-';
      const key = [vehicleNumber.toLowerCase(), fromLocation.toLowerCase(), dateRaw].join('|');
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          vehicleNumber: vehicleNumber || '-',
          fromLocation: fromLocation || '-',
          serialNo,
          dateLabel,
          sellerNames: p.sellerName || '-',
          sellerIds: p.sellerId ? [String(p.sellerId)] : [],
          representativePattiId: p.id ?? null,
        });
        continue;
      }
      const nameSet = new Set(
        `${existing.sellerNames}, ${p.sellerName || ''}`
          .split(',')
          .map(x => x.trim())
          .filter(Boolean)
      );
      existing.sellerNames = Array.from(nameSet).join(', ');
      if (p.sellerId) {
        const sid = String(p.sellerId);
        if (!existing.sellerIds.includes(sid)) existing.sellerIds.push(sid);
      }
      if (existing.serialNo == null && serialNo != null) existing.serialNo = serialNo;
      if (existing.representativePattiId == null && p.id != null) existing.representativePattiId = p.id;
    }
    return Array.from(groups.values());
  }, [filteredSavedPattis]);

  /** Vehicle-level summary for the patti form (first row unchanged; this drives the second card). */
  const vehicleFormDetails = useMemo(() => {
    if (!selectedSeller || !pattiData) return null;

    const vKey = normalizeVehicleKey(selectedSeller.vehicleNumber);
    const sameVehicleSellers = vKey ? sellers.filter(s => normalizeVehicleKey(s.vehicleNumber) === vKey) : [];
    const scope = sameVehicleSellers.length > 0 ? sameVehicleSellers : [selectedSeller];
    const pattiNetWeight = scope.reduce((sum, seller) => {
      const removed = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const ov = lotSalesOverridesBySellerId[seller.sellerId];
      const recountClusters = buildRateClustersFromSellerLots(seller, removed, ov, getLotDivisor);
      return sum + recountClusters.reduce((s, c) => s + (Number(c.totalWeight) || 0), 0);
    }, 0);

    const scopeHasLotData = scope.some(s => s.lots.some(l => (l.entries?.length ?? 0) > 0));

    let arrivalWeightVehicleKg: number | null = null;
    for (const s of scope) {
      const w = vehicleArrivalNetBillableKgForSeller(s);
      if (w != null) {
        arrivalWeightVehicleKg = w;
        break;
      }
    }

    const arrivalQty = scope.reduce((acc, s) => acc + totalArrivalBagsForSeller(s), 0);
    const salesPadNetWeight = scope.reduce((acc, s) => acc + totalBillingNetWeightForSeller(s), 0);

    return {
      vKey,
      sellersCount: vKey ? scope.length : null,
      arrivalQty: scopeHasLotData ? arrivalQty : null,
      arrivalWeightKg: scopeHasLotData ? arrivalWeightVehicleKg : null,
      salesPadNetWeightKg: scopeHasLotData ? salesPadNetWeight : null,
      pattiNetWeightKg: pattiNetWeight,
    };
  }, [sellers, selectedSeller, pattiData, removedLotsBySellerId, lotSalesOverridesBySellerId, getLotDivisor]);

  /** All sellers on the same vehicle as the current settlement (arrival scope). */
  const arrivalSellersForPatti = useMemo(() => {
    if (!selectedSeller || !pattiData) return [];
    if (selectedArrivalSellerIds.length > 0) {
      const scoped = sellers.filter(s => selectedArrivalSellerIds.includes(s.sellerId));
      if (scoped.length > 0) return scoped;
    }
    const vKey = normalizeVehicleKey(selectedSeller.vehicleNumber);
    if (!vKey) return [selectedSeller];
    const scope = sellers.filter(s => normalizeVehicleKey(s.vehicleNumber) === vKey);
    return scope.length > 0 ? scope : [selectedSeller];
  }, [sellers, selectedSeller, pattiData, selectedArrivalSellerIds]);

  const arrivalSalesReportSellerIdsKey = useMemo(
    () => arrivalSellersForPatti.map(s => s.sellerId).join(','),
    [arrivalSellersForPatti]
  );
  const arrivalFreightBaselineKey = useMemo(
    () => `${selectedSeller?.sellerId ?? ''}__${arrivalSalesReportSellerIdsKey}__${pattiData?.createdAt ?? ''}`,
    [selectedSeller?.sellerId, arrivalSalesReportSellerIdsKey, pattiData?.createdAt]
  );

  /** Vehicle-level net payable across all visible seller cards in current patti scope. */
  const vehicleNetPayableFromPatti = useMemo(() => {
    if (!selectedSeller || !pattiData || arrivalSellersForPatti.length === 0) return 0;
    return arrivalSellersForPatti.reduce((sum, seller) => {
      const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
      const removedSet = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const lotOv = lotSalesOverridesBySellerId[seller.sellerId] ?? {};
      const amountTot = (seller.lots ?? [])
        .map((lot, i) => ({ lot, sid: lotStableId(lot, i) }))
        .filter(x => !removedSet.has(x.sid))
        .map(({ lot, sid }) => mergeLotDisplayRow(lot, lotOv[sid], getLotDivisor(lot)))
        .reduce((s, r) => s + r.amount, 0);
      const expenseTotal = totalSellerExpenses(exp, settlementWeighingEnabled, settlementWeighingMergeIntoFreight);
      return sum + (expenseTotal - amountTot);
    }, 0);
  }, [
    selectedSeller,
    pattiData,
    arrivalSellersForPatti,
    sellerExpensesById,
    removedLotsBySellerId,
    lotSalesOverridesBySellerId,
    getLotDivisor,
    settlementWeighingEnabled,
    settlementWeighingMergeIntoFreight,
  ]);

  const amountSummaryDisplay = useMemo(() => {
    const runtimeFreight = arrivalSellersForPatti.reduce((sum, s) => {
      const exp = sellerExpensesById[s.sellerId];
      return sum + (exp?.freight ?? 0);
    }, 0);
    const runtimeInvoicePayable = vehicleNetPayableFromPatti;
    /** Vehicle total: API (FreightCalculation), else arrivals list scan, else sum of per-seller freight shares (same as Quick Expenses). */
    const apiArrival = amountSummaryFromApi.arrivalFreightAmount;
    const arrivalDisplay =
      apiArrival > 0 ? apiArrival : arrivalFreightBaseline > 0 ? arrivalFreightBaseline : runtimeFreight;
    return {
      arrivalFreightAmount: arrivalDisplay,
      freightInvoiced:
        amountSummaryFromApi.freightInvoiced > 0 ? amountSummaryFromApi.freightInvoiced : runtimeFreight,
      payableInvoiced:
        amountSummaryFromApi.payableInvoiced !== 0 ? amountSummaryFromApi.payableInvoiced : runtimeInvoicePayable,
    };
  }, [arrivalSellersForPatti, sellerExpensesById, amountSummaryFromApi, vehicleNetPayableFromPatti, arrivalFreightBaseline]);

  useEffect(() => {
    if (!selectedSeller || !pattiData) {
      setArrivalFreightBaseline(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const candidateVehicle =
        selectedSeller.vehicleNumber ||
        arrivalSellersForPatti.find(s => (s.vehicleNumber || '').trim().length > 0)?.vehicleNumber ||
        '';
      const vKey = normalizeVehicleKey(candidateVehicle);
      let fromArrival = 0;
      if (vKey) {
        try {
          const size = 200;
          for (let page = 0; page < 25; page += 1) {
            const summaries = await arrivalsApi.list(page, size);
            if (!Array.isArray(summaries) || summaries.length === 0) break;
            const match = summaries.find(s => normalizeVehicleKey(String(s.vehicleNumber)) === vKey);
            if (match) {
              fromArrival = Number(match.freightTotal ?? 0);
              break;
            }
            if (summaries.length < size) break;
          }
        } catch {
          fromArrival = 0;
        }
      }
      if (!cancelled) setArrivalFreightBaseline(fromArrival);
    })();
    return () => {
      cancelled = true;
    };
  }, [arrivalFreightBaselineKey]);

  useEffect(() => {
    if (!selectedSeller || !pattiData) {
      setSalesPadNetWeightBaseline(0);
      setAuctionAmountBaseline(0);
      setAuctionQtyBaseline(0);
      setAuctionWeightBaseline(0);
      return;
    }
    const scope = arrivalSellersForPatti;
    const salesPad = scope.reduce((acc, s) => acc + totalBillingNetWeightForSeller(s), 0);
    const auction = scope.reduce(
      (acc, seller) => {
        const rows = (seller.lots ?? []).map(lot => lotBaseSalesRow(lot, getLotDivisor(lot)));
        return {
          qty: acc.qty + rows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
          weight: acc.weight + rows.reduce((s, r) => s + (Number(r.weight) || 0), 0),
          amount: acc.amount + rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        };
      },
      { qty: 0, weight: 0, amount: 0 }
    );
    setSalesPadNetWeightBaseline(salesPad);
    setAuctionAmountBaseline(auction.amount);
    setAuctionQtyBaseline(auction.qty);
    setAuctionWeightBaseline(auction.weight);
  }, [arrivalFreightBaselineKey]);

  const handleSalesReportCarouselScroll = useCallback(() => {
    const el = salesReportCarouselRef.current;
    const n = arrivalSellersForPatti.length;
    if (!el || n <= 0) return;
    const step = el.scrollWidth / n;
    if (step <= 0) return;
    const idx = Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / step)));
    setActiveSalesReportSlide(idx);
  }, [arrivalSellersForPatti.length]);

  useEffect(() => {
    setActiveSalesReportSlide(0);
    salesReportCarouselRef.current?.scrollTo({ left: 0 });
  }, [selectedSeller?.sellerId, arrivalSalesReportSellerIdsKey]);

  useEffect(() => {
    if (!selectedSeller || !pattiData) return;
    setSellerFormById(prev => {
      let changed = false;
      const next = { ...prev };
      for (const s of arrivalSellersForPatti) {
        if (!next[s.sellerId]) {
          changed = true;
          next[s.sellerId] = defaultSellerForm(s);
        }
      }
      return changed ? next : prev;
    });
    setRegisteredBaselineById(prev => {
      let changed = false;
      const next = { ...prev };
      for (const s of arrivalSellersForPatti) {
        if (!next[s.sellerId]) {
          changed = true;
          next[s.sellerId] = defaultSellerForm(s);
        }
      }
      return changed ? next : prev;
    });
    setSellerExpensesById(prev => {
      let changed = false;
      const next = { ...prev };
      for (const s of arrivalSellersForPatti) {
        if (!next[s.sellerId]) {
          changed = true;
          next[s.sellerId] = { freight: 0, unloading: 0, weighman: 0, cashAdvance: 0, gunnies: 0, others: 0 };
        }
      }
      return changed ? next : prev;
    });
  }, [arrivalSellersForPatti, selectedSeller, pattiData]);

  /** Pull freight / unloading / weighing / cash advance from backend (same rules as Quick Expenses). */
  useEffect(() => {
    if (!pattiData || arrivalSellersForPatti.length === 0) return;
    if (existingPattiId != null) return;
    let cancelled = false;
    void (async () => {
      for (const s of arrivalSellersForPatti) {
        try {
          const snap = await settlementApi.getSellerExpenseSnapshot(s.sellerId);
          if (cancelled) return;
          setSellerExpensesById(prev => ({
            ...prev,
            [s.sellerId]: {
              ...(prev[s.sellerId] ?? defaultSellerExpenses()),
              freight: snap.freight,
              unloading: snap.unloading,
              weighman: snap.weighing,
              cashAdvance: snap.cashAdvance,
            },
          }));
        } catch {
          /* keep existing row */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pattiData?.createdAt, arrivalSalesReportSellerIdsKey, existingPattiId]);

  /** Main patti deduction lines mirror primary seller expenses + weighing toggles. */
  useEffect(() => {
    if (!selectedSeller || !pattiData) return;
    const exp = sellerExpensesById[selectedSeller.sellerId] ?? defaultSellerExpenses();
    const deds = buildDeductionItemsFromSellerExpenses(
      exp,
      coolieMode,
      settlementWeighingEnabled,
      settlementWeighingMergeIntoFreight
    );
    const total = deds.reduce((s, d) => s + d.amount, 0);
    setPattiData(prev => {
      if (!prev) return null;
      if (Math.abs(prev.totalDeductions - total) < 1e-9 && JSON.stringify(prev.deductions) === JSON.stringify(deds)) {
        return prev;
      }
      return { ...prev, deductions: deds, totalDeductions: total, netPayable: prev.grossAmount - total };
    });
  }, [
    selectedSeller?.sellerId,
    sellerExpensesById,
    coolieMode,
    settlementWeighingEnabled,
    settlementWeighingMergeIntoFreight,
  ]);

  /** Keep main patti rate clusters / gross in sync with lot row edits (primary seller only). */
  useEffect(() => {
    if (!selectedSeller?.lots?.length) return;
    setPattiData(prev => {
      if (!prev) return null;
      const removed = new Set(removedLotsBySellerId[selectedSeller.sellerId] ?? []);
      const ov = lotSalesOverridesBySellerId[selectedSeller.sellerId];
      const clusters = buildRateClustersFromSellerLots(selectedSeller, removed, ov, getLotDivisor);
      const gross = clusters.reduce((s, c) => s + c.amount, 0);
      const sameGross = Math.abs(prev.grossAmount - gross) < 0.01;
      const sameClusters = JSON.stringify(prev.rateClusters) === JSON.stringify(clusters);
      if (sameGross && sameClusters) return prev;
      return { ...prev, rateClusters: clusters, grossAmount: gross, netPayable: gross - prev.totalDeductions };
    });
  }, [selectedSeller, removedLotsBySellerId, lotSalesOverridesBySellerId, getLotDivisor]);

  const runSellerContactSearch = useCallback(async (sellerId: string, query: string) => {
    setSellerContactSearchLoading(prev => ({ ...prev, [sellerId]: true }));
    try {
      const list = query.trim()
        ? await contactApi.search(query.trim())
        : await contactApi.list({ scope: 'participants' });
      setSellerContactSearchById(prev => ({ ...prev, [sellerId]: list }));
    } catch {
      toast.error('Contact search failed');
    } finally {
      setSellerContactSearchLoading(prev => ({ ...prev, [sellerId]: false }));
    }
  }, []);

  const sellerMarkSearchTimersRef = useRef<Record<string, number>>({});
  const scheduleMarkContactSearch = useCallback(
    (sellerId: string, query: string) => {
      window.clearTimeout(sellerMarkSearchTimersRef.current[sellerId]);
      sellerMarkSearchTimersRef.current[sellerId] = window.setTimeout(() => {
        void runSellerContactSearch(sellerId, query);
      }, 350);
    },
    [runSellerContactSearch]
  );

  const setLotSalesField = useCallback((sellerId: string, sid: string, field: keyof LotSalesOverride, raw: string) => {
    setLotSalesOverridesBySellerId(prev => {
      const curSeller = { ...(prev[sellerId] ?? {}) };
      const curLot = { ...(curSeller[sid] ?? {}) };
      if (raw.trim() === '') {
        delete curLot[field];
      } else {
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return prev;
        curLot[field] = field === 'qty' ? Math.round(n) : n;
      }
      if (Object.keys(curLot).length === 0) {
        delete curSeller[sid];
      } else {
        curSeller[sid] = curLot;
      }
      if (Object.keys(curSeller).length === 0) {
        const next = { ...prev };
        delete next[sellerId];
        return next;
      }
      return { ...prev, [sellerId]: curSeller };
    });
  }, []);

  const runPrintMainPatti = useCallback(async () => {
    if (!pattiData) return;
    const printedAt = new Date().toISOString();
    try {
      await printLogApi.create({
        reference_type: 'SALES_PATTI',
        reference_id: pattiData.pattiId,
        print_type: 'SALES_PATTI',
        printed_at: printedAt,
      });
    } catch {
      /* optional */
    }
    const ok = await directPrint(generateSalesPattiPrintHTML(pattiData), { mode: 'system' });
    if (ok) toast.success('Main patti sent to printer');
    else toast.error('Printer not connected.');
  }, [pattiData]);

  const runPrintSellerSubPatti = useCallback(
    async (seller: SellerSettlement) => {
      if (!pattiData) return;
      const form = sellerFormById[seller.sellerId] ?? defaultSellerForm(seller);
      const displayName = form.name || seller.sellerName;
      const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
      const removedSet = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const payload = buildSellerSubPattiPrintData(
        seller,
        displayName,
        exp,
        removedSet,
        pattiData.pattiId,
        pattiData.createdAt,
        lotSalesOverridesBySellerId[seller.sellerId],
        getLotDivisor
      );
      const ok = await directPrint(generateSalesPattiPrintHTML(payload), { mode: 'system' });
      if (ok) toast.success('Seller sub-patti sent to printer');
      else toast.error('Printer not connected.');
    },
    [pattiData, sellerFormById, sellerExpensesById, removedLotsBySellerId, lotSalesOverridesBySellerId, getLotDivisor]
  );

  const runPrintAllSubPatti = useCallback(async () => {
    if (!pattiData) return;
    for (const s of arrivalSellersForPatti) {
      const form = sellerFormById[s.sellerId] ?? defaultSellerForm(s);
      const displayName = form.name || s.sellerName;
      const exp = sellerExpensesById[s.sellerId] ?? defaultSellerExpenses();
      const removedSet = new Set(removedLotsBySellerId[s.sellerId] ?? []);
      const payload = buildSellerSubPattiPrintData(
        s,
        displayName,
        exp,
        removedSet,
        pattiData.pattiId,
        pattiData.createdAt,
        lotSalesOverridesBySellerId[s.sellerId],
        getLotDivisor
      );
      const ok = await directPrint(generateSalesPattiPrintHTML(payload), { mode: 'system' });
      if (!ok) {
        toast.error(`Print failed or cancelled for ${displayName}`);
        return;
      }
    }
    toast.success('All sub-pattis sent to printer');
  }, [pattiData, arrivalSellersForPatti, sellerFormById, sellerExpensesById, removedLotsBySellerId, lotSalesOverridesBySellerId, getLotDivisor]);

  const vehicleExpenseTotals = useMemo(() => {
    return vehicleExpenseRows.reduce(
      (acc, r) => ({
        quantity: acc.quantity + r.quantity,
        freight: acc.freight + r.freight,
        unloading: acc.unloading + r.unloading,
        weighing: acc.weighing + r.weighing,
        gunnies: acc.gunnies + r.gunnies,
      }),
      { quantity: 0, freight: 0, unloading: 0, weighing: 0, gunnies: 0 }
    );
  }, [vehicleExpenseRows]);

  const updateVehicleExpenseCell = useCallback(
    (id: string, field: 'freight' | 'unloading' | 'weighing' | 'gunnies', raw: string) => {
      setVehicleExpenseRows(prev =>
        prev.map(row => {
          if (row.id !== id) return row;
          if (raw.trim() === '') {
            return { ...row, [field]: 0 };
          }
          const n = parseFloat(raw);
          if (!Number.isFinite(n)) return row;
          return { ...row, [field]: clampMoney(n) };
        })
      );
    },
    []
  );

  const openVehicleExpenseModal = useCallback(async () => {
    if (!selectedSeller || !pattiData || arrivalSellersForPatti.length === 0) {
      toast.error('Open a vehicle settlement first.');
      return;
    }
    setVehicleExpenseModalOpen(true);
    setVehicleExpenseLoading(true);
    try {
      const vKey = normalizeVehicleKey(selectedSeller.vehicleNumber);
      const summaries = await arrivalsApi.list(0, 500);
      const match = summaries.find(s => normalizeVehicleKey(String(s.vehicleNumber)) === vKey);

      const [configs, commodities] = await Promise.all([
        commodityApi.getAllFullConfigs(),
        commodityApi.list(),
      ]);
      const nameToId = new Map(
        commodities.map(c => [String(c.commodity_name || '').trim().toLowerCase(), Number(c.commodity_id)])
      );
      const configById = new Map(configs.map(c => [c.commodityId, c]));

      let arrival: ArrivalFullDetail | null = null;
      if (match) {
        try {
          arrival = await arrivalsApi.getById(match.vehicleId);
        } catch {
          arrival = null;
        }
      }

      const totalBagsOnVehicle = arrival
        ? arrival.sellers.reduce(
            (acc, s) => acc + s.lots.reduce((a, l) => a + (Number(l.bagCount) || 0), 0),
            0
          )
        : arrivalSellersForPatti.reduce((acc, s) => acc + totalArrivalBagsForSeller(s), 0);

      const fallbackFreightTotal = arrivalSellersForPatti.reduce((sum, s) => {
        const exp = sellerExpensesById[s.sellerId];
        return sum + (exp?.freight ?? 0);
      }, 0);
      const freightTotalRaw = arrival ? Number(arrival.freightTotal ?? 0) : amountSummaryDisplay.arrivalFreightAmount;
      const freightTotal = freightTotalRaw > 0 ? freightTotalRaw : fallbackFreightTotal;
      const perBagFreight = totalBagsOnVehicle > 0 ? freightTotal / totalBagsOnVehicle : 0;
      const equalShareFreight = arrivalSellersForPatti.length > 0 ? freightTotal / arrivalSellersForPatti.length : 0;

      const rows: VehicleExpenseRow[] = arrivalSellersForPatti.map(s => {
        const arrSeller = arrival ? findArrivalSellerForSettlement(arrival, s) : undefined;
        const qtyRaw = arrSeller ? bagsFromArrivalSeller(arrSeller) : totalArrivalBagsForSeller(s);
        const qty = Math.max(0, Math.round(qtyRaw));
        const removed = new Set(removedLotsBySellerId[s.sellerId] ?? []);
        const lotOv = lotSalesOverridesBySellerId[s.sellerId] ?? {};
        const getDivisorLocal = (lot: SettlementLot) => {
          const n = (lot.commodityName || '').trim().toLowerCase();
          const cid = nameToId.get(n);
          if (cid == null) return 50;
          const d = Number(configById.get(cid)?.config?.ratePerUnit);
          return d > 0 ? d : 50;
        };
        const { unloading, weighing } = sumLotSlabChargesForSeller(
          s,
          removed,
          lotOv,
          nameToId,
          configById,
          getDivisorLocal
        );
        const fallbackSellerFreight = sellerExpensesById[s.sellerId]?.freight ?? 0;
        const freight = roundMoney2(
          perBagFreight > 0
            ? perBagFreight * qty
            : (fallbackSellerFreight > 0 ? fallbackSellerFreight : equalShareFreight)
        );

        return {
          id: `ve_${s.sellerId}`,
          sellerId: s.sellerId,
          sellerName: (arrSeller?.sellerName ?? s.sellerName) || 'Seller',
          quantity: qty,
          freight,
          unloading: roundMoney2(unloading),
          weighing: roundMoney2(weighing),
          gunnies: 0,
        };
      });

      setVehicleExpenseRows(rows);
    } catch {
      toast.error('Failed to load quick expenses from arrivals.');
      setVehicleExpenseRows(
        arrivalSellersForPatti.map(s => ({
          id: `ve_${s.sellerId}`,
          sellerId: s.sellerId,
          sellerName: s.sellerName || 'Seller',
          quantity: totalArrivalBagsForSeller(s),
          freight: roundMoney2(sellerExpensesById[s.sellerId]?.freight ?? 0),
          unloading: roundMoney2(sellerExpensesById[s.sellerId]?.unloading ?? 0),
          weighing: roundMoney2(sellerExpensesById[s.sellerId]?.weighman ?? 0),
          gunnies: roundMoney2(sellerExpensesById[s.sellerId]?.gunnies ?? 0),
        }))
      );
    } finally {
      setVehicleExpenseLoading(false);
    }
  }, [
    selectedSeller,
    pattiData,
    arrivalSellersForPatti,
    removedLotsBySellerId,
    lotSalesOverridesBySellerId,
    amountSummaryDisplay.arrivalFreightAmount,
    sellerExpensesById,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'x' && e.key !== 'X')) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!selectedSeller || !pattiData) return;
      e.preventDefault();
      void openVehicleExpenseModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSeller, pattiData, openVehicleExpenseModal]);

  const sellerDateLabel = (seller: SellerSettlement): string => {
    const rawDate = seller.createdAt ?? seller.date;
    if (!rawDate) return '-';
    const d = new Date(rawDate);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const renderArrivalSummaryTable = (tab: 'new-patti' | 'saved-patti') => {
    if (tab === 'new-patti' && newPattiArrivalRows.length === 0) {
      return (
        <div className="glass-card rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {sellers.length === 0 ? 'No arrivals found' : 'No matching arrivals'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {sellers.length === 0 ? 'Complete an auction to generate settlements' : 'Try a different search'}
          </p>
          {sellers.length === 0 && (
            <Button onClick={() => navigate('/auctions')} className="mt-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl">
              Go to Auctions
            </Button>
          )}
        </div>
      );
    }

    if (tab === 'saved-patti' && loadingPattis) {
      return <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">Loading…</div>;
    }

    if (tab === 'saved-patti' && savedPattiArrivalRows.length === 0) {
      return (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {savedPattis.length === 0 ? 'No saved pattis found' : 'No matching pattis'}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {savedPattis.length === 0 ? 'Create a patti from New Patti tab' : 'Try a different search'}
          </p>
        </div>
      );
    }

    return (
      <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Vehicle Number</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Seller(s)</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">From</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">SL No</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Lots</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Bids</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Weighed</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {tab === 'new-patti'
                ? newPattiArrivalRows.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => generatePatti(row.representativeSeller, { arrivalSellerIds: row.sellerIds })}
                      className="border-t border-border/30 hover:bg-muted/20 cursor-pointer"
                    >
                      <td className="px-3 py-2 text-center text-foreground">{row.vehicleNumber}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.sellerNames || '-'}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.fromLocation}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.serialNo ?? '-'}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.lots}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.bids}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.weighed}</td>
                      <td className="px-3 py-2 text-center text-amber-600 dark:text-amber-400 font-medium">New Patti</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.dateLabel}</td>
                    </tr>
                  ))
                : savedPattiArrivalRows.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => row.representativePattiId != null && openPattiForEdit(row.representativePattiId, row.sellerIds)}
                      className="border-t border-border/30 hover:bg-muted/20 cursor-pointer"
                    >
                      <td className="px-3 py-2 text-center text-foreground">{row.vehicleNumber}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.sellerNames || '-'}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.fromLocation}</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.serialNo ?? '-'}</td>
                      <td className="px-3 py-2 text-center text-foreground">-</td>
                      <td className="px-3 py-2 text-center text-foreground">-</td>
                      <td className="px-3 py-2 text-center text-foreground">-</td>
                      <td className="px-3 py-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">Completed Patti</td>
                      <td className="px-3 py-2 text-center text-foreground">{row.dateLabel}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ═══ PRINT PREVIEW ═══
  if (showPrint && pattiData) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
        {!isDesktop ? (
        <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.2)_0%,transparent_42%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <button onClick={() => setShowPrint(false)}
              aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5" /> Sales Patti Print
              </h1>
              <p className="text-white/70 text-xs">{pattiData.pattiId || '(New Patti)'}</p>
            </div>
          </div>
        </div>
        ) : (
        <div className="px-8 py-5 flex items-center gap-4">
          <Button onClick={() => setShowPrint(false)} variant="outline" size="sm" className="rounded-xl h-9">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Sales Patti Print
            </h2>
            <p className="text-sm text-muted-foreground">{pattiData.pattiId}</p>
          </div>
        </div>
        )}

        <div className="px-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-4 font-mono text-xs space-y-2 shadow-lg">
            <div className="text-center border-b border-dashed border-border pb-2">
              <p className="font-bold text-sm text-foreground">MERCOTRACE</p>
              <p className="text-muted-foreground">Sales Patti (Settlement)</p>
              <p className="text-muted-foreground">{new Date(pattiData.createdAt).toLocaleDateString()} {new Date(pattiData.createdAt).toLocaleTimeString()}</p>
            </div>

            <div className="border-b border-dashed border-border pb-2 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Patti ID</span><span className="font-bold text-foreground">{pattiData.pattiId || '(New Patti)'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-bold text-foreground">{pattiData.sellerName}</span></div>
              {pattiData.useAverageWeight && <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-bold text-amber-500">AVG WEIGHT (Quick Close)</span></div>}
            </div>

            <div className="border-b border-dashed border-border pb-2">
              <p className="font-bold text-foreground mb-1">RATE CLUSTERS</p>
              {pattiData.rateClusters.map((c, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-foreground">{c.totalQuantity} bags @ ₹{c.rate} ({c.totalWeight.toFixed(0)}kg)</span>
                  <span className="font-bold text-foreground">₹{c.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold">
              <span className="text-foreground">Gross Amount</span>
              <span className="text-foreground">₹{pattiData.grossAmount.toLocaleString()}</span>
            </div>

            <div className="border-b border-dashed border-border pb-2">
              <p className="font-bold text-foreground mb-1">DEDUCTIONS</p>
              {pattiData.deductions.filter(d => d.amount > 0).map(d => (
                <div key={d.key} className="flex justify-between">
                  <span className="text-muted-foreground">{d.label}{d.autoPulled ? ' (Auto)' : ''}</span>
                  <span className="text-destructive">−₹{d.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-dashed border-border pt-1 mt-1">
                <span className="text-foreground">Total Deductions</span>
                <span className="text-destructive">−₹{pattiData.totalDeductions.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between text-sm border-t border-dashed border-border pt-2">
              <span className="font-bold text-foreground">NET PAYABLE</span>
              <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">₹{pattiData.netPayable.toLocaleString()}</span>
            </div>

            <div className="text-center text-muted-foreground/70 text-[9px] border-t border-dashed border-border pt-2 space-y-0.5">
              <p>GA = Σ (NW × SR)</p>
              <p>NP = GA − TD</p>
              <p>TD = Freight + Coolie + Weighing + Advance + Gunnies + Other</p>
            </div>

            <div className="text-center border-t border-dashed border-border pt-2">
              <p className="text-muted-foreground">--- END OF PATTI ---</p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={async () => {
              const printedAt = new Date().toISOString();
              try {
                await printLogApi.create({
                  reference_type: 'SALES_PATTI',
                  reference_id: pattiData.pattiId,
                  print_type: 'SALES_PATTI',
                  printed_at: printedAt,
                });
              } catch {
                // backend optional
              }
              const ok = await directPrint(generateSalesPattiPrintHTML(pattiData), { mode: "system" });
              if (ok) toast.success('Sales Patti sent to printer!');
              else toast.error('Printer not connected.');
            }}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-lg">
              <Printer className="w-5 h-5 mr-2" /> Print Patti
            </Button>
            <Button onClick={() => { setShowPrint(false); setPattiData(null); setSelectedSeller(null); setSelectedArrivalSellerIds([]); setExistingPattiId(null); }}
              variant="outline" className="h-12 rounded-xl px-6">
              Done
            </Button>
          </div>
        </div>
        {!isDesktop && <BottomNav />}
      </div>
    );
  }

  // ═══ PATTI DETAIL SCREEN ═══
  if (selectedSeller && pattiData) {
    const totalBags = Math.round(
      (vehicleFormDetails?.arrivalQty ?? arrivalSellersForPatti.reduce((s, x) => s + totalArrivalBagsForSeller(x), 0))
    );

    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
        {/* Header */}
        {!isDesktop ? (
        <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.2)_0%,transparent_42%)]" />
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
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => { setSelectedSeller(null); setSelectedArrivalSellerIds([]); setPattiData(null); setExistingPattiId(null); }}
                aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Sales Patti
                </h1>
                <p className="text-white/70 text-xs">{pattiData.pattiId || '(New Patti)'}</p>
              </div>
            </div>

            {/* Seller info strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <User className="w-3.5 h-3.5 text-white/70 mx-auto mb-0.5" />
                <p className="text-[9px] text-white/60 uppercase">Seller</p>
                <p className="text-[11px] font-semibold text-white truncate">{selectedSeller.sellerName}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <Truck className="w-3.5 h-3.5 text-white/70 mx-auto mb-0.5" />
                <p className="text-[9px] text-white/60 uppercase">Vehicle</p>
                <p className="text-[11px] font-semibold text-white truncate">{selectedSeller.vehicleNumber}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <Package className="w-3.5 h-3.5 text-white/70 mx-auto mb-0.5" />
                <p className="text-[9px] text-white/60 uppercase">Bags</p>
                <p className="text-[11px] font-semibold text-white">{totalBags}</p>
              </div>
            </div>
          </div>
        </div>
        ) : (
        <div className="px-8 py-5">
          <div className="flex items-center gap-4 mb-4">
            <Button onClick={() => { setSelectedSeller(null); setSelectedArrivalSellerIds([]); setPattiData(null); setExistingPattiId(null); }} variant="outline" size="sm" className="rounded-xl h-9">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Sales Patti — {selectedSeller.sellerName}
              </h2>
              <p className="text-sm text-muted-foreground">{pattiData.pattiId || '(New Patti)'} · {selectedSeller.vehicleNumber} · {totalBags} bags</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-rose-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Seller</p>
              <p className="text-lg font-black text-foreground truncate">{selectedSeller.sellerName}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Vehicle</p>
              <p className="text-lg font-black text-foreground truncate">{selectedSeller.vehicleNumber}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Bags</p>
              <p className="text-lg font-black text-foreground">{totalBags}</p>
            </div>
          </div>
        </div>
        )}

        <div className="mt-4 space-y-3 px-4 sm:px-6 lg:px-8">
          {vehicleFormDetails && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl border border-border/50 p-4 sm:p-5"
            >
              <h3 className="mb-4 text-center text-base font-bold tracking-tight text-foreground sm:text-lg">
                Vehicle details
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-center sm:gap-3 xl:grid-cols-5 xl:gap-4">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-muted/30 px-2.5 py-3 sm:rounded-2xl sm:px-3 sm:py-4">
                  <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sellers</p>
                  <p className="text-xl font-black tabular-nums text-foreground sm:text-2xl md:text-3xl">{formatOptionalInt(vehicleFormDetails.sellersCount)}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/20 bg-muted/30 px-2.5 py-3 sm:rounded-2xl sm:px-3 sm:py-4">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Arrival Qty</p>
                  <p className="text-xl font-black tabular-nums text-foreground sm:text-2xl md:text-3xl">{formatOptionalInt(vehicleFormDetails.arrivalQty)}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-muted/30 px-2.5 py-3 sm:rounded-2xl sm:px-3 sm:py-4">
                  <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Arrival Weight</p>
                  <p className="text-base font-black tabular-nums text-foreground sm:text-xl md:text-2xl">{formatOptionalKg(vehicleFormDetails.arrivalWeightKg)}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-violet-500/20 bg-muted/30 px-2.5 py-3 sm:rounded-2xl sm:px-3 sm:py-4">
                  <Gavel className="h-4 w-4 text-violet-600 dark:text-violet-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">Sales Pad Net Wt</p>
                  <p className="text-base font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalKg(salesPadNetWeightBaseline)}
                  </p>
                </div>
                <div className="col-span-2 flex flex-col items-center gap-1.5 rounded-xl border border-fuchsia-500/20 bg-muted/30 px-2.5 py-3 sm:rounded-2xl sm:px-3 sm:py-4 xl:col-span-1">
                  <Receipt className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">Patti Net Wt</p>
                  <p className="text-base font-black tabular-nums text-foreground sm:text-xl md:text-2xl">{formatOptionalKg(vehicleFormDetails.pattiNetWeightKg)}</p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className="glass-card rounded-2xl border border-border/50 p-4 sm:p-5"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              <div className="min-w-0 sm:pr-4 sm:border-r sm:border-border/50">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/20 dark:text-teal-400"
                    aria-hidden
                  >
                    <Truck className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground sm:text-base">Freight Amount</p>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          Arrival Freight Amount
                          <InlineCalcTip
                            label="Arrival freight formula"
                            lines={[
                              'Source: Arrival freight total.',
                              'Quick Expenses uses: per bag freight = arrival freight / total arrival bags.',
                              `Current arrival freight: ${formatRupeeInr(amountSummaryDisplay.arrivalFreightAmount)}`,
                            ]}
                          />
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {formatRupeeInr(amountSummaryDisplay.arrivalFreightAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          Invoiced
                          <InlineCalcTip
                            label="Invoiced freight formula"
                            lines={[
                              'Source: Sum of outbound freight from matching sales bills.',
                              `Current invoiced freight: ${formatRupeeInr(amountSummaryDisplay.freightInvoiced)}`,
                            ]}
                          />
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {formatRupeeInr(amountSummaryDisplay.freightInvoiced)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
                    aria-hidden
                  >
                    <IndianRupee className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground sm:text-base">Payable</p>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          From Sales Auction
                          <InlineCalcTip
                            label="Auction amount formula"
                            lines={[
                              'Across all sellers in current arrival scope.',
                              `Qty used: ${Math.round(auctionQtyBaseline)} bags`,
                              `Weight used: ${auctionWeightBaseline.toFixed(1)} kg`,
                              'Lot amount = (Weight x Seller rate per bag) / commodity divisor.',
                              `Current auction amount: ${formatRupeeInr(auctionAmountBaseline)}`,
                            ]}
                          />
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {formatRupeeInr(auctionAmountBaseline)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          Invoice
                          <InlineCalcTip
                            label="Invoice payable formula"
                            lines={[
                              'Source: Billing totals from matching sales bills.',
                              'Represents invoice-side payable after bill calculations.',
                              `Current invoice value: ${formatRupeeInr(amountSummaryDisplay.payableInvoiced)}`,
                            ]}
                          />
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-foreground">
                          {formatRupeeInr(amountSummaryDisplay.payableInvoiced)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="glass-card overflow-hidden rounded-2xl border border-border/50"
          >
            <div className="border-b border-border/40 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-4 py-3 dark:from-indigo-950/35 dark:via-blue-950/25 dark:to-cyan-950/20 sm:px-5 sm:py-3.5">
              <p className="text-center text-sm font-bold tracking-tight text-foreground sm:text-base">
                Expenses &amp; invoice
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full shrink-0 rounded-xl border border-primary/35 bg-background/90 font-semibold shadow-sm hover:bg-primary/5 sm:h-10 sm:w-auto sm:min-w-[12rem]"
                  onClick={() => void openVehicleExpenseModal()}
                >
                  <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                  Add Quick Expenses (Alt + X)
                </Button>
                <div className="w-full min-w-0 flex-1 sm:max-w-md">
                  <label htmlFor="settlement-invoice-name-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Invoice Name
                  </label>
                  <Input
                    id="settlement-invoice-name-search"
                    type="search"
                    placeholder="Search invoice name…"
                    value={invoiceNameSearch}
                    onChange={e => setInvoiceNameSearch(e.target.value)}
                    className="h-10 rounded-xl border-border/60 bg-background/80"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass-card rounded-2xl border border-border/50 p-4 sm:p-5"
          >
            <h3 className="mb-4 text-center text-base font-bold tracking-tight text-foreground sm:text-lg">Sales report</h3>
            {arrivalSellersForPatti.length > 1 && (
              <div className="-mt-1 mb-3 flex items-center justify-center gap-1.5 lg:hidden">
                {arrivalSellersForPatti.map((_, si) => (
                  <button
                    key={`sales-report-dot-${si}`}
                    type="button"
                    onClick={() => {
                      const el = salesReportCarouselRef.current;
                      if (!el) return;
                      const n = arrivalSellersForPatti.length;
                      const left = (el.scrollWidth / n) * si;
                      el.scrollTo({ left, behavior: 'smooth' });
                    }}
                    className={cn(
                      'rounded-full transition-all bg-muted-foreground/40',
                      activeSalesReportSlide === si ? 'h-2 w-4 bg-primary' : 'h-2 w-2'
                    )}
                    aria-label={`Go to seller ${si + 1}`}
                  />
                ))}
              </div>
            )}
            <div
              ref={salesReportCarouselRef}
              onScroll={handleSalesReportCarouselScroll}
              className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [-webkit-overflow-scrolling:touch] lg:block lg:overflow-visible lg:snap-none lg:space-y-4 lg:pb-0"
            >
              {arrivalSellersForPatti.map(seller => {
                const form = sellerFormById[seller.sellerId] ?? defaultSellerForm(seller);
                const baseline = registeredBaselineById[seller.sellerId] ?? form;
                const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
                const dirty = isSellerRegDirty(form, baseline);
                const removedSet = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
                const lotOv = lotSalesOverridesBySellerId[seller.sellerId] ?? {};
                const visibleLots = (seller.lots ?? [])
                  .map((lot, i) => ({ lot, i, sid: lotStableId(lot, i) }))
                  .filter(x => !removedSet.has(x.sid));
                const lotRows = visibleLots.map(({ lot, sid }) =>
                  mergeLotDisplayRow(lot, lotOv[sid], getLotDivisor(lot))
                );
                const qtyTot = lotRows.reduce((s, r) => s + r.qty, 0);
                const weightTot = lotRows.reduce((s, r) => s + r.weight, 0);
                const amountTot = lotRows.reduce((s, r) => s + r.amount, 0);
                const expenseTotal = totalSellerExpenses(exp, settlementWeighingEnabled, settlementWeighingMergeIntoFreight);
                const netSeller = expenseTotal - amountTot;
                const salesCollapsed = salesReportCollapsedBySellerId[seller.sellerId] === true;

                return (
                  <div
                    key={seller.sellerId}
                    className="min-w-0 w-[calc(100%-0.1rem)] shrink-0 snap-start lg:w-auto lg:shrink"
                  >
                    <div
                      id={`settlement-seller-card-${seller.sellerId}`}
                      className="rounded-2xl border border-border/60 bg-muted/10 p-3 sm:p-4"
                    >
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trader</span>
                      <label className="flex cursor-pointer items-center gap-2 font-medium">
                        <Checkbox
                          checked={form.registered}
                          onCheckedChange={v => {
                            const on = v === true;
                            setSellerFormById(prev => {
                              const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                              return {
                                ...prev,
                                [seller.sellerId]: {
                                  ...cur,
                                  registered: on,
                                  contactSearchQuery: on ? cur.contactSearchQuery : '',
                                },
                              };
                            });
                            if (on) void runSellerContactSearch(seller.sellerId, '');
                          }}
                        />
                        <span className="text-foreground">Registered</span>
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {form.registered ? (form.contactId ? 'Registry linked' : 'Search by mark below') : 'Unregistered — enter details to register'}
                      </span>
                    </div>

                    <div className="mb-4 space-y-3 rounded-xl border border-border/50 bg-card/80 p-3 sm:p-4">
                      <div className="flex min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                        <div className="relative min-w-[6.5rem] max-w-[8rem] shrink-0 sm:min-w-0 sm:max-w-none sm:flex-1">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Mark
                          </label>
                          <div className="relative">
                            <Input
                              value={form.mark}
                              onChange={e => {
                                const v = e.target.value;
                                setSellerFormById(prev => {
                                  const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                  return { ...prev, [seller.sellerId]: { ...cur, mark: v } };
                                });
                                if (form.registered && !form.contactId) {
                                  scheduleMarkContactSearch(seller.sellerId, v);
                                }
                              }}
                              placeholder={form.registered && !form.contactId ? 'Type mark or name…' : ''}
                              autoComplete="off"
                              className={cn(
                                'h-9 rounded-lg pr-8 text-sm',
                                form.registered && form.contactId && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                              )}
                            />
                            {form.registered && !form.contactId ? (
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {sellerContactSearchLoading[seller.sellerId] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Search className="h-3.5 w-3.5 opacity-70" />
                                )}
                              </span>
                            ) : null}
                            {form.registered && !form.contactId && (sellerContactSearchById[seller.sellerId] ?? []).length > 0 ? (
                              <ul className="absolute left-0 right-0 z-[80] mt-1 max-h-36 overflow-y-auto rounded-lg border border-border/50 bg-background shadow-lg">
                                {(sellerContactSearchById[seller.sellerId] ?? []).slice(0, 12).map(c => (
                                  <li key={c.contact_id}>
                                    <button
                                      type="button"
                                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-muted/50"
                                      onClick={() => {
                                        void (async () => {
                                          if (!can('Settlement', 'Edit')) {
                                            toast.error('You do not have permission to link traders.');
                                            return;
                                          }
                                          setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: true }));
                                          try {
                                            const reg = await settlementApi.linkSellerContact(seller.sellerId, c.contact_id);
                                            setSellers(prev =>
                                              prev.map(x =>
                                                x.sellerId === seller.sellerId
                                                  ? {
                                                      ...x,
                                                      sellerName: reg.sellerName,
                                                      sellerMark: reg.sellerMark,
                                                      contactId: reg.contactId,
                                                      sellerPhone: reg.sellerPhone,
                                                    }
                                                  : x
                                              )
                                            );
                                            setSellerFormById(prev => ({
                                              ...prev,
                                              [seller.sellerId]: {
                                                registered: true,
                                                contactId: reg.contactId,
                                                name: reg.sellerName,
                                                mark: reg.sellerMark,
                                                mobile: reg.sellerPhone,
                                                contactSearchQuery: '',
                                              },
                                            }));
                                            setRegisteredBaselineById(prev => ({
                                              ...prev,
                                              [seller.sellerId]: {
                                                registered: true,
                                                contactId: reg.contactId,
                                                name: reg.sellerName,
                                                mark: reg.sellerMark,
                                                mobile: reg.sellerPhone,
                                                contactSearchQuery: '',
                                              },
                                            }));
                                            toast.success('Trader linked to this seller');
                                          } catch {
                                            toast.error('Could not link trader');
                                          } finally {
                                            setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: false }));
                                          }
                                        })();
                                      }}
                                    >
                                      <span className="font-semibold text-foreground">{c.name}</span>
                                      <span className="text-muted-foreground">
                                        {c.phone}
                                        {c.mark ? ` · ${c.mark}` : ''}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                        <div className="min-w-[7.5rem] flex-1 sm:min-w-[8rem]">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Trader name
                          </label>
                          <Input
                            value={form.name}
                            onChange={e =>
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                return { ...prev, [seller.sellerId]: { ...cur, name: e.target.value } };
                              })
                            }
                            className={cn(
                              'h-9 min-w-0 rounded-lg text-sm',
                              form.registered && form.contactId && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                            )}
                          />
                        </div>
                        <div className="min-w-[6.5rem] max-w-[8rem] shrink-0 sm:max-w-[9rem] sm:flex-initial">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Mobile
                          </label>
                          <Input
                            value={form.mobile}
                            onChange={e =>
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                return { ...prev, [seller.sellerId]: { ...cur, mobile: e.target.value } };
                              })
                            }
                            className={cn(
                              'h-9 rounded-lg text-sm',
                              form.registered && form.contactId && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                            )}
                            inputMode="tel"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 shrink-0 self-end rounded-xl px-3 text-xs sm:px-4 sm:text-sm"
                          disabled={
                            !!sellerRegSaving[seller.sellerId] ||
                            (form.registered && !form.contactId) ||
                            (form.registered && !!form.contactId && !dirty) ||
                            (!form.registered && (!form.name.trim() || !form.mobile.trim()))
                          }
                          onClick={() => {
                            void (async () => {
                              if (!can('Settlement', 'Edit')) {
                                toast.error('You do not have permission to update trader details.');
                                return;
                              }
                              if (!form.registered) {
                                setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: true }));
                                try {
                                  const created = await contactApi.create({
                                    name: form.name.trim(),
                                    phone: form.mobile.trim(),
                                    mark: form.mark.trim(),
                                    trader_id: '',
                                  });
                                  const reg = await settlementApi.linkSellerContact(seller.sellerId, created.contact_id);
                                  setSellers(prev =>
                                    prev.map(x =>
                                      x.sellerId === seller.sellerId
                                        ? {
                                            ...x,
                                            sellerName: reg.sellerName,
                                            sellerMark: reg.sellerMark,
                                            contactId: reg.contactId,
                                            sellerPhone: reg.sellerPhone,
                                          }
                                        : x
                                    )
                                  );
                                  const nextForm: SellerRegFormState = {
                                    registered: true,
                                    contactId: reg.contactId,
                                    name: reg.sellerName,
                                    mark: reg.sellerMark,
                                    mobile: reg.sellerPhone,
                                    contactSearchQuery: '',
                                  };
                                  setSellerFormById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
                                  setRegisteredBaselineById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
                                  toast.success('Trader registered and linked');
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Registration failed');
                                } finally {
                                  setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: false }));
                                }
                                return;
                              }
                              if (!form.contactId) {
                                toast.message('Select a registered trader from search, or uncheck Registered to onboard.');
                                return;
                              }
                              setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: true }));
                              try {
                                await contactApi.update(form.contactId, {
                                  name: form.name.trim(),
                                  phone: form.mobile.trim(),
                                  mark: form.mark.trim(),
                                });
                                setRegisteredBaselineById(prev => ({
                                  ...prev,
                                  [seller.sellerId]: { ...form, contactSearchQuery: '' },
                                }));
                                setSellers(prev =>
                                  prev.map(x =>
                                    x.sellerId === seller.sellerId
                                      ? {
                                          ...x,
                                          sellerName: form.name.trim(),
                                          sellerMark: form.mark.trim(),
                                          sellerPhone: form.mobile.trim(),
                                        }
                                      : x
                                  )
                                );
                                toast.success('Contact updated');
                              } catch {
                                toast.error('Update failed');
                              } finally {
                                setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: false }));
                              }
                            })();
                          }}
                        >
                          {!form.registered
                            ? 'Register seller'
                            : !form.contactId
                              ? 'Select trader'
                              : dirty
                                ? 'Update'
                                : 'Up to date'}
                        </Button>
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/80 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per seller sales</p>
                        <p className="truncate text-sm font-bold text-foreground">
                          {seller.sellerName}
                          {seller.sellerMark ? ` – ${seller.sellerMark}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                          Net ₹{formatMoney2Display(netSeller)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-[10px]"
                          onClick={() =>
                            setSalesReportCollapsedBySellerId(prev => ({
                              ...prev,
                              [seller.sellerId]: !prev[seller.sellerId],
                            }))
                          }
                        >
                          {salesCollapsed ? (
                            <ChevronDown className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <ChevronUp className="mr-1 h-3.5 w-3.5" />
                          )}
                          {salesCollapsed ? 'Expand' : 'Collapse'}
                        </Button>
                      </div>
                    </div>

                    {salesCollapsed ? (
                      <div className="mb-3 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5 text-[11px]">
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-foreground sm:justify-start">
                          <span className="font-medium text-muted-foreground">Items: {visibleLots.length}</span>
                          <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
                            ·
                          </span>
                          <span className="font-semibold tabular-nums">Total Qty: {qtyTot}</span>
                          <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
                            ·
                          </span>
                          <span className="font-semibold tabular-nums">Total Wt: {formatMoney2Display(weightTot)} kg</span>
                          <span className="hidden text-muted-foreground/50 sm:inline" aria-hidden>
                            ·
                          </span>
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                            Net: ₹{formatMoney2Display(netSeller)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border/50 bg-background/40 shadow-sm">
                        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[11px] leading-tight sm:text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800">
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                #
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Item (lot)
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Qty
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Wt (kg)
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Avg (kg)
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Rate (₹/bag)
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Amount
                              </th>
                              <th className="border-b border-border/50 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground lg:px-3">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(seller.lots ?? []).length === 0 || visibleLots.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">
                                  No lots for this seller
                                </td>
                              </tr>
                            ) : (
                              visibleLots.map(({ lot, sid }, displayIdx) => {
                                const div = getLotDivisor(lot);
                                const row = mergeLotDisplayRow(lot, lotOv[sid], div);
                                const bounds = commodityAvgWeightBounds[lot.commodityName || ''];
                                const avgBelowMin = bounds != null && bounds.min > 0 && row.avg < bounds.min;
                                const avgAboveMax = bounds != null && bounds.max > 0 && row.avg > bounds.max;
                                const avgWarn = avgBelowMin || avgAboveMax;
                                return (
                                  <tr
                                    key={sid}
                                    className="border-b border-border/40 bg-card/90 text-center transition-colors hover:bg-muted/25"
                                  >
                                    <td className="px-2 py-2 align-middle tabular-nums text-foreground lg:px-3">
                                      {displayIdx + 1}
                                    </td>
                                    <td className="px-2 py-2 align-middle text-left font-semibold text-foreground lg:px-3">
                                      {row.itemLabel}
                                    </td>
                                    <td className="px-1 py-1.5 align-middle lg:px-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        step={1}
                                        className="mx-auto h-9 w-[4.5rem] rounded-md border border-border bg-background px-1.5 text-center text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        value={row.qty}
                                        onChange={e => setLotSalesField(seller.sellerId, sid, 'qty', e.target.value)}
                                        aria-label="Quantity"
                                      />
                                    </td>
                                    <td className="px-1 py-1.5 align-middle lg:px-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        className="mx-auto h-9 w-[5rem] rounded-md border border-border bg-background px-1.5 text-center text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        value={Number.isFinite(row.weight) ? row.weight : 0}
                                        onChange={e => setLotSalesField(seller.sellerId, sid, 'weight', e.target.value)}
                                        aria-label="Weight kg"
                                      />
                                    </td>
                                    <td className="px-1 py-1.5 align-middle lg:px-2">
                                      <div
                                        className={cn(
                                          settlementReadOnlyCellClass,
                                          avgWarn &&
                                            'border-amber-500/45 bg-amber-500/[0.12] text-amber-800 dark:text-amber-300'
                                        )}
                                        title="Weight ÷ quantity (from Billing commodity rules)"
                                      >
                                        {row.avg.toFixed(2)}
                                      </div>
                                      {avgBelowMin && row.weight > 0 && bounds && (
                                        <p className="mt-0.5 text-[9px] text-amber-600">&lt; min {bounds.min} kg</p>
                                      )}
                                      {avgAboveMax && row.weight > 0 && bounds && (
                                        <p className="mt-0.5 text-[9px] text-amber-600">&gt; max {bounds.max} kg</p>
                                      )}
                                    </td>
                                    <td className="px-1 py-1.5 align-middle lg:px-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="mx-auto h-9 w-[5.25rem] rounded-md border border-border bg-background px-1.5 text-center text-xs font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        value={Number.isFinite(row.ratePerBag) ? row.ratePerBag : 0}
                                        onChange={e => setLotSalesField(seller.sellerId, sid, 'ratePerBag', e.target.value)}
                                        aria-label="Rate per bag"
                                        title="Seller settlement rate per bag; amount uses commodity divisor from settings"
                                      />
                                    </td>
                                    <td className="px-1 py-1.5 align-middle lg:px-2">
                                      <div
                                        className={cn(
                                          settlementReadOnlyCellClass,
                                          'font-bold text-emerald-900/90 dark:text-emerald-300/95 border-emerald-600/25 bg-emerald-500/[0.08]'
                                        )}
                                        title={`(Weight × rate) ÷ divisor (${div})`}
                                      >
                                        ₹{formatMoney2Display(row.amount)}
                                      </div>
                                    </td>
                                    <td className="px-1 py-1.5 align-middle text-center lg:px-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        aria-label="Remove row"
                                        onClick={() =>
                                          setDeleteLotConfirm({
                                            sellerId: seller.sellerId,
                                            lotId: sid,
                                            itemLabel: row.itemLabel,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {visibleLots.length > 0 ? (
                            <tfoot>
                              <tr className="border-t-2 border-violet-500/35 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-slate-500/10 text-[11px] font-bold text-foreground">
                                <td colSpan={2} className="px-2 py-2.5 text-center lg:px-3">
                                  Total
                                </td>
                                <td className="px-2 py-2.5 text-center tabular-nums lg:px-3">{qtyTot}</td>
                                <td className="px-2 py-2.5 text-center tabular-nums lg:px-3">{weightTot.toFixed(1)}</td>
                                <td className="px-2 py-2.5 text-center lg:px-3" />
                                <td className="px-2 py-2.5 text-center lg:px-3" />
                                <td className="px-2 py-2.5 text-center tabular-nums lg:px-3">
                                  ₹{formatMoney2Display(amountTot)}
                                </td>
                                <td className="px-2 py-2.5 text-center lg:px-3" />
                              </tr>
                            </tfoot>
                          ) : null}
                        </table>
                      </div>

                      <div className="w-full shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/20 lg:w-56">
                        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-3 py-2.5 dark:from-indigo-950/35 dark:via-blue-950/25 dark:to-cyan-950/20">
                          <p className="text-center text-sm font-bold text-foreground">Expenses</p>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground">Use weighman</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
                                  aria-label="Weighman toggle help"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                ON: include weighman in expenses and net payable. OFF: ignore weighman in totals.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            id={`sw-w-${seller.sellerId}`}
                            className="h-4 w-7 scale-90"
                            checked={settlementWeighingEnabled}
                            onCheckedChange={v => setSettlementWeighingEnabled(v === true)}
                            aria-label="Use weighman in totals"
                          />
                        </div>
                        <div className="space-y-2 p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                Freight
                                <InlineCalcTip
                                  label={`Freight formula ${seller.sellerId}`}
                                  lines={[
                                    'Quick Expenses default: (arrival freight / total arrival bags) x seller bags.',
                                    `Current value: ${formatMoney2Display(exp.freight)}`,
                                  ]}
                                />
                              </span>
                              <Input
                                id={`settlement-seller-expense-${seller.sellerId}-freight`}
                                type="number"
                                min={0}
                                step={0.01}
                                inputMode="decimal"
                                className={settlementExpenseInputClass}
                                value={exp.freight === 0 ? '' : exp.freight}
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, freight: v } };
                                  });
                                }}
                                aria-label="Freight amount"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                Unloading
                                <InlineCalcTip
                                  label={`Unloading formula ${seller.sellerId}`}
                                  lines={[
                                    'Per lot slab: if weight > threshold -> ((F x W) / T) x W; else F x T.',
                                    'Seller unloading = sum of all lot slab amounts.',
                                    `Current value: ${formatMoney2Display(exp.unloading)}`,
                                  ]}
                                />
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                inputMode="decimal"
                                className={settlementExpenseInputClass}
                                value={exp.unloading === 0 ? '' : exp.unloading}
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, unloading: v } };
                                  });
                                }}
                                aria-label="Unloading amount"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                Weighing
                                <InlineCalcTip
                                  label={`Weighing formula ${seller.sellerId}`}
                                  lines={[
                                    'Uses commodity weighing slab: same slab formula as unloading.',
                                    settlementWeighingEnabled
                                      ? 'Toggle is ON: included in total expenses.'
                                      : 'Toggle is OFF: excluded from total expenses.',
                                    `Current value: ${formatMoney2Display(exp.weighman)}`,
                                  ]}
                                />
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                inputMode="decimal"
                                disabled={!settlementWeighingEnabled}
                                className={cn(
                                  settlementExpenseInputClass,
                                  settlementWeighingMergeIntoFreight && settlementWeighingEnabled && 'opacity-80'
                                )}
                                value={
                                  !settlementWeighingEnabled ? '' : exp.weighman === 0 ? '' : exp.weighman
                                }
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, weighman: v } };
                                  });
                                }}
                                aria-label="Weighing charges"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Cash Advance</span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                inputMode="decimal"
                                className={settlementExpenseInputClass}
                                value={exp.cashAdvance === 0 ? '' : exp.cashAdvance}
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, cashAdvance: v } };
                                  });
                                }}
                                aria-label="Cash advance"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Gunnies</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className={settlementExpenseInputClass}
                                value={exp.gunnies === 0 ? '' : exp.gunnies}
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, gunnies: v } };
                                  });
                                }}
                                aria-label="Gunnies"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">Others</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className={settlementExpenseInputClass}
                                value={exp.others === 0 ? '' : exp.others}
                                onChange={e => {
                                  const v = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, others: v } };
                                  });
                                }}
                                aria-label="Other expenses"
                              />
                            </div>
                          </div>
                        <div className="space-y-1 border-t border-border/50 p-3 pt-2 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="inline-flex items-center gap-1 text-center">
                              Total expenses
                              <InlineCalcTip
                                label={`Total expenses formula ${seller.sellerId}`}
                                lines={[
                                  'Total = Freight + Unloading + (Use Weighman ? Weighing : 0) + Cash Advance + Gunnies + Others.',
                                  `Current total expenses: ${formatMoney2Display(expenseTotal)}`,
                                ]}
                              />
                            </span>
                            <span className="tabular-nums text-center">{formatMoney2Display(expenseTotal)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-foreground">
                            <span className="inline-flex items-center gap-1 text-center">
                              Net payable
                              <InlineCalcTip
                                label={`Net payable formula ${seller.sellerId}`}
                                lines={[
                                  'Net payable = Total expenses - Auction amount.',
                                  `Qty used: ${Math.round(qtyTot)} bags`,
                                  `Weight used: ${weightTot.toFixed(1)} kg`,
                                  `Auction amount: ${formatMoney2Display(amountTot)}`,
                                  `Total expenses: ${formatMoney2Display(expenseTotal)}`,
                                  `Current net payable: ${formatMoney2Display(netSeller)}`,
                                ]}
                              />
                            </span>
                            <span className="tabular-nums text-center text-emerald-600 dark:text-emerald-400">
                              {formatMoney2Display(netSeller)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                      </>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-xl text-xs sm:text-sm"
                        onClick={() => void runPrintSellerSubPatti(seller)}
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        Print seller sub patti
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-9 rounded-xl text-xs sm:text-sm"
                        onClick={() => {
                          setAddVoucherSellerId(seller.sellerId);
                          setVoucherSearchVoucherName('');
                          setVoucherSearchName('');
                          setVoucherPickRows([]);
                          setSelectedVoucherRowIds({});
                        }}
                      >
                        Add Voucher
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-xl text-xs sm:text-sm"
                        onClick={() => {
                          if (selectedSeller?.sellerId === seller.sellerId) void savePatti();
                          else {
                            toast.message(
                              'Open this seller as the primary settlement to save their main patti, or use Save Main Patti for the current primary seller.'
                            );
                          }
                        }}
                      >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save patti
                      </Button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="glass-card rounded-2xl border border-border/50 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <Button
                onClick={() => void savePatti()}
                disabled={!pattiData.rateClusters.length}
                className={cn(
                  'h-12 rounded-xl font-bold shadow-md sm:min-w-[11rem]',
                  pattiData.rateClusters.length
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                    : 'cursor-not-allowed opacity-50'
                )}
              >
                <Save className="mr-2 h-5 w-5" />
                Save Main Patti
                <span className="ml-2 text-[10px] font-semibold opacity-90 sm:text-[11px]">(Alt S)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-blue-500/40 font-semibold sm:min-w-[10rem]"
                disabled={!pattiData.rateClusters.length}
                onClick={() => void runPrintMainPatti()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print main patti
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl border-indigo-500/40 font-semibold sm:min-w-[10rem]"
                onClick={() => void runPrintAllSubPatti()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print all sub patti
              </Button>
            </div>
          </motion.div>

          <Dialog
            open={vehicleExpenseModalOpen}
            onOpenChange={setVehicleExpenseModalOpen}
          >
            <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-0 sm:p-0">
              <div className="border-b border-border/50 bg-muted/30 px-5 py-4 sm:px-6">
                <DialogHeader className="space-y-1.5 text-center sm:text-center">
                  <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">Add Quick Expenses</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                    Sellers and quantities come from Arrivals. Freight is allocated per bag. Unloading / weighing use commodity
                    slab rules at lot level (editable). Press Alt + X to open.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="relative px-3 py-4 sm:px-5 sm:py-5">
                {vehicleExpenseLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                    <span className="sr-only">Loading expenses</span>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm">
                  <table className="w-full min-w-[880px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/50">
                        <th className="min-w-[11rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Seller
                        </th>
                        <th className="min-w-[5.5rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Qty (bags)
                        </th>
                        <th className="min-w-[7.5rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Freight
                        </th>
                        <th className="min-w-[7.5rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Unloading
                        </th>
                        <th className="min-w-[7.5rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Weighing
                        </th>
                        <th className="min-w-[7.5rem] px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Gunnies
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleExpenseRows.map(row => (
                        <tr
                          key={row.id}
                          className="border-b border-border/40 transition-colors odd:bg-background even:bg-muted/20 hover:bg-muted/40"
                        >
                          <td className="px-3 py-3 text-center align-middle">
                            <span className="line-clamp-2 text-xs font-medium text-foreground sm:text-sm">{row.sellerName}</span>
                          </td>
                          <td className="px-3 py-3 text-center align-middle">
                            <span className="inline-flex min-h-9 min-w-[4rem] items-center justify-center rounded-md border border-border/50 bg-muted/40 px-2 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                              {row.quantity}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="mx-auto h-10 w-full max-w-[7.5rem] rounded-md border-border/70 bg-background px-2 text-center text-sm tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={row.freight === 0 ? '' : row.freight}
                              onChange={e => updateVehicleExpenseCell(row.id, 'freight', e.target.value)}
                              aria-label="Freight amount"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="mx-auto h-10 w-full max-w-[7.5rem] rounded-md border-border/70 bg-background px-2 text-center text-sm tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={row.unloading === 0 ? '' : row.unloading}
                              onChange={e => updateVehicleExpenseCell(row.id, 'unloading', e.target.value)}
                              aria-label="Unloading charges"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="mx-auto h-10 w-full max-w-[7.5rem] rounded-md border-border/70 bg-background px-2 text-center text-sm tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={row.weighing === 0 ? '' : row.weighing}
                              onChange={e => updateVehicleExpenseCell(row.id, 'weighing', e.target.value)}
                              aria-label="Weighing charges"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="mx-auto h-10 w-full max-w-[7.5rem] rounded-md border-border/70 bg-background px-2 text-center text-sm tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              value={row.gunnies === 0 ? '' : row.gunnies}
                              onChange={e => updateVehicleExpenseCell(row.id, 'gunnies', e.target.value)}
                              aria-label="Gunnies"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border/60 bg-muted/60">
                        <td className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-foreground">
                          Total
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-foreground">
                          {vehicleExpenseTotals.quantity}
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-foreground">
                          {vehicleExpenseTotals.freight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-foreground">
                          {vehicleExpenseTotals.unloading.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-foreground">
                          {vehicleExpenseTotals.weighing.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-center text-sm font-bold tabular-nums text-foreground">
                          {vehicleExpenseTotals.gunnies.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4 sm:px-6">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setVehicleExpenseModalOpen(false)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl"
                    onClick={() => {
                      setSellerExpensesById(prev => {
                        const next = { ...prev };
                        for (const row of vehicleExpenseRows) {
                          next[row.sellerId] = {
                            ...(prev[row.sellerId] ?? defaultSellerExpenses()),
                            freight: row.freight,
                            unloading: row.unloading,
                            weighman: row.weighing,
                            gunnies: row.gunnies,
                          };
                        }
                        return next;
                      });
                      setVehicleExpenseModalOpen(false);
                      toast.success('Expenses applied to per-seller Sales report.');
                    }}
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Apply to settlement
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={addVoucherSellerId != null}
            onOpenChange={open => {
              if (!open) setAddVoucherSellerId(null);
            }}
          >
            <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-0 sm:p-0">
              <div className="border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-base font-bold tracking-tight">Add Voucher</DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground">
                    Select rows to add; cash advance link comes later.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="space-y-3 px-4 py-3 sm:px-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="add-voucher-name-filter" className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Enter Voucher Name
                    </label>
                    <Input
                      id="add-voucher-name-filter"
                      value={voucherSearchVoucherName}
                      onChange={e => setVoucherSearchVoucherName(e.target.value)}
                      placeholder="Voucher name…"
                      className="h-9 rounded-lg text-sm"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="add-voucher-enter-name" className="text-[10px] font-semibold uppercase text-muted-foreground">
                      Enter Name
                    </label>
                    <Input
                      id="add-voucher-enter-name"
                      value={voucherSearchName}
                      onChange={e => setVoucherSearchName(e.target.value)}
                      placeholder="Name…"
                      className="h-9 rounded-lg text-sm"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => {
                    const pk = addVoucherSellerId ?? 'x';
                    const base: VoucherPickRow[] = [
                      {
                        id: `${pk}-v1`,
                        voucher: voucherSearchVoucherName.trim() || 'VOU-2026-0001',
                        narration: 'Receivable — on account',
                        receivable: 125000,
                        remaining: 42000,
                        received: 83000,
                      },
                      {
                        id: `${pk}-v2`,
                        voucher: voucherSearchVoucherName.trim() ? `${voucherSearchVoucherName.trim()}-002` : 'VOU-2026-0002',
                        narration: 'Advance — pending allocation',
                        receivable: 45000,
                        remaining: 45000,
                        received: 0,
                      },
                    ];
                    const q = voucherSearchName.trim().toLowerCase();
                    const rows = q
                      ? base.filter(r => r.narration.toLowerCase().includes(q) || r.voucher.toLowerCase().includes(q))
                      : base;
                    setVoucherPickRows(rows.length > 0 ? rows : base);
                    setSelectedVoucherRowIds({});
                  }}
                >
                  Get Voucher
                </Button>
              </div>
              <div className="px-4 pb-3 sm:px-5">
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full min-w-[700px] border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40">
                        <th className="w-10 px-2 py-2 text-center font-semibold text-muted-foreground">Action</th>
                        <th className="px-2 py-2 font-semibold text-muted-foreground">Voucher</th>
                        <th className="px-2 py-2 font-semibold text-muted-foreground">Narration</th>
                        <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Receivable</th>
                        <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Remaining</th>
                        <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucherPickRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                            Use Get Voucher to load rows.
                          </td>
                        </tr>
                      ) : (
                        voucherPickRows.map(row => (
                          <tr key={row.id} className="border-b border-border/40 odd:bg-background even:bg-muted/15">
                            <td className="px-2 py-2 text-center align-middle">
                              <Checkbox
                                checked={selectedVoucherRowIds[row.id] === true}
                                onCheckedChange={v => {
                                  const on = v === true;
                                  setSelectedVoucherRowIds(prev => ({ ...prev, [row.id]: on }));
                                }}
                                aria-label={`Select ${row.voucher}`}
                              />
                            </td>
                            <td className="px-2 py-2 align-middle font-medium text-foreground">{row.voucher}</td>
                            <td className="px-2 py-2 align-middle text-muted-foreground">{row.narration}</td>
                            <td className="px-2 py-2 text-right align-middle tabular-nums">{formatMoney2Display(row.receivable)}</td>
                            <td className="px-2 py-2 text-right align-middle tabular-nums">{formatMoney2Display(row.remaining)}</td>
                            <td className="px-2 py-2 text-right align-middle tabular-nums">{formatMoney2Display(row.received)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <DialogFooter className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setAddVoucherSellerId(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => {
                      const picked = voucherPickRows.filter(r => selectedVoucherRowIds[r.id]);
                      if (picked.length === 0) {
                        toast.message('Select at least one voucher row.');
                        return;
                      }
                      toast.success(`${picked.length} voucher row(s) selected — cash advance link pending.`);
                      setAddVoucherSellerId(null);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={deleteLotConfirm != null}
            onOpenChange={open => {
              if (!open) setDeleteLotConfirm(null);
            }}
          >
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this lot row?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteLotConfirm
                    ? `“${deleteLotConfirm.itemLabel}” will be removed from this sales report for now. Regenerate the patti from the arrival list to restore full lot lines.`
                    : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (!deleteLotConfirm) return;
                    const { sellerId, lotId } = deleteLotConfirm;
                    setRemovedLotsBySellerId(prev => ({
                      ...prev,
                      [sellerId]: [...(prev[sellerId] ?? []), lotId],
                    }));
                    setDeleteLotConfirm(null);
                  }}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {!isDesktop && <BottomNav />}
      </div>
    );
  }

  // ═══ SELLER LIST SCREEN ═══
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {!isDesktop ? (
      <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.2)_0%,transparent_42%)]" />
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
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-xl font-black">₹</span> Settlement (Sales Patti)
              </h1>
              <p className="text-white/70 text-xs mt-0.5">{sellers.length} sellers · Settlement & payment reconciliation</p>
            </div>
          </div>
          <div className="mb-3 flex gap-2 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button onClick={() => setSettlementMainTab('arrival-summary')}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation",
                settlementMainTab === 'arrival-summary'
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                  : 'bg-white/10 text-white/70 hover:text-white')}>
              <FileText className="w-4 h-4" /> Arrival Summary
            </button>
            <button
              type="button"
              disabled={!hasArrivalSelection}
              aria-disabled={!hasArrivalSelection}
              onClick={() => {
                if (!hasArrivalSelection) {
                  toast.message('Select an arrival bill first.');
                  return;
                }
                setSettlementMainTab('create-settlements');
              }}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation",
                !hasArrivalSelection && "cursor-not-allowed opacity-55",
                settlementMainTab === 'create-settlements'
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                  : 'bg-white/10 text-white/70 hover:text-white')}>
              <Edit3 className="w-4 h-4" /> Create Sattlements
            </button>
          </div>
          {!hasArrivalSelection && (
            <p className="mb-3 text-center text-[11px] text-white/70">
              Tap any arrival bill row first to enable Create Sattlements.
            </p>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input aria-label="Search" placeholder="Search by vehicle, seller name..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none focus:border-white/30" />
          </div>
        </div>
      </div>
      ) : (
      <div className="px-8 py-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹</span> Settlement (Sales Patti)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{sellers.length} sellers · Settlement & payment reconciliation</p>
        </div>
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 rounded-2xl bg-muted/30 p-1">
            <button onClick={() => setSettlementMainTab('arrival-summary')}
              className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
                settlementMainTab === 'arrival-summary' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'glass-card text-muted-foreground hover:text-foreground')}>
              <FileText className="w-4 h-4" /> Arrival Summary
            </button>
            <button
              type="button"
              disabled={!hasArrivalSelection}
              aria-disabled={!hasArrivalSelection}
              onClick={() => {
                if (!hasArrivalSelection) {
                  toast.message('Select an arrival bill first.');
                  return;
                }
                setSettlementMainTab('create-settlements');
              }}
              className={cn("px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
                !hasArrivalSelection && "cursor-not-allowed opacity-55",
                settlementMainTab === 'create-settlements' ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'glass-card text-muted-foreground hover:text-foreground')}>
              <Edit3 className="w-4 h-4" /> Create Sattlements
            </button>
          </div>
          {!hasArrivalSelection && (
            <p className="text-xs text-muted-foreground">
              Select any arrival bill to enable Create Sattlements.
            </p>
          )}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input aria-label="Search" placeholder="Search by vehicle, seller name..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50" />
          </div>
        </div>
      </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {settlementMainTab === 'arrival-summary' ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setArrivalSummaryTab('new-patti')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  arrivalSummaryTab === 'new-patti'
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                    : 'glass-card text-muted-foreground hover:text-foreground'
                )}
              >
                New Patti
              </button>
              <button
                onClick={() => setArrivalSummaryTab('saved-patti')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  arrivalSummaryTab === 'saved-patti'
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                    : 'glass-card text-muted-foreground hover:text-foreground'
                )}
              >
                Saved Patti
              </button>
            </div>
            {renderArrivalSummaryTable(arrivalSummaryTab)}
          </>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Edit3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Create Sattlements form section is ready.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Structure added. Share the form layout and fields next, and I will implement it.
            </p>
          </div>
        )}
      </div>
      {!isDesktop && <BottomNav />}
    </div>
  );
};

export default SettlementPage;