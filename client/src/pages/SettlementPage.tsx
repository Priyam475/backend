import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Search, Users, Package, Truck,
  Edit3, Save, Printer, PlusCircle, Receipt, Scale, Gavel, IndianRupee, Trash2, Loader2,
  ChevronDown, ChevronUp, Info, RotateCcw,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import {
  printLogApi,
  settlementApi,
  arrivalsApi,
  commodityApi,
  contactApi,
  type PattiDTO,
  type PattiSaveRequest,
} from '@/services/api';
import { ContactApiError } from '@/services/api/contacts';
import type { ArrivalFullDetail, ArrivalSellerFullDetail } from '@/services/api/arrivals';
import type { FullCommodityConfigDto } from '@/services/api/commodities';
import type { Commodity, Contact } from '@/types/models';
import { directPrint } from '@/utils/printTemplates';
import { generateSalesPattiBatchPrintHTML, generateSalesPattiPrintHTML, type PattiPrintData } from '@/utils/printDocumentTemplates';
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

/**
 * Settlement button language:
 * - Premium gradient (same family as table headers)
 * - Hover highlight border + stronger glow
 */
const settlementBtnGradient =
  '!bg-[linear-gradient(90deg,#4B7CF3_0%,#5B8CFF_45%,#7B61FF_100%)] !text-white border border-white/25 shadow-[0_10px_24px_-12px_rgba(91,140,255,0.85)] hover:!brightness-110 hover:border-white/45 hover:shadow-[0_14px_30px_-12px_rgba(123,97,255,0.9)] active:scale-[0.99] transition-all';
const arrOutlineMd = cn('rounded-xl h-9 text-sm font-semibold', settlementBtnGradient);
const arrOutlineTall = cn('rounded-xl h-12 text-sm font-semibold', settlementBtnGradient);
const arrOutlineSm = cn('rounded-xl h-8 text-xs font-semibold', settlementBtnGradient);
const arrSolid =
  cn('rounded-xl font-bold', settlementBtnGradient);
const arrSolidMd = cn(arrSolid, 'h-9 px-3 text-sm');
const arrSolidTall = cn(arrSolid, 'h-12 px-6 text-sm');
const arrSolidSm = cn(arrSolid, 'h-8 px-2.5 text-xs');

/**
 * Settlement toggle row: same visual language as New Patti / Saved Patti (rounded-xl, gradient active).
 * Used for main tabs (Arrival summary / Create settlements) and arrival-summary sub-tabs.
 */
const settlementToggleTabBtn = (active: boolean) =>
  cn(
    'shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 min-h-10',
    active
      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
      : 'glass-card text-muted-foreground hover:text-foreground',
  );

/** Same as settlementToggleTabBtn but inactive state readable on the teal mobile hero. */
const settlementToggleTabBtnOnHero = (active: boolean) =>
  cn(
    'shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 min-h-10',
    active
      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
      : 'bg-white/15 text-white/90 hover:bg-white/25 border border-white/10 backdrop-blur-sm',
  );

/** Sales report: outer card border per seller (same accent idea as Vehicle details tiles). */
const SALES_REPORT_SELLER_CARD_STYLES = [
  'border-blue-500/20 bg-muted/30',
  'border-cyan-500/20 bg-muted/30',
  'border-amber-500/20 bg-muted/30',
  'border-emerald-500/20 bg-muted/30',
  'border-violet-500/20 bg-muted/30',
  'border-fuchsia-500/20 bg-muted/30',
] as const;

/** Same gradient language as `DesktopSidebar` (linear + radial shine). */
const DESKTOP_SIDEBAR_LIKE_GRADIENT_BG =
  'bg-[linear-gradient(180deg,#4B7CF3_0%,#5B8CFF_30%,#7B61FF_100%)]';
const DESKTOP_SIDEBAR_LIKE_SHINE =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_60%)]';
/** Horizontal variant so the full sweep reads across column headers. */
const SETTLEMENT_LOTS_TABLE_HEADER_GRADIENT =
  'bg-[linear-gradient(90deg,#4B7CF3_0%,#5B8CFF_45%,#7B61FF_100%)]';

// ── Types ─────────────────────────────────────────────────
interface SellerSettlement {
  sellerId: string;
  sellerName: string;
  sellerMark: string;
  /** Arrivals vehicle id (from settlement API) for direct arrival freight lookup. */
  vehicleId?: number;
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
  lots: number;
  bids: number;
  weighed: number;
  representativePattiId: number | null;
}

/** Lower SL No. sorts first; missing serial sorts last (stable tie-break on sellerId). */
function sellerSerialSortKey(serial: string | number | null | undefined): number {
  if (serial == null || serial === '') return Number.POSITIVE_INFINITY;
  const n = Number(serial);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function pickFirstArrivalSeller(
  sellerIds: string[],
  sellerById: Map<string, SellerSettlement>
): SellerSettlement | undefined {
  const list = sellerIds
    .map(id => sellerById.get(String(id)))
    .filter((s): s is SellerSettlement => s != null);
  if (list.length === 0) return undefined;
  list.sort((a, b) => {
    const d = sellerSerialSortKey(a.sellerSerialNo) - sellerSerialSortKey(b.sellerSerialNo);
    if (d !== 0) return d;
    return String(a.sellerId).localeCompare(String(b.sellerId));
  });
  return list[0];
}

function formatSettlementSellerLabel(s: SellerSettlement): string {
  const name = (s.sellerName || '').trim();
  const mark = (s.sellerMark || '').trim();
  if (!name && !mark) return '-';
  return mark ? `${name} – ${mark}` : name;
}

/** One label for the arrival-summary table: first seller on the vehicle by arrival serial. */
function firstArrivalSellerLabel(
  sellerIds: string[],
  sellerById: Map<string, SellerSettlement>,
  fallbackName?: string
): string {
  const first = pickFirstArrivalSeller(sellerIds, sellerById);
  if (first) return formatSettlementSellerLabel(first);
  const fb = (fallbackName || '').trim();
  return fb || '-';
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

/** INR display: always two decimals (en-IN), signed-safe (unlike `roundMoney2` which floors negatives). */
function formatMoney2Display(n: number): string {
  if (!Number.isFinite(n)) {
    return (0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const x = Math.round((n + Number.EPSILON) * 100) / 100;
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
  if (!weighingEnabled && mergeWeighingIntoFreight) {
    freightAmt = exp.freight + exp.weighman;
    weighingAmt = 0;
  }

  const items: DeductionItem[] = [
    {
      key: 'freight',
      label: !weighingEnabled && mergeWeighingIntoFreight ? 'Freight (incl. weighing)' : 'Freight',
      amount: freightAmt,
      editable: true,
      autoPulled: true,
    },
    { key: 'coolie', label: coolieLabel, amount: exp.unloading, editable: true, autoPulled: true },
  ];
  if (weighingEnabled) {
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
  if (!weighingEnabled && mergeWeighingIntoFreight) {
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
  registrationChosen: boolean;
  registered: boolean;
  contactId: string | null;
  mark: string;
  name: string;
  mobile: string;
  contactSearchQuery: string;
  addAndChangeSeller: boolean;
  allowRegisteredEdit: boolean;
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
type VehicleExpenseField = 'freight' | 'unloading' | 'weighing' | 'gunnies';
type VehicleExpenseFieldValues = Pick<VehicleExpenseRow, VehicleExpenseField>;

interface AddVoucherRowState {
  id?: number;
  localId: string;
  voucherName: string;
  description: string;
  expenseAmount: string;
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
  getDivisor?: (lot: SettlementLot) => number,
  weighingEnabled = true,
  mergeWeighingIntoFreight = false,
  sellerMobile = ''
): PattiPrintData {
  const divisorFn = getDivisor ?? (() => 50);
  const lotRows = seller.lots.flatMap((lot, lotIndex) => {
    const sid = lotStableId(lot, lotIndex);
    if (removedIds.has(sid)) return [];
    const ov = lotOverrides?.[sid];
    const row = mergeLotDisplayRow(lot, ov, divisorFn(lot));
    return [{
      mark: (seller.sellerMark || '-').trim() || '-',
      bags: Number(row.qty) || 0,
      weight: Number(row.weight) || 0,
      rate: Number(row.ratePerBag) || 0,
      amount: Number(row.amount) || 0,
    }];
  });

  const rateClusters = buildRateClustersFromSellerLots(seller, removedIds, lotOverrides, getDivisor);
  const grossAmount = lotRows.reduce((s, r) => s + r.amount, 0);
  let freightAmount = expenses.freight;
  let weighingAmount = weighingEnabled ? expenses.weighman : 0;
  if (!weighingEnabled && mergeWeighingIntoFreight) {
    freightAmount += expenses.weighman;
    weighingAmount = 0;
  }

  const deductions = [
    { key: 'freight', label: 'Freight Amount', amount: freightAmount, autoPulled: false },
    { key: 'unloading', label: 'Unloading Charges', amount: expenses.unloading, autoPulled: false },
    { key: 'advance', label: 'Cash Advance', amount: expenses.cashAdvance, autoPulled: false },
    { key: 'gunnies', label: 'Gunnies', amount: expenses.gunnies, autoPulled: false },
    { key: 'others', label: 'Others', amount: expenses.others, autoPulled: false },
  ];
  if (weighingEnabled) {
    deductions.splice(2, 0, { key: 'weighing', label: 'Weighing Charges', amount: weighingAmount, autoPulled: false });
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const subLabel = pattiId ? `${pattiId} · Sub` : 'Sub-patti';
  const commodityNames = Array.from(
    new Set(seller.lots.map(l => String(l.commodityName || '').trim()).filter(Boolean)),
  );
  const commodityName = commodityNames.length === 1
    ? commodityNames[0]
    : (commodityNames.length > 1 ? 'Mixed Commodity' : 'Commodity');
  const totalBags = lotRows.reduce((s, r) => s + r.bags, 0);

  return {
    pattiId: subLabel,
    sellerName: displayName,
    sellerMobile,
    sellerAddress: seller.fromLocation || '',
    vehicleNumber: seller.vehicleNumber || '',
    commodityName,
    totalBags,
    detailRows: lotRows,
    rateClusters,
    grossAmount,
    deductions,
    totalDeductions,
    netPayable: grossAmount - totalDeductions,
    createdAt,
    useAverageWeight: false,
  };
}

function defaultSellerForm(seller: SellerSettlement): SellerRegFormState {
  const linked = seller.contactId != null && String(seller.contactId).trim() !== '';
  return {
    registrationChosen: false,
    registered: false,
    contactId: linked ? String(seller.contactId) : null,
    mark: seller.sellerMark || '',
    name: seller.sellerName || '',
    mobile: (seller.sellerPhone ?? '').trim(),
    contactSearchQuery: '',
    addAndChangeSeller: false,
    allowRegisteredEdit: false,
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
  const [draftMainPattiNo, setDraftMainPattiNo] = useState('');
  const [draftPattiNoBySellerId, setDraftPattiNoBySellerId] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [settlementMainTab, setSettlementMainTab] = useState<'arrival-summary' | 'create-settlements'>('arrival-summary');
  const [arrivalSummaryTab, setArrivalSummaryTab] = useState<'new-patti' | 'saved-patti'>('new-patti');
  const [hasArrivalSelection, setHasArrivalSelection] = useState(false);
  
  // Patti state
  const [pattiData, setPattiData] = useState<PattiData | null>(null);
  /** DB row id per settlement seller — supports multi-seller saves without overwriting another seller's patti. */
  const [existingPattiIdBySellerId, setExistingPattiIdBySellerId] = useState<Record<string, number>>({});
  const [savedPattis, setSavedPattis] = useState<PattiDTO[]>([]);
  /** Full DTO from API (includes version history after updates). */
  const [pattiDetailDto, setPattiDetailDto] = useState<PattiDTO | null>(null);
  const [selectedPattiVersion, setSelectedPattiVersion] = useState<'latest' | number>('latest');
  const latestPattiDataSnapshotRef = useRef<PattiData | null>(null);
  const [loadingPattis, setLoadingPattis] = useState(false);
  const [coolieMode, setCoolieMode] = useState<'FLAT' | 'RECALCULATED'>('FLAT');
  /** Toggle 1: use weighing charges in settlement totals. */
  const [settlementWeighingEnabled, setSettlementWeighingEnabled] = useState(true);
  /** Toggle 2 (seller-level): merge weighing into freight for display and main patti deductions. */
  const [settlementWeighingMergeIntoFreightBySellerId, setSettlementWeighingMergeIntoFreightBySellerId] = useState<
    Record<string, boolean>
  >({});
  const [gunniesAmount, setGunniesAmount] = useState(0);
  /** Per seller: `false` = expanded; missing/`true` = collapsed (default collapsed). */
  const [salesReportCollapsedBySellerId, setSalesReportCollapsedBySellerId] = useState<Record<string, boolean>>({});
  const [showPrint, setShowPrint] = useState(false);
  /** Prevents overlapping save/update requests (buttons + shortcut). */
  const pattiSaveBusyRef = useRef(false);
  const [pattiSaveBusy, setPattiSaveBusy] = useState(false);

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
  const [vehicleExpenseOriginalByRowId, setVehicleExpenseOriginalByRowId] = useState<
    Record<string, VehicleExpenseFieldValues>
  >({});

  const isWeighingMergedIntoFreight = useCallback(
    (sellerId?: string) => (sellerId ? settlementWeighingMergeIntoFreightBySellerId[sellerId] === true : false),
    [settlementWeighingMergeIntoFreightBySellerId]
  );

  useEffect(() => {
    if (!settlementWeighingEnabled) return;
    setSettlementWeighingMergeIntoFreightBySellerId(prev => {
      if (Object.keys(prev).length === 0) return prev;
      return {};
    });
  }, [settlementWeighingEnabled]);

  const [addVoucherSellerId, setAddVoucherSellerId] = useState<string | null>(null);
  const [addVoucherRows, setAddVoucherRows] = useState<AddVoucherRowState[]>([]);
  const [addVoucherLoading, setAddVoucherLoading] = useState(false);
  const [addVoucherSaving, setAddVoucherSaving] = useState(false);
  const [unloadingDraftBySellerId, setUnloadingDraftBySellerId] = useState<Record<string, string>>({});
  const [weighmanDraftBySellerId, setWeighmanDraftBySellerId] = useState<Record<string, string>>({});

  const buildEmptyVoucherRow = useCallback((): AddVoucherRowState => ({
    localId: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    voucherName: '',
    description: '',
    expenseAmount: '',
  }), []);

  useEffect(() => {
    if (!addVoucherSellerId) return;
    let cancelled = false;
    setAddVoucherLoading(true);
    (async () => {
      try {
        const response = await settlementApi.listTemporaryVouchers(addVoucherSellerId);
        if (cancelled) return;
        const rows =
          response.rows.length > 0
            ? response.rows.map(r => ({
                id: r.id,
                localId: `v_${r.id ?? Math.random().toString(36).slice(2, 8)}`,
                voucherName: r.voucherName ?? '',
                description: r.description ?? '',
                expenseAmount: (Number(r.expenseAmount ?? 0) || 0).toFixed(2),
              }))
            : [buildEmptyVoucherRow()];
        setAddVoucherRows(rows);
      } catch {
        if (!cancelled) {
          setAddVoucherRows([buildEmptyVoucherRow()]);
          toast.error('Failed to load vouchers.');
        }
      } finally {
        if (!cancelled) setAddVoucherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addVoucherSellerId, buildEmptyVoucherRow]);

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

  /** Contact search (registered sellers / contact registry) per seller card in Sales report. */
  const [sellerContactSearchById, setSellerContactSearchById] = useState<Record<string, Contact[]>>({});
  const [sellerContactSearchLoading, setSellerContactSearchLoading] = useState<Record<string, boolean>>({});
  const [sellerLookupOpenForId, setSellerLookupOpenForId] = useState<string | null>(null);
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
      .listPattis({ page: 0, size: 500 })
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
  const generatePatti = useCallback(async (seller: SellerSettlement, overrides?: { coolieMode?: 'FLAT' | 'RECALCULATED'; gunniesAmount?: number; arrivalSellerIds?: string[] }) => {
    setPattiDetailDto(null);
    setSelectedPattiVersion('latest');
    latestPattiDataSnapshotRef.current = null;
    setExistingPattiIdBySellerId({});
    setRemovedLotsBySellerId({});
    setLotSalesOverridesBySellerId({});
    setVehicleExpenseRows([]);
    setVehicleExpenseOriginalByRowId({});
    setVehicleExpenseModalOpen(false);
    setDraftMainPattiNo('');
    setDraftPattiNoBySellerId({});
    setSelectedSeller(seller);
    const scopeSellerIds = (overrides?.arrivalSellerIds?.length ? overrides.arrivalSellerIds : [seller.sellerId]).map(String);
    setSelectedArrivalSellerIds(scopeSellerIds);
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
      isWeighingMergedIntoFreight(seller.sellerId)
    );

    const baseTotalDeductions = baseDeductions.reduce((s, d) => s + d.amount, 0);
    const baseNetPayable = grossAmount - baseTotalDeductions;

    const createdAt = new Date().toISOString();
    const parseBaseFromPattiId = (pid?: string): string => {
      const raw = String(pid ?? '').trim();
      const m = raw.match(/^(\d+)-\d+$/);
      return m ? m[1] : '';
    };
    const parseSequenceFromPattiId = (pid?: string): number | null => {
      const raw = String(pid ?? '').trim();
      const m = raw.match(/^\d+-(\d+)$/);
      if (!m) return null;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    };
    const scopedSellersOrdered: SellerSettlement[] = scopeSellerIds
      .map(id => sellers.find(s => String(s.sellerId) === id))
      .filter((s): s is SellerSettlement => !!s);
    const scopedSaved = savedPattis.filter(p => scopeSellerIds.includes(String(p.sellerId ?? '').trim()));
    const existingBase =
      scopedSaved.map(p => String(p.pattiBaseNumber ?? '').trim()).find(v => v.length > 0) ||
      scopedSaved.map(p => parseBaseFromPattiId(p.pattiId)).find(v => v.length > 0) ||
      '';
    /** Only show real numbers from already-saved pattis; server assigns base+seq on first save. */
    const baseNo = existingBase;
    const draftBySeller: Record<string, string> = {};
    if (baseNo) {
      let seqCounter = 0;
      for (const p of scopedSaved) {
        const pBase = String(p.pattiBaseNumber ?? '').trim() || parseBaseFromPattiId(p.pattiId);
        if (pBase !== baseNo) continue;
        const seq =
          typeof p.sellerSequenceNumber === 'number' && Number.isFinite(p.sellerSequenceNumber) && p.sellerSequenceNumber > 0
            ? p.sellerSequenceNumber
            : parseSequenceFromPattiId(p.pattiId);
        if (seq != null) seqCounter = Math.max(seqCounter, seq);
      }
      for (const s of scopedSellersOrdered) {
        const sid = String(s.sellerId);
        const saved = scopedSaved.find(p => String(p.sellerId ?? '').trim() === sid);
        if (saved?.pattiId) {
          draftBySeller[sid] = String(saved.pattiId);
          continue;
        }
        seqCounter += 1;
        draftBySeller[sid] = `${baseNo}-${seqCounter}`;
      }
    }
    setDraftMainPattiNo(baseNo);
    setDraftPattiNoBySellerId(draftBySeller);

    setPattiData({
      pattiId: draftBySeller[String(seller.sellerId)] ?? '',
      sellerName: seller.sellerName,
      rateClusters,
      grossAmount,
      deductions: baseDeductions,
      totalDeductions: baseTotalDeductions,
      netPayable: baseNetPayable,
      createdAt,
      useAverageWeight: false,
    });
  }, [coolieMode, gunniesAmount, getLotDivisor, settlementWeighingEnabled, isWeighingMergedIntoFreight, sellers, savedPattis]);

  // Open a saved patti for edit: fetch by id and pre-fill form.
  const openPattiForEdit = useCallback(async (id: number, arrivalSellerIds?: string[]) => {
    try {
      setDraftMainPattiNo('');
      setDraftPattiNoBySellerId({});
      const dto = await settlementApi.getPattiById(id);
      if (!dto) {
        toast.error('Patti not found');
        return;
      }
      setRemovedLotsBySellerId({});
      setLotSalesOverridesBySellerId({});
      setVehicleExpenseRows([]);
      setVehicleExpenseOriginalByRowId({});
      setVehicleExpenseModalOpen(false);
      const data = mapPattiDTOToPattiData(dto);
      if (data.createdAt && new Date(data.createdAt) > new Date()) {
        toast.warning('Patti date is in the future — please verify');
      }
      setPattiData(data);
      setPattiDetailDto(dto);
      setSelectedPattiVersion('latest');
      latestPattiDataSnapshotRef.current = JSON.parse(JSON.stringify(data)) as PattiData;
      const idMap: Record<string, number> = {};
      const editSid = String(dto.sellerId ?? '').trim();
      if (editSid && (dto.id ?? id) != null) {
        idMap[editSid] = Number(dto.id ?? id);
      }
      for (const rawSid of arrivalSellerIds ?? []) {
        const sidKey = String(rawSid ?? '').trim();
        if (!sidKey) continue;
        const saved = savedPattis.find(p => String(p.sellerId ?? '').trim() === sidKey && p.id != null);
        if (saved?.id != null) {
          idMap[sidKey] = Number(saved.id);
        }
      }
      setExistingPattiIdBySellerId(idMap);
      setSelectedArrivalSellerIds(arrivalSellerIds ?? []);
      const sid = String(dto.sellerId ?? '');
      if (sid) {
        setSellerExpensesById(prev => ({
          ...prev,
          [sid]: { ...defaultSellerExpenses(), ...deductionsToSellerExpenseForm(dto.deductions ?? []) },
        }));
      }
      const dtoSellerId = String(dto.sellerId ?? '').trim();
      const fromSellers = dtoSellerId ? sellers.find(s => s.sellerId === dtoSellerId) : undefined;
      setSelectedSeller(
        fromSellers ?? {
          sellerId: dto.sellerId ?? '',
          sellerName: dto.sellerName ?? '',
          sellerMark: '',
          vehicleId: undefined,
          vehicleNumber: (dto.vehicleNumber ?? '').trim(),
          fromLocation: (dto.fromLocation ?? '').trim(),
          sellerSerialNo: dto.sellerSerialNo ?? undefined,
          createdAt: dto.createdAt ?? undefined,
          date: dto.date ?? dto.createdAt ?? undefined,
          lots: [],
        }
      );
    } catch {
      toast.error('Failed to load patti');
    }
  }, [sellers, savedPattis]);

  /** Billing-style: view historical snapshot or return to latest working copy. */
  const applyPattiVersionSelection = useCallback((sel: 'latest' | number) => {
    setSelectedPattiVersion(sel);
    if (sel === 'latest') {
      const snap = latestPattiDataSnapshotRef.current;
      if (snap) setPattiData(JSON.parse(JSON.stringify(snap)) as PattiData);
      return;
    }
    if (!pattiDetailDto?.versions?.length) {
      toast.error(`Version v${sel} not available`);
      return;
    }
    const row = pattiDetailDto.versions.find(v => Number(v.version) === Number(sel));
    const raw = row?.data as Partial<PattiDTO> | undefined;
    if (!raw || typeof raw !== 'object') {
      toast.error(`Version v${sel} data not available`);
      return;
    }
    const merged = { ...pattiDetailDto, ...raw, pattiId: pattiDetailDto.pattiId, sellerId: pattiDetailDto.sellerId } as PattiDTO;
    const next = mapPattiDTOToPattiData(merged);
    setPattiData(next);
    const sid = String(pattiDetailDto.sellerId ?? '').trim();
    if (sid) {
      setSellerExpensesById(prev => ({
        ...prev,
        [sid]: { ...defaultSellerExpenses(), ...deductionsToSellerExpenseForm(next.deductions) },
      }));
    }
  }, [pattiDetailDto]);

  useEffect(() => {
    if (!pattiData || selectedPattiVersion !== 'latest') return;
    latestPattiDataSnapshotRef.current = JSON.parse(JSON.stringify(pattiData)) as PattiData;
  }, [pattiData, selectedPattiVersion]);

  const computePattiSavePayloadForSeller = useCallback(
    (
      seller: SellerSettlement,
      numbering?: { pattiBaseNumber?: string; sellerSequenceNumber?: number }
    ): PattiSaveRequest | null => {
      if (!pattiData) return null;
      const removed = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const ov = lotSalesOverridesBySellerId[seller.sellerId];
      const rateClusters = buildRateClustersFromSellerLots(seller, removed, ov, getLotDivisor);
      const grossAmount = rateClusters.reduce((s, c) => s + c.amount, 0);
      const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
      const form = sellerFormById[seller.sellerId] ?? defaultSellerForm(seller);
      const sellerName = (form.name || seller.sellerName || '').trim() || seller.sellerName;
      const deductions = buildDeductionItemsFromSellerExpenses(
        exp,
        coolieMode,
        settlementWeighingEnabled,
        isWeighingMergedIntoFreight(seller.sellerId)
      );
      const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
      const netPayable = grossAmount - totalDeductions;
      return {
        sellerId: seller.sellerId,
        pattiBaseNumber: numbering?.pattiBaseNumber,
        sellerSequenceNumber: numbering?.sellerSequenceNumber,
        sellerName,
        rateClusters,
        grossAmount,
        deductions,
        totalDeductions,
        netPayable,
        useAverageWeight: pattiData.useAverageWeight,
      };
    },
    [
      pattiData,
      removedLotsBySellerId,
      lotSalesOverridesBySellerId,
      getLotDivisor,
      sellerExpensesById,
      sellerFormById,
      coolieMode,
      settlementWeighingEnabled,
      isWeighingMergedIntoFreight,
    ]
  );

  type SaveSellerOptions = {
    silent?: boolean;
    /** When true, open print preview after a successful save (default: false). */
    showPrintAfterSave?: boolean;
    pattiBaseNumber?: string;
    sellerSequenceNumber?: number;
    /** When true, caller owns patti save busy locking (e.g. Save Main Patti batch). */
    skipBusyGuard?: boolean;
  };

  /** Save or update Sales Patti for one settlement seller. */
  const savePattiForSeller = useCallback(
    async (seller: SellerSettlement, options?: SaveSellerOptions): Promise<boolean> => {
      if (!pattiData) return false;
      const skipBusy = options?.skipBusyGuard === true;
      if (!skipBusy) {
        if (pattiSaveBusyRef.current) return false;
        pattiSaveBusyRef.current = true;
        setPattiSaveBusy(true);
      }
      try {
        const silent = options?.silent === true;
        const showPrintAfterSave = options?.showPrintAfterSave === true;
        const payload = computePattiSavePayloadForSeller(seller, {
          pattiBaseNumber: options?.pattiBaseNumber,
          sellerSequenceNumber: options?.sellerSequenceNumber,
        });
        if (!payload) return false;
        const sid = seller.sellerId;
        const dbId = existingPattiIdBySellerId[sid];
        const actionWord = dbId != null ? 'updated' : 'saved';
        if (!can('Settlement', dbId != null ? 'Edit' : 'Create')) {
          if (!silent) toast.error('You do not have permission to save settlements.');
          return false;
        }
        const applySavedToPrimaryUi = (p: PattiSaveRequest, businessPattiId: string, createdAtIso: string) => {
          if (selectedSeller?.sellerId !== sid) return;
          setPattiData(prev =>
            prev
              ? {
                  ...prev,
                  pattiId: businessPattiId || prev.pattiId,
                  sellerName: p.sellerName,
                  rateClusters: p.rateClusters,
                  grossAmount: p.grossAmount,
                  deductions: p.deductions,
                  totalDeductions: p.totalDeductions,
                  netPayable: p.netPayable,
                  createdAt: createdAtIso || prev.createdAt,
                }
              : null
          );
        };
        try {
          if (dbId != null) {
            const updated = await settlementApi.updatePatti(dbId, payload);
            if (updated) {
              applySavedToPrimaryUi(payload, updated.pattiId ?? '', updated.createdAt ?? '');
              setPattiDetailDto(updated);
              setSelectedPattiVersion('latest');
              if (!silent) toast.success(`Sales Patti ${updated.pattiId} ${actionWord}.`);
              if (showPrintAfterSave) setShowPrint(true);
              loadSavedPattis();
              return true;
            }
            if (!silent) toast.error('Failed to update patti');
            return false;
          }
          const created = await settlementApi.createPatti(payload);
          if (created?.pattiId) {
            if (created.id != null) {
              setExistingPattiIdBySellerId(prev => ({ ...prev, [sid]: created.id! }));
            }
            const at = created.createdAt ?? new Date().toISOString();
            applySavedToPrimaryUi(payload, created.pattiId, at);
            setPattiDetailDto(created);
            setSelectedPattiVersion('latest');
            if (!silent && selectedSeller?.sellerId === sid) {
              toast.success(`Sales Patti ${created.pattiId} ${actionWord}.`);
            } else if (!silent) {
              toast.success(`Sales Patti ${created.pattiId} ${actionWord} for ${payload.sellerName}.`);
            }
            if (showPrintAfterSave) setShowPrint(true);
            loadSavedPattis();
            return true;
          }
          if (!silent) toast.error('Failed to save patti');
          return false;
        } catch {
          if (!silent) toast.error(dbId != null ? 'Failed to update patti' : 'Failed to save patti');
          return false;
        }
      } finally {
        if (!skipBusy) {
          pattiSaveBusyRef.current = false;
          setPattiSaveBusy(false);
        }
      }
    },
    [
      pattiData,
      computePattiSavePayloadForSeller,
      existingPattiIdBySellerId,
      can,
      selectedSeller?.sellerId,
      loadSavedPattis,
    ]
  );

  const getSellerValidationError = useCallback(
    (seller: SellerSettlement): string | null => {
      const form = sellerFormById[seller.sellerId] ?? defaultSellerForm(seller);
      const sellerName = (form.name || seller.sellerName || '').trim();
      if (!sellerName) {
        return `${seller.sellerName || 'Seller'}: seller name is required`;
      }
      const removedSet = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const lotOv = lotSalesOverridesBySellerId[seller.sellerId] ?? {};
      const visibleLots = (seller.lots ?? [])
        .map((lot, i) => ({ lot, sid: lotStableId(lot, i) }))
        .filter(x => !removedSet.has(x.sid));
      if (visibleLots.length === 0) {
        return `${sellerName}: at least one lot is required`;
      }
      for (const { lot, sid } of visibleLots) {
        const row = mergeLotDisplayRow(lot, lotOv[sid], getLotDivisor(lot));
        if (!Number.isFinite(row.qty) || row.qty <= 0) {
          return `${sellerName}: quantity must be greater than 0`;
        }
        if (!Number.isFinite(row.weight) || row.weight <= 0) {
          return `${sellerName}: weight must be greater than 0`;
        }
        if (!Number.isFinite(row.ratePerBag) || row.ratePerBag <= 0) {
          return `${sellerName}: rate must be greater than 0`;
        }
      }
      return null;
    },
    [sellerFormById, removedLotsBySellerId, lotSalesOverridesBySellerId, getLotDivisor]
  );

  const savePatti = async () => {
    if (!selectedSeller || !pattiData) return;
    if (pattiSaveBusyRef.current) return;
    if (!canRunMainPattiActions) {
      toast.error(mainPattiValidationError ?? 'Please complete required fields before saving.');
      return;
    }
    pattiSaveBusyRef.current = true;
    setPattiSaveBusy(true);
    try {
      const failures: string[] = [];
      const sellersNeedingCreate = arrivalSellersForPatti.filter(s => existingPattiIdBySellerId[s.sellerId] == null);
      let sharedPattiBaseNumber: string | null = draftMainPattiNo || null;
      const sellerSequenceBySellerId: Record<string, number> = {};
      const parseSeqFromPattiId = (pid?: string): number | undefined => {
        const m = String(pid ?? '').trim().match(/^\d+-(\d+)$/);
        if (!m) return undefined;
        const n = Number(m[1]);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      };
      for (const s of sellersNeedingCreate) {
        const seq = parseSeqFromPattiId(draftPattiNoBySellerId[s.sellerId]);
        if (seq != null) sellerSequenceBySellerId[s.sellerId] = seq;
      }
      if (sellersNeedingCreate.length > 0) {
        const scopedSids = new Set(arrivalSellersForPatti.map(s => String(s.sellerId)));
        const scopedSaved = savedPattis.filter(p => scopedSids.has(String(p.sellerId ?? '').trim()));
        const parseBaseFromPattiId = (pid?: string): string => {
          const raw = String(pid ?? '').trim();
          const m = raw.match(/^(\d+)-\d+$/);
          return m ? m[1] : '';
        };
        const parseSequenceFromPattiId = (pid?: string): number | null => {
          const raw = String(pid ?? '').trim();
          const m = raw.match(/^\d+-(\d+)$/);
          if (!m) return null;
          const n = Number(m[1]);
          return Number.isFinite(n) ? n : null;
        };
        const existingBase =
          scopedSaved.map(p => String(p.pattiBaseNumber ?? '').trim()).find(v => v.length > 0) ||
          scopedSaved.map(p => parseBaseFromPattiId(p.pattiId)).find(v => v.length > 0) ||
          '';
        if (!sharedPattiBaseNumber && existingBase) {
          sharedPattiBaseNumber = existingBase;
        } else if (!sharedPattiBaseNumber) {
          try {
            sharedPattiBaseNumber = await settlementApi.reserveNextPattiBaseNumber();
          } catch {
            toast.error('Failed to reserve Sales Patti number.');
            return;
          }
        }

        let seqCounter = Object.values(sellerSequenceBySellerId).reduce((mx, n) => Math.max(mx, n), 0);
        for (const p of scopedSaved) {
          const pBase =
            String(p.pattiBaseNumber ?? '').trim() ||
            parseBaseFromPattiId(p.pattiId);
          if (!pBase || pBase !== sharedPattiBaseNumber) continue;
          const seqRaw = p.sellerSequenceNumber;
          const seqNum =
            typeof seqRaw === 'number' && Number.isFinite(seqRaw) && seqRaw > 0
              ? seqRaw
              : parseSequenceFromPattiId(p.pattiId);
          if (seqNum != null) seqCounter = Math.max(seqCounter, seqNum);
        }
        for (const seller of sellersNeedingCreate) {
          if (sellerSequenceBySellerId[seller.sellerId] != null) continue;
          seqCounter += 1;
          sellerSequenceBySellerId[seller.sellerId] = seqCounter;
        }
      }
      for (const seller of arrivalSellersForPatti) {
        const needsCreate = existingPattiIdBySellerId[seller.sellerId] == null;
        const sellerSequenceNumber = needsCreate ? sellerSequenceBySellerId[seller.sellerId] : undefined;
        const ok = await savePattiForSeller(seller, {
          silent: true,
          showPrintAfterSave: false,
          skipBusyGuard: true,
          pattiBaseNumber: needsCreate ? sharedPattiBaseNumber ?? undefined : undefined,
          sellerSequenceNumber: needsCreate ? sellerSequenceNumber : undefined,
        });
        if (!ok) failures.push(seller.sellerName || seller.sellerId);
      }
      if (failures.length > 0) {
        toast.error(`Failed to save ${failures.length} seller patti(s): ${failures.join(', ')}`);
        return;
      }
      const allInUpdateMode = arrivalSellersForPatti.every(s => existingPattiIdBySellerId[s.sellerId] != null);
      toast.success(
        `Main patti ${allInUpdateMode ? 'updated' : 'saved'} for all ${arrivalSellersForPatti.length} seller(s). Use Print when ready.`
      );
    } finally {
      pattiSaveBusyRef.current = false;
      setPattiSaveBusy(false);
    }
  };

  saveMainPattiShortcutRef.current = () => {
    if (selectedSeller) void savePatti();
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

  const sellerSalesPattiNumberBySellerId = useMemo(() => {
    const map: Record<string, string> = { ...draftPattiNoBySellerId };
    for (const p of savedPattis) {
      const sid = String(p.sellerId ?? '').trim();
      const pid = String(p.pattiId ?? '').trim();
      if (!sid || !pid) continue;
      map[sid] = pid;
    }
    const currentSid = String(selectedSeller?.sellerId ?? '').trim();
    const currentPid = String(pattiData?.pattiId ?? '').trim();
    if (currentSid && currentPid) {
      map[currentSid] = currentPid;
    }
    return map;
  }, [savedPattis, selectedSeller?.sellerId, pattiData?.pattiId, draftPattiNoBySellerId]);

  const displayMainSalesPattiNo = useMemo(() => {
    if (draftMainPattiNo) return draftMainPattiNo;
    const dtoBase = String(pattiDetailDto?.pattiBaseNumber ?? '').trim();
    if (dtoBase) return dtoBase;
    const sid = String(selectedSeller?.sellerId ?? '').trim();
    const sellerPattiNo = sid ? String(sellerSalesPattiNumberBySellerId[sid] ?? '').trim() : '';
    const raw = sellerPattiNo || String(pattiData?.pattiId ?? '').trim();
    const m = raw.match(/^(\d+)-\d+$/);
    return m ? m[1] : '';
  }, [
    draftMainPattiNo,
    pattiDetailDto?.pattiBaseNumber,
    selectedSeller?.sellerId,
    sellerSalesPattiNumberBySellerId,
    pattiData?.pattiId,
  ]);

  /** Settlement sellers that already have a saved Sales Patti — hide from New Patti tab. */
  const sellerIdsWithSavedPatti = useMemo(() => {
    const set = new Set<string>();
    for (const p of savedPattis) {
      const sid = String(p.sellerId ?? '').trim();
      if (sid) set.add(sid);
    }
    return set;
  }, [savedPattis]);

  const sellersEligibleForNewPatti = useMemo(
    () => filteredSellers.filter(s => !sellerIdsWithSavedPatti.has(s.sellerId)),
    [filteredSellers, sellerIdsWithSavedPatti]
  );

  const newPattiArrivalRows = useMemo<ArrivalSummaryRow[]>(() => {
    const groups = new Map<string, ArrivalSummaryRow>();
    for (const seller of sellersEligibleForNewPatti) {
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
          sellerNames: '',
          lots,
          bids,
          weighed,
          sellerIds: [seller.sellerId],
          representativeSeller: seller,
        });
        continue;
      }
      existing.lots += lots;
      existing.bids += bids;
      existing.weighed += weighed;
      if (!existing.sellerIds.includes(seller.sellerId)) existing.sellerIds.push(seller.sellerId);
      if (existing.serialNo == null && seller.sellerSerialNo != null) existing.serialNo = seller.sellerSerialNo;
    }
    const eligibleById = new Map(sellersEligibleForNewPatti.map(s => [String(s.sellerId), s]));
    return Array.from(groups.values()).map(row => {
      const first = pickFirstArrivalSeller(row.sellerIds, eligibleById) ?? row.representativeSeller;
      return {
        ...row,
        sellerNames: firstArrivalSellerLabel(row.sellerIds, eligibleById),
        representativeSeller: first,
        serialNo: first.sellerSerialNo ?? row.serialNo,
      };
    });
  }, [sellersEligibleForNewPatti]);

  const savedPattiArrivalRows = useMemo<SavedArrivalSummaryRow[]>(() => {
    const groups = new Map<string, SavedArrivalSummaryRow & { _fallbackName?: string }>();
    const sellerById = new Map<string, SellerSettlement>(sellers.map(s => [String(s.sellerId), s]));
    for (const p of filteredSavedPattis) {
      const vehicleNumber = (p.vehicleNumber || '').trim();
      const fromLocation = (p.fromLocation || '').trim();
      const serialNo = p.sellerSerialNo ?? null;
      const dateRaw = (p.date ?? p.createdAt ?? '').toString();
      const dateObj = dateRaw ? new Date(dateRaw) : null;
      const dateLabel = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : '-';
      const key = [vehicleNumber.toLowerCase(), fromLocation.toLowerCase(), dateRaw].join('|');
      const existing = groups.get(key);
      const sid = p.sellerId ? String(p.sellerId) : '';
      const seller = sid ? sellerById.get(sid) : undefined;
      const lots = seller ? getSellerLots(seller) : 0;
      const bids = seller ? getSellerBids(seller) : 0;
      const weighed = seller ? getSellerWeighed(seller) : 0;
      if (!existing) {
        groups.set(key, {
          key,
          vehicleNumber: vehicleNumber || '-',
          fromLocation: fromLocation || '-',
          serialNo,
          dateLabel,
          sellerNames: '',
          sellerIds: sid ? [sid] : [],
          lots,
          bids,
          weighed,
          representativePattiId: p.id ?? null,
          _fallbackName: (p.sellerName || '').trim() || undefined,
        });
        continue;
      }
      if (sid && !existing.sellerIds.includes(sid)) {
        existing.sellerIds.push(sid);
        existing.lots += lots;
        existing.bids += bids;
        existing.weighed += weighed;
      }
      if (existing.serialNo == null && serialNo != null) existing.serialNo = serialNo;
      if (existing.representativePattiId == null && p.id != null) existing.representativePattiId = p.id;
      if (!existing._fallbackName && (p.sellerName || '').trim()) {
        existing._fallbackName = (p.sellerName || '').trim();
      }
    }
    return Array.from(groups.values()).map(row => {
      const { _fallbackName, ...rest } = row;
      const first = pickFirstArrivalSeller(rest.sellerIds, sellerById);
      return {
        ...rest,
        sellerNames: firstArrivalSellerLabel(rest.sellerIds, sellerById, _fallbackName),
        serialNo: first?.sellerSerialNo ?? rest.serialNo,
      };
    });
  }, [filteredSavedPattis, sellers]);

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

  const mainPattiValidationError = useMemo(() => {
    if (!pattiData) return 'Patti is not generated yet';
    if (arrivalSellersForPatti.length === 0) return 'No sellers available for this main patti';
    for (const seller of arrivalSellersForPatti) {
      const err = getSellerValidationError(seller);
      if (err) return err;
    }
    return null;
  }, [pattiData, arrivalSellersForPatti, getSellerValidationError]);

  const canRunMainPattiActions = mainPattiValidationError == null;
  const isMainUpdateMode = useMemo(
    () =>
      arrivalSellersForPatti.length > 0 &&
      arrivalSellersForPatti.every(s => existingPattiIdBySellerId[s.sellerId] != null),
    [arrivalSellersForPatti, existingPattiIdBySellerId]
  );

  const arrivalSalesReportSellerIdsKey = useMemo(
    () => arrivalSellersForPatti.map(s => s.sellerId).join(','),
    [arrivalSellersForPatti]
  );
  const arrivalFreightBaselineKey = useMemo(
    () =>
      `${selectedSeller?.sellerId ?? ''}__${selectedSeller?.vehicleId ?? ''}__${arrivalSalesReportSellerIdsKey}__${pattiData?.createdAt ?? ''}`,
    [selectedSeller?.sellerId, selectedSeller?.vehicleId, arrivalSalesReportSellerIdsKey, pattiData?.createdAt]
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
      const expenseTotal = totalSellerExpenses(
        exp,
        settlementWeighingEnabled,
        isWeighingMergedIntoFreight(seller.sellerId)
      );
      return sum + (amountTot - expenseTotal);
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
    isWeighingMergedIntoFreight,
  ]);

  const amountSummaryDisplay = useMemo(() => {
    const runtimeFreight = arrivalSellersForPatti.reduce((sum, s) => {
      const exp = sellerExpensesById[s.sellerId];
      return sum + (exp?.freight ?? 0);
    }, 0);
    const runtimeInvoicePayable = vehicleNetPayableFromPatti;
    /** Arrival vehicle freight: only from API or arrivals module scan — never from expense-card edits (those drive invoiced/runtime only). */
    const apiArrival = amountSummaryFromApi.arrivalFreightAmount;
    const arrivalDisplay = apiArrival > 0 ? apiArrival : arrivalFreightBaseline;
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
      const vidRaw =
        selectedSeller.vehicleId ??
        arrivalSellersForPatti.find(s => s.vehicleId != null && Number.isFinite(Number(s.vehicleId)))?.vehicleId;
      const vid = vidRaw != null && Number(vidRaw) > 0 ? Number(vidRaw) : null;

      if (vid != null) {
        try {
          const detail = await arrivalsApi.getById(vid);
          if (!cancelled) setArrivalFreightBaseline(Number(detail.freightTotal ?? 0));
        } catch {
          if (!cancelled) setArrivalFreightBaseline(0);
        }
        return;
      }

      let fromArrival = 0;
      const candidateVehicle =
        selectedSeller.vehicleNumber ||
        arrivalSellersForPatti.find(s => (s.vehicleNumber || '').trim().length > 0)?.vehicleNumber ||
        '';
      const vKey = normalizeVehicleKey(candidateVehicle);
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
  }, [arrivalFreightBaselineKey, arrivalSellersForPatti, selectedSeller]);

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

  /** Pull unloading / weighing / cash advance from backend, and align freight with Quick Adjustment weight-share logic. */
  useEffect(() => {
    if (!pattiData || arrivalSellersForPatti.length === 0) return;
    if (Object.keys(existingPattiIdBySellerId).length > 0) return;
    let cancelled = false;
    void (async () => {
      const snapBySellerId: Record<string, Awaited<ReturnType<typeof settlementApi.getSellerExpenseSnapshot>> | null> = {};
      await Promise.all(
        arrivalSellersForPatti.map(async s => {
          try {
            snapBySellerId[s.sellerId] = await settlementApi.getSellerExpenseSnapshot(s.sellerId);
          } catch {
            snapBySellerId[s.sellerId] = null;
          }
        })
      );
      if (cancelled) return;

      const sellerActualWeightById: Record<string, number> = {};
      let totalActualWeight = 0;
      for (const s of arrivalSellersForPatti) {
        const removed = new Set(removedLotsBySellerId[s.sellerId] ?? []);
        const lotOv = lotSalesOverridesBySellerId[s.sellerId] ?? {};
        const sellerWeight = s.lots.reduce((sum, lot, i) => {
          const sid = lotStableId(lot, i);
          if (removed.has(sid)) return sum;
          const row = mergeLotDisplayRow(lot, lotOv[sid], getLotDivisor(lot));
          return sum + (Number(row.weight) || 0);
        }, 0);
        sellerActualWeightById[s.sellerId] = sellerWeight;
        totalActualWeight += sellerWeight;
      }

      const freightTotal = Math.max(0, Number(amountSummaryDisplay.arrivalFreightAmount) || 0);
      const perKgFreight = totalActualWeight > 0 ? freightTotal / totalActualWeight : 0;

      setSellerExpensesById(prev => {
        const next = { ...prev };
        for (const s of arrivalSellersForPatti) {
          const snap = snapBySellerId[s.sellerId];
          const prevRow = prev[s.sellerId] ?? defaultSellerExpenses();
          const computedFreight = perKgFreight > 0 ? roundMoney2(perKgFreight * (sellerActualWeightById[s.sellerId] ?? 0)) : prevRow.freight;
          next[s.sellerId] = {
            ...prevRow,
            freight: computedFreight,
            unloading: snap != null ? Number(snap.unloading ?? prevRow.unloading) : prevRow.unloading,
            weighman: snap != null ? Number(snap.weighing ?? prevRow.weighman) : prevRow.weighman,
            cashAdvance: snap != null ? Number(snap.cashAdvance ?? prevRow.cashAdvance) : prevRow.cashAdvance,
          };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    pattiData?.createdAt,
    arrivalSalesReportSellerIdsKey,
    existingPattiIdBySellerId,
    removedLotsBySellerId,
    lotSalesOverridesBySellerId,
    getLotDivisor,
    amountSummaryDisplay.arrivalFreightAmount,
  ]);

  /** Main patti deduction lines mirror primary seller expenses + weighing toggles. */
  useEffect(() => {
    if (!selectedSeller || !pattiData) return;
    const exp = sellerExpensesById[selectedSeller.sellerId] ?? defaultSellerExpenses();
    const deds = buildDeductionItemsFromSellerExpenses(
      exp,
      coolieMode,
      settlementWeighingEnabled,
      isWeighingMergedIntoFreight(selectedSeller.sellerId)
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
    isWeighingMergedIntoFreight,
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
    if (!canRunMainPattiActions) {
      toast.error(mainPattiValidationError ?? 'Please complete required fields before printing.');
      return;
    }
    const scopeSellers = arrivalSellersForPatti;
    if (scopeSellers.length === 0) {
      toast.error('No sellers available for main patti print.');
      return;
    }

    const detailRows = scopeSellers.flatMap((seller) => {
      const removedSet = new Set(removedLotsBySellerId[seller.sellerId] ?? []);
      const lotOverrides = lotSalesOverridesBySellerId[seller.sellerId];
      return seller.lots.flatMap((lot, lotIndex) => {
        const sid = lotStableId(lot, lotIndex);
        if (removedSet.has(sid)) return [];
        const row = mergeLotDisplayRow(lot, lotOverrides?.[sid], getLotDivisor(lot));
        return [{
          mark: (seller.sellerMark || '-').trim() || '-',
          bags: Number(row.qty) || 0,
          weight: Number(row.weight) || 0,
          rate: Number(row.ratePerBag) || 0,
          amount: Number(row.amount) || 0,
        }];
      });
    });

    const totalBags = detailRows.reduce((s, r) => s + (Number(r.bags) || 0), 0);
    const commodityNames = Array.from(
      new Set(scopeSellers.flatMap(s => s.lots.map(l => String(l.commodityName || '').trim())).filter(Boolean)),
    );
    const commodityName = commodityNames.length === 1
      ? commodityNames[0]
      : (commodityNames.length > 1 ? 'Mixed Commodity' : 'Commodity');

    const deductionTotals = {
      freight: 0,
      unloading: 0,
      weighing: 0,
      advance: 0,
      gunnies: 0,
      others: 0,
    };
    for (const seller of scopeSellers) {
      const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
      const mergeIntoFreight = isWeighingMergedIntoFreight(seller.sellerId);
      deductionTotals.freight += Number(exp.freight) || 0;
      deductionTotals.unloading += Number(exp.unloading) || 0;
      deductionTotals.advance += Number(exp.cashAdvance) || 0;
      deductionTotals.gunnies += Number(exp.gunnies) || 0;
      deductionTotals.others += Number(exp.others) || 0;
      if (settlementWeighingEnabled) {
        deductionTotals.weighing += Number(exp.weighman) || 0;
      } else if (mergeIntoFreight) {
        deductionTotals.freight += Number(exp.weighman) || 0;
      }
    }
    const deductions: PattiPrintData['deductions'] = [
      { key: 'freight', label: 'Freight', amount: roundMoney2(deductionTotals.freight) },
      { key: 'coolie', label: 'Unloading', amount: roundMoney2(deductionTotals.unloading) },
      ...(settlementWeighingEnabled
        ? [{ key: 'weighing', label: 'Weighing', amount: roundMoney2(deductionTotals.weighing) }]
        : []),
      { key: 'advance', label: 'Cash Advance', amount: roundMoney2(deductionTotals.advance) },
      { key: 'gunnies', label: 'Gunnies', amount: roundMoney2(deductionTotals.gunnies) },
      { key: 'others', label: 'Others', amount: roundMoney2(deductionTotals.others) },
    ];

    const primarySeller = scopeSellers[0];
    const primaryForm = sellerFormById[primarySeller.sellerId] ?? defaultSellerForm(primarySeller);
    const sellerNames = scopeSellers
      .map(s => (sellerFormById[s.sellerId]?.name || s.sellerName || '').trim())
      .filter(Boolean);
    const mergedName = sellerNames.length <= 2 ? sellerNames.join(', ') : `${sellerNames[0]} +${sellerNames.length - 1} others`;

    const printPayload: PattiPrintData = {
      ...pattiData,
      sellerName: mergedName || pattiData.sellerName || primarySeller.sellerName,
      sellerMobile: primaryForm.mobile || primarySeller.sellerPhone || '',
      sellerAddress: primarySeller.fromLocation || '',
      vehicleNumber: primarySeller.vehicleNumber || '',
      commodityName,
      totalBags,
      detailRows,
      deductions,
      totalDeductions: roundMoney2(deductions.reduce((s, d) => s + d.amount, 0)),
      netPayable: roundMoney2(vehicleNetPayableFromPatti),
    };
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
    const ok = await directPrint(generateSalesPattiPrintHTML(printPayload), { mode: 'system' });
    if (ok) toast.success('Main patti sent to printer');
    else toast.error('Printer not connected.');
  }, [
    pattiData,
    canRunMainPattiActions,
    mainPattiValidationError,
    arrivalSellersForPatti,
    removedLotsBySellerId,
    lotSalesOverridesBySellerId,
    getLotDivisor,
    sellerExpensesById,
    settlementWeighingEnabled,
    isWeighingMergedIntoFreight,
    sellerFormById,
    vehicleNetPayableFromPatti,
  ]);

  const runPrintSellerSubPatti = useCallback(
    async (seller: SellerSettlement) => {
      if (!pattiData) return;
      const sellerValidation = getSellerValidationError(seller);
      if (sellerValidation) {
        toast.error(sellerValidation);
        return;
      }
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
        getLotDivisor,
        settlementWeighingEnabled,
        isWeighingMergedIntoFreight(seller.sellerId),
        form.mobile || seller.sellerPhone || ''
      );
      const ok = await directPrint(generateSalesPattiPrintHTML(payload), { mode: 'system' });
      if (ok) toast.success('Seller sub-patti sent to printer');
      else toast.error('Printer not connected.');
    },
    [
      pattiData,
      sellerFormById,
      sellerExpensesById,
      removedLotsBySellerId,
      lotSalesOverridesBySellerId,
      getLotDivisor,
      getSellerValidationError,
      settlementWeighingEnabled,
      isWeighingMergedIntoFreight,
    ]
  );

  const runPrintAllSubPatti = useCallback(async () => {
    if (!pattiData) return;
    if (!canRunMainPattiActions) {
      toast.error(mainPattiValidationError ?? 'Please complete required fields before printing.');
      return;
    }
    const payloads: PattiPrintData[] = [];
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
        getLotDivisor,
        settlementWeighingEnabled,
        isWeighingMergedIntoFreight(s.sellerId),
        form.mobile || s.sellerPhone || ''
      );
      payloads.push(payload);
    }
    if (payloads.length === 0) {
      toast.error('No seller sub-patti data found to print.');
      return;
    }
    const ok = await directPrint(generateSalesPattiBatchPrintHTML(payloads), { mode: 'system' });
    if (!ok) {
      toast.error('Print failed or cancelled.');
      return;
    }
    toast.success('All sub-pattis sent to printer');
  }, [
    pattiData,
    arrivalSellersForPatti,
    sellerFormById,
    sellerExpensesById,
    removedLotsBySellerId,
    lotSalesOverridesBySellerId,
    getLotDivisor,
    canRunMainPattiActions,
    mainPattiValidationError,
    settlementWeighingEnabled,
    isWeighingMergedIntoFreight,
  ]);

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
    (id: string, field: VehicleExpenseField, raw: string) => {
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

  const updateVehicleExpenseQty = useCallback((id: string, raw: string) => {
    setVehicleExpenseRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        if (raw.trim() === '') return { ...row, quantity: 0 };
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n)) return row;
        return { ...row, quantity: Math.max(0, n) };
      })
    );
  }, []);

  const isVehicleExpenseFieldEdited = useCallback(
    (row: VehicleExpenseRow, field: VehicleExpenseField): boolean => {
      const original = vehicleExpenseOriginalByRowId[row.id]?.[field];
      if (original == null) return false;
      return Math.abs((row[field] ?? 0) - original) > 0.009;
    },
    [vehicleExpenseOriginalByRowId]
  );

  const revertVehicleExpenseCell = useCallback(
    (id: string, field: VehicleExpenseField) => {
      const original = vehicleExpenseOriginalByRowId[id]?.[field];
      if (original == null) return;
      setVehicleExpenseRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: original } : row)));
    },
    [vehicleExpenseOriginalByRowId]
  );

  const openVehicleExpenseModal = useCallback(async () => {
    if (!selectedSeller || !pattiData || arrivalSellersForPatti.length === 0) {
      toast.error('Open a vehicle settlement first.');
      return;
    }
    setVehicleExpenseModalOpen(true);
    setVehicleExpenseLoading(true);
    try {
      const selectedVehicleId = selectedSeller.vehicleId != null && Number(selectedSeller.vehicleId) > 0
        ? Number(selectedSeller.vehicleId)
        : null;
      const vKey = normalizeVehicleKey(selectedSeller.vehicleNumber);
      let match: { vehicleId: number } | null = null;
      if (selectedVehicleId == null && vKey) {
        const summaries = await arrivalsApi.list(0, 500);
        const found = summaries.find(s => normalizeVehicleKey(String(s.vehicleNumber)) === vKey);
        const foundVehicleId = found != null ? Number(found.vehicleId) : NaN;
        match = Number.isFinite(foundVehicleId) && foundVehicleId > 0 ? { vehicleId: foundVehicleId } : null;
      }

      const [configs, commodities] = fullCommodityConfigs.length > 0 && commodityList.length > 0
        ? [fullCommodityConfigs, commodityList]
        : await Promise.all([commodityApi.getAllFullConfigs(), commodityApi.list()]);
      const nameToId = new Map(
        commodities.map(c => [String(c.commodity_name || '').trim().toLowerCase(), Number(c.commodity_id)])
      );
      const configById = new Map(configs.map(c => [c.commodityId, c]));

      let arrival: ArrivalFullDetail | null = null;
      if (selectedVehicleId != null) {
        try {
          arrival = await arrivalsApi.getById(selectedVehicleId);
        } catch {
          arrival = null;
        }
      } else if (match != null) {
        try {
          arrival = await arrivalsApi.getById(match.vehicleId);
        } catch {
          arrival = null;
        }
      }

      const fallbackFreightTotal = arrivalSellersForPatti.reduce((sum, s) => {
        const exp = sellerExpensesById[s.sellerId];
        return sum + (exp?.freight ?? 0);
      }, 0);
      const freightTotalRaw = arrival ? Number(arrival.freightTotal ?? 0) : amountSummaryDisplay.arrivalFreightAmount;
      const freightTotal = freightTotalRaw > 0 ? freightTotalRaw : fallbackFreightTotal;
      const equalShareFreight = arrivalSellersForPatti.length > 0 ? freightTotal / arrivalSellersForPatti.length : 0;
      const sellerComputedBase = arrivalSellersForPatti.map(s => {
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
        const actualWeight = s.lots.reduce((sum, lot, i) => {
          const sid = lotStableId(lot, i);
          if (removed.has(sid)) return sum;
          const merged = mergeLotDisplayRow(lot, lotOv[sid], getDivisorLocal(lot));
          return sum + (Number(merged.weight) || 0);
        }, 0);
        return {
          sellerId: s.sellerId,
          sellerName: (arrSeller?.sellerName ?? s.sellerName) || 'Seller',
          quantity: qty,
          unloading,
          weighing,
          actualWeight,
        };
      });
      const totalActualWeightOnSettlement = sellerComputedBase.reduce((sum, s) => sum + s.actualWeight, 0);
      const perKgFreight = totalActualWeightOnSettlement > 0 ? freightTotal / totalActualWeightOnSettlement : 0;

      const rows: VehicleExpenseRow[] = sellerComputedBase.map(s => {
        const fallbackSellerFreight = sellerExpensesById[s.sellerId]?.freight ?? 0;
        const freight = roundMoney2(
          perKgFreight > 0
            ? perKgFreight * s.actualWeight
            : (fallbackSellerFreight > 0 ? fallbackSellerFreight : equalShareFreight)
        );

        return {
          id: `ve_${s.sellerId}`,
          sellerId: s.sellerId,
          sellerName: s.sellerName,
          quantity: s.quantity,
          freight,
          unloading: roundMoney2(s.unloading),
          weighing: roundMoney2(s.weighing),
          gunnies: 0,
        };
      });

      try {
        const hydrated = await settlementApi.hydrateQuickExpenseState(
          rows.map(r => ({
            sellerId: r.sellerId,
            freight: r.freight,
            unloading: r.unloading,
            weighing: r.weighing,
            gunnies: r.gunnies,
          }))
        );
        const bySellerId = new Map(hydrated.map(h => [h.sellerId, h]));
        const mergedRows = rows.map(r => {
          const h = bySellerId.get(r.sellerId);
          if (!h) return r;
          return {
            ...r,
            freight: roundMoney2(h.freightCurrent),
            unloading: roundMoney2(h.unloadingCurrent),
            weighing: roundMoney2(h.weighingCurrent),
            gunnies: roundMoney2(h.gunniesCurrent),
          };
        });
        setVehicleExpenseRows(mergedRows);
        setVehicleExpenseOriginalByRowId(
          mergedRows.reduce<Record<string, VehicleExpenseFieldValues>>((acc, row) => {
            const h = bySellerId.get(row.sellerId);
            acc[row.id] = {
              freight: roundMoney2(h?.freightOriginal ?? row.freight),
              unloading: roundMoney2(h?.unloadingOriginal ?? row.unloading),
              weighing: roundMoney2(h?.weighingOriginal ?? row.weighing),
              gunnies: roundMoney2(h?.gunniesOriginal ?? row.gunnies),
            };
            return acc;
          }, {})
        );
      } catch {
        setVehicleExpenseRows(rows);
        setVehicleExpenseOriginalByRowId(
          rows.reduce<Record<string, VehicleExpenseFieldValues>>((acc, row) => {
            acc[row.id] = {
              freight: row.freight,
              unloading: row.unloading,
              weighing: row.weighing,
              gunnies: row.gunnies,
            };
            return acc;
          }, {})
        );
      }
    } catch {
      toast.error('Failed to load quick expenses from arrivals.');
      const fallbackRows = arrivalSellersForPatti.map(s => ({
          id: `ve_${s.sellerId}`,
          sellerId: s.sellerId,
          sellerName: s.sellerName || 'Seller',
          quantity: totalArrivalBagsForSeller(s),
          freight: roundMoney2(sellerExpensesById[s.sellerId]?.freight ?? 0),
          unloading: roundMoney2(sellerExpensesById[s.sellerId]?.unloading ?? 0),
          weighing: roundMoney2(sellerExpensesById[s.sellerId]?.weighman ?? 0),
          gunnies: roundMoney2(sellerExpensesById[s.sellerId]?.gunnies ?? 0),
        }));
      try {
        const hydrated = await settlementApi.hydrateQuickExpenseState(
          fallbackRows.map(r => ({
            sellerId: r.sellerId,
            freight: r.freight,
            unloading: r.unloading,
            weighing: r.weighing,
            gunnies: r.gunnies,
          }))
        );
        const bySellerId = new Map(hydrated.map(h => [h.sellerId, h]));
        const mergedRows = fallbackRows.map(r => {
          const h = bySellerId.get(r.sellerId);
          if (!h) return r;
          return {
            ...r,
            freight: roundMoney2(h.freightCurrent),
            unloading: roundMoney2(h.unloadingCurrent),
            weighing: roundMoney2(h.weighingCurrent),
            gunnies: roundMoney2(h.gunniesCurrent),
          };
        });
        setVehicleExpenseRows(mergedRows);
        setVehicleExpenseOriginalByRowId(
          mergedRows.reduce<Record<string, VehicleExpenseFieldValues>>((acc, row) => {
            const h = bySellerId.get(row.sellerId);
            acc[row.id] = {
              freight: roundMoney2(h?.freightOriginal ?? row.freight),
              unloading: roundMoney2(h?.unloadingOriginal ?? row.unloading),
              weighing: roundMoney2(h?.weighingOriginal ?? row.weighing),
              gunnies: roundMoney2(h?.gunniesOriginal ?? row.gunnies),
            };
            return acc;
          }, {})
        );
      } catch {
        setVehicleExpenseRows(fallbackRows);
        setVehicleExpenseOriginalByRowId(
          fallbackRows.reduce<Record<string, VehicleExpenseFieldValues>>((acc, row) => {
            acc[row.id] = {
              freight: row.freight,
              unloading: row.unloading,
              weighing: row.weighing,
              gunnies: row.gunnies,
            };
            return acc;
          }, {})
        );
      }
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
    fullCommodityConfigs,
    commodityList,
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

  const renderVehicleExpenseInputCell = useCallback(
    (row: VehicleExpenseRow, field: VehicleExpenseField, ariaLabel: string) => {
      const edited = isVehicleExpenseFieldEdited(row, field);
      return (
        <div className="mx-auto flex w-full max-w-[12rem] items-center gap-1">
          <Input
            type="number"
            min={0}
            step={0.01}
            className={cn(
              'h-10 min-w-0 flex-1 rounded-md border-border/70 bg-background px-2 text-center text-sm tabular-nums shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              edited && 'border-amber-500/70'
            )}
            value={row[field] === 0 ? '' : row[field]}
            onChange={e => updateVehicleExpenseCell(row.id, field, e.target.value)}
            aria-label={ariaLabel}
          />
          {edited && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/70 bg-background text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => revertVehicleExpenseCell(row.id, field)}
                title="Restore original value"
                aria-label={`Restore original ${ariaLabel.toLowerCase()}`}
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      );
    },
    [isVehicleExpenseFieldEdited, revertVehicleExpenseCell, updateVehicleExpenseCell]
  );

  const sellerDateLabel = (seller: SellerSettlement): string => {
    const rawDate = seller.createdAt ?? seller.date;
    if (!rawDate) return '-';
    const d = new Date(rawDate);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  const shortAddressLabel = (value?: string | null): string => {
    const v = String(value ?? '').trim();
    if (!v) return '-';
    return v.length > 10 ? `${v.slice(0, 10)}...` : v;
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
            <Button type="button" variant="outline" onClick={() => navigate('/auctions')} className={cn(arrSolidMd, 'mt-4')}>
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
          <table className="w-full min-w-[980px] border border-border/50 text-sm">
            <thead className={cn(SETTLEMENT_LOTS_TABLE_HEADER_GRADIENT, 'shadow-md')}>
              <tr>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Vehicle Number</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Seller</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">From</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">SL No</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Lots</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Bids</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Weighed</th>
                <th className="whitespace-nowrap border-b border-r border-white/25 px-3 py-2 text-center font-semibold text-white">Status</th>
                <th className="whitespace-nowrap border-b border-white/25 px-3 py-2 text-center font-semibold text-white">Date</th>
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
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">
                        <span className="inline-flex items-center rounded-full bg-[#eef0ff] px-2 py-0.5 text-[10px] font-bold text-[#6075FF] dark:bg-[#6075FF]/20">
                          {row.vehicleNumber}
                        </span>
                      </td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.sellerNames || '-'}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block max-w-[10ch] truncate align-bottom">
                              {shortAddressLabel(row.fromLocation)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8} className="max-w-[260px] text-xs">
                            {row.fromLocation || '-'}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.serialNo ?? '-'}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.lots}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.bids}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.weighed}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-amber-600 dark:text-amber-400 font-medium">New Patti</td>
                      <td className="border-t border-border/30 px-3 py-2 text-center text-foreground">{row.dateLabel}</td>
                    </tr>
                  ))
                : savedPattiArrivalRows.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => row.representativePattiId != null && openPattiForEdit(row.representativePattiId, row.sellerIds)}
                      className="border-t border-border/30 hover:bg-muted/20 cursor-pointer"
                    >
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">
                        <span className="inline-flex items-center rounded-full bg-[#eef0ff] px-2 py-0.5 text-[10px] font-bold text-[#6075FF] dark:bg-[#6075FF]/20">
                          {row.vehicleNumber}
                        </span>
                      </td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.sellerNames || '-'}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block max-w-[10ch] truncate align-bottom">
                              {shortAddressLabel(row.fromLocation)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8} className="max-w-[260px] text-xs">
                            {row.fromLocation || '-'}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.serialNo ?? '-'}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.lots}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.bids}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-foreground">{row.weighed}</td>
                      <td className="border-t border-r border-border/30 px-3 py-2 text-center text-emerald-600 dark:text-emerald-400 font-medium">Completed Patti</td>
                      <td className="border-t border-border/30 px-3 py-2 text-center text-foreground">{row.dateLabel}</td>
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
              <p className="text-white/70 text-xs">{pattiData.pattiId || '(Number after save)'}</p>
            </div>
          </div>
        </div>
        ) : (
        <div className="px-8 py-5 flex items-center gap-4">
          <Button type="button" onClick={() => setShowPrint(false)} variant="outline" className={cn(arrSolidMd, 'gap-1.5')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Sales Patti Print
            </h2>
            <p className="text-sm text-muted-foreground">{pattiData.pattiId}</p>
          </div>
        </div>
        )}

        {pattiDetailDto && (
          <div className="px-4 mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Version:</span>
            <Select
              value={selectedPattiVersion === 'latest' ? 'latest' : String(selectedPattiVersion)}
              onValueChange={val => {
                if (val === 'latest') {
                  applyPattiVersionSelection('latest');
                  return;
                }
                const num = Number(val);
                if (Number.isFinite(num)) applyPattiVersionSelection(num);
              }}
            >
              <SelectTrigger className="h-9 min-w-0 max-w-full sm:min-w-[14rem]">
                <SelectValue placeholder="Latest (current)" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="latest">Latest (current)</SelectItem>
                {(pattiDetailDto.versions ?? []).map(v => (
                  <SelectItem key={v.version} value={String(v.version)}>
                    v{v.version}
                    {v.savedAt ? ` — ${new Date(v.savedAt).toLocaleString()}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!pattiDetailDto.versions || pattiDetailDto.versions.length === 0) && (
              <span className="text-muted-foreground">No previous versions yet.</span>
            )}
            {selectedPattiVersion !== 'latest' && (
              <span className="hidden text-[10px] font-semibold text-primary sm:inline">Snapshot (read-only view)</span>
            )}
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
              <div className="flex justify-between"><span className="text-muted-foreground">Patti ID</span><span className="font-bold text-foreground">{pattiData.pattiId || '(Number after save)'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span className="font-bold text-foreground">{pattiData.sellerName}</span></div>
              {pattiData.useAverageWeight && <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-bold text-amber-500">AVG WEIGHT (Quick Close)</span></div>}
            </div>

            <div className="border-b border-dashed border-border pb-2">
              <p className="font-bold text-foreground mb-1">RATE CLUSTERS</p>
              {pattiData.rateClusters.map((c, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-foreground">
                    {c.totalQuantity} bags @ ₹{formatMoney2Display(c.rate)} ({c.totalWeight.toFixed(0)}kg)
                  </span>
                  <span className="font-bold text-foreground">₹{formatMoney2Display(c.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold">
              <span className="text-foreground">Gross Amount</span>
              <span className="text-foreground">₹{formatMoney2Display(pattiData.grossAmount)}</span>
            </div>

            <div className="border-b border-dashed border-border pb-2">
              <p className="font-bold text-foreground mb-1">DEDUCTIONS</p>
              {pattiData.deductions.filter(d => d.amount > 0).map(d => (
                <div key={d.key} className="flex justify-between">
                  <span className="text-muted-foreground">{d.label}{d.autoPulled ? ' (Auto)' : ''}</span>
                  <span className="text-destructive">−₹{formatMoney2Display(d.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-dashed border-border pt-1 mt-1">
                <span className="text-foreground">Total Deductions</span>
                <span className="text-destructive">−₹{formatMoney2Display(pattiData.totalDeductions)}</span>
              </div>
            </div>

            <div className="flex justify-between text-sm border-t border-dashed border-border pt-2">
              <span className="font-bold text-foreground">NET PAYABLE</span>
              <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                ₹{formatMoney2Display(pattiData.netPayable)}
              </span>
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
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
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
              className={cn(arrSolidTall, 'flex-1 sm:flex-none gap-2')}
            >
              <Printer className="w-5 h-5" /> Print Patti
            </Button>
            <Button
              type="button"
              onClick={() => { setShowPrint(false); setPattiData(null); setPattiDetailDto(null); setSelectedPattiVersion('latest'); latestPattiDataSnapshotRef.current = null; setSelectedSeller(null); setSelectedArrivalSellerIds([]); setExistingPattiIdBySellerId({}); setDraftMainPattiNo(''); setDraftPattiNoBySellerId({}); }}
              variant="outline"
              className={arrOutlineTall}
            >
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
              <button onClick={() => { setSelectedSeller(null); setSelectedArrivalSellerIds([]); setPattiData(null); setPattiDetailDto(null); setSelectedPattiVersion('latest'); latestPattiDataSnapshotRef.current = null; setExistingPattiIdBySellerId({}); setDraftMainPattiNo(''); setDraftPattiNoBySellerId({}); }}
                aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Sales Patti
                </h1>
                <p className="text-white/70 text-xs">
                  Sales Patti No: {displayMainSalesPattiNo || '-'}
                </p>
              </div>
            </div>

          </div>
        </div>
        ) : (
        <div className="px-8 py-5">
          <div className="flex items-center gap-4 mb-4">
            <Button
              type="button"
              onClick={() => { setSelectedSeller(null); setSelectedArrivalSellerIds([]); setPattiData(null); setPattiDetailDto(null); setSelectedPattiVersion('latest'); latestPattiDataSnapshotRef.current = null; setExistingPattiIdBySellerId({}); setDraftMainPattiNo(''); setDraftPattiNoBySellerId({}); }}
              variant="outline"
              className={cn(arrSolidMd, 'gap-1.5')}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Sales Patti — {selectedSeller.sellerName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Sales Patti No: {displayMainSalesPattiNo || '-'} · {selectedSeller.vehicleNumber} · {totalBags} bags
              </p>
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
                Vehicle Details
              </h3>
              <div className="grid grid-cols-2 items-stretch gap-2.5 text-center sm:gap-3 xl:grid-cols-6 xl:gap-4">
                <div className="col-span-2 flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-blue-500/20 bg-muted/30 px-2.5 py-3 sm:col-span-1 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4">
                  <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Vehicle No</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl truncate max-w-full">
                    {selectedSeller.vehicleNumber || '-'}
                  </p>
                </div>
                <div className="flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-cyan-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4">
                  <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sellers</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalInt(vehicleFormDetails.sellersCount)}
                  </p>
                </div>
                <div className="flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Arrival Qty</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalInt(vehicleFormDetails.arrivalQty)}
                  </p>
                </div>
                <div className="flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4">
                  <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Arrival Weight</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalKg(vehicleFormDetails.arrivalWeightKg)}
                  </p>
                </div>
                <div className="flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-violet-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4">
                  <Gavel className="h-4 w-4 text-violet-600 dark:text-violet-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">Sales Pad Net Wt</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalKg(salesPadNetWeightBaseline)}
                  </p>
                </div>
                <div className="col-span-2 flex h-full min-h-[6.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[7rem] sm:rounded-2xl sm:px-3 sm:py-4 xl:col-span-1">
                  <Receipt className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400 sm:h-5 sm:w-5" aria-hidden />
                  <p className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">Patti Net Wt</p>
                  <p className="text-lg font-black tabular-nums text-foreground sm:text-xl md:text-2xl">
                    {formatOptionalKg(vehicleFormDetails.pattiNetWeightKg)}
                  </p>
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
            <h3 className="mb-4 text-center text-base font-bold tracking-tight text-foreground sm:text-lg">
              Expenses &amp; Invoice
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch sm:gap-4">
              <div className="flex min-h-[8.5rem] min-w-0 flex-col rounded-xl border border-teal-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[9rem] sm:rounded-2xl sm:px-3 sm:py-4">
                <div className="flex flex-1 items-center gap-3">
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
                              'Quick Expenses uses: seller freight = (seller settlement weight / total settlement weight) x arrival freight.',
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
              <div className="flex min-h-[8.5rem] min-w-0 flex-col rounded-xl border border-amber-500/20 bg-muted/30 px-2.5 py-3 sm:min-h-[9rem] sm:rounded-2xl sm:px-3 sm:py-4">
                <div className="flex flex-1 items-center gap-3">
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
            <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="w-full min-w-0 sm:max-w-md">
                <label htmlFor="settlement-invoice-name-search" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Invoice Name
                </label>
                <Input
                  id="settlement-invoice-name-search"
                  type="search"
                  placeholder="Enter invoice name"
                  value={invoiceNameSearch}
                  onChange={e => setInvoiceNameSearch(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/80"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className={cn(arrSolidMd, 'w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-[12rem]')}
                onClick={() => void openVehicleExpenseModal()}
              >
                <PlusCircle className="h-4 w-4" />
                Add Quick Adjustment (Alt X)
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="glass-card rounded-2xl border border-border/50 p-4 sm:p-5"
          >
            <h3 className="mb-4 text-center text-base font-bold tracking-tight text-foreground sm:text-lg">Sales Report</h3>
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
              {arrivalSellersForPatti.map((seller, sellerIdx) => {
                const form = sellerFormById[seller.sellerId] ?? defaultSellerForm(seller);
                const baseline = registeredBaselineById[seller.sellerId] ?? form;
                const exp = sellerExpensesById[seller.sellerId] ?? defaultSellerExpenses();
                const sellerValidationError = getSellerValidationError(seller);
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
                const expenseTotal = totalSellerExpenses(
                  exp,
                  settlementWeighingEnabled,
                  isWeighingMergedIntoFreight(seller.sellerId)
                );
                const netSeller = amountTot - expenseTotal;
                /** Default collapsed; only explicit `false` expands. */
                const salesCollapsed = salesReportCollapsedBySellerId[seller.sellerId] !== false;

                return (
                  <div
                    key={seller.sellerId}
                    className="min-w-0 w-[calc(100%-0.1rem)] shrink-0 snap-start lg:w-auto lg:shrink"
                  >
                    <div
                      id={`settlement-seller-card-${seller.sellerId}`}
                      className={cn(
                        'rounded-2xl border p-3 sm:p-4',
                        SALES_REPORT_SELLER_CARD_STYLES[sellerIdx % SALES_REPORT_SELLER_CARD_STYLES.length],
                      )}
                    >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/80 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per seller sales</p>
                        <p className="truncate text-sm font-bold text-foreground">
                          {seller.sellerName}
                          {seller.sellerMark ? ` – ${seller.sellerMark}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-border/50 bg-background/70 px-2 py-1 text-[11px] font-semibold text-foreground">
                          Patti No: {sellerSalesPattiNumberBySellerId[seller.sellerId] || '-'}
                        </span>
                        <Button
                          type="button"
                          className={cn(arrSolidSm, 'gap-1')}
                          onClick={() =>
                            setSalesReportCollapsedBySellerId(prev => {
                              const collapsed = prev[seller.sellerId] !== false;
                              return { ...prev, [seller.sellerId]: !collapsed };
                            })
                          }
                        >
                          {salesCollapsed ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5" />
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
                    <div className="mb-4 space-y-3 overflow-visible rounded-xl border border-border/50 bg-card/80 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seller contact</span>
                        <label className="flex cursor-pointer items-center gap-2 font-medium">
                          <Checkbox
                            className="h-4 w-4 rounded-none"
                            checked={form.registrationChosen && !form.registered}
                            onCheckedChange={v => {
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                const nextChecked = v === true;
                                return {
                                  ...prev,
                                  [seller.sellerId]: {
                                    ...cur,
                                    registrationChosen: nextChecked ? true : false,
                                    registered: false,
                                    contactId: nextChecked ? null : cur.contactId,
                                    allowRegisteredEdit: false,
                                  },
                                };
                              });
                            }}
                          />
                          <span className="text-foreground">Unregistered</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 font-medium">
                          <Checkbox
                            className="h-4 w-4 rounded-none"
                            checked={form.registrationChosen && form.registered}
                            onCheckedChange={v => {
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                const nextChecked = v === true;
                                return {
                                  ...prev,
                                  [seller.sellerId]: {
                                    ...cur,
                                    registrationChosen: nextChecked ? true : false,
                                    registered: true,
                                    allowRegisteredEdit: nextChecked,
                                  },
                                };
                              });
                            }}
                          />
                          <span className="text-foreground">Registered</span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(arrSolidSm, 'min-w-0')}
                          onClick={() => {
                            setSellerLookupOpenForId(seller.sellerId);
                            void runSellerContactSearch(seller.sellerId, '');
                          }}
                        >
                          Unregistered / Registered Seller Mark Search
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(arrSolidSm, 'min-w-0')}
                          disabled={!!sellerRegSaving[seller.sellerId] || !form.registrationChosen || !form.registered}
                          onClick={() => {
                            void (async () => {
                              if (!can('Settlement', 'Edit')) {
                                toast.error('You do not have permission to update seller details.');
                                return;
                              }
                              if (!form.contactId) {
                                toast.error('Please search and select a registered seller first.');
                                return;
                              }
                              setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: true }));
                              try {
                                const baselineContactId = baseline.contactId ? String(baseline.contactId) : null;
                                const nextContactId = String(form.contactId);
                                let reg = null as Awaited<ReturnType<typeof settlementApi.linkSellerContact>> | null;
                                if (nextContactId && nextContactId !== baselineContactId) {
                                  reg = await settlementApi.linkSellerContact(seller.sellerId, nextContactId);
                                }
                                await contactApi.update(nextContactId, {
                                  name: form.name.trim(),
                                  phone: form.mobile.trim(),
                                  mark: form.mark.trim(),
                                });
                                const nextForm: SellerRegFormState = {
                                  ...form,
                                  registrationChosen: true,
                                  registered: true,
                                  contactId: reg?.contactId ?? nextContactId,
                                  name: reg?.sellerName ?? form.name.trim(),
                                  mark: reg?.sellerMark ?? form.mark.trim(),
                                  mobile: reg?.sellerPhone ?? form.mobile.trim(),
                                  contactSearchQuery: '',
                                  allowRegisteredEdit: false,
                                };
                                setSellerFormById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
                                setRegisteredBaselineById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
                                setSellers(prev =>
                                  prev.map(x =>
                                    x.sellerId === seller.sellerId
                                      ? {
                                          ...x,
                                          sellerName: nextForm.name,
                                          sellerMark: nextForm.mark,
                                          contactId: nextForm.contactId,
                                          sellerPhone: nextForm.mobile,
                                        }
                                      : x
                                  )
                                );
                                toast.success('Seller updated successfully');
                              } catch {
                                toast.error('Failed to update seller');
                              } finally {
                                setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: false }));
                              }
                            })();
                          }}
                        >
                          Update Seller
                        </Button>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-3">
                        {form.registrationChosen && !form.registered && (
                          <p className="col-span-full text-[10px] text-muted-foreground sm:col-span-3">
                            <span className="font-semibold text-destructive">*</span> Mark and mobile are required to register this seller; name is optional.
                          </p>
                        )}
                        <div className="min-w-0">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Mark
                            {form.registrationChosen && !form.registered ? (
                              <>
                                {' '}
                                <span className="text-destructive">*</span>
                                <span className="font-normal normal-case text-muted-foreground/70"> (unique)</span>
                              </>
                            ) : null}
                          </label>
                          <Input
                            value={form.mark}
                            onChange={e =>
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                return { ...prev, [seller.sellerId]: { ...cur, mark: e.target.value } };
                              })
                            }
                            className={cn(
                              'h-9 w-full min-w-0 rounded-lg text-sm',
                              form.registered && !form.allowRegisteredEdit && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                            )}
                            disabled={!form.registrationChosen || (form.registered && !form.allowRegisteredEdit)}
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Seller name
                            {form.registrationChosen && !form.registered ? (
                              <span className="font-normal normal-case text-muted-foreground/70"> (optional)</span>
                            ) : null}
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
                              'h-9 min-w-0 w-full rounded-lg text-sm',
                              form.registered && !form.allowRegisteredEdit && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                            )}
                            disabled={!form.registrationChosen || (form.registered && !form.allowRegisteredEdit)}
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Mobile
                            {form.registrationChosen && !form.registered ? (
                              <>
                                {' '}
                                <span className="text-destructive">*</span>
                                <span className="font-normal normal-case text-emerald-600 dark:text-emerald-400">
                                  {' '}
                                  (10 digits, unique)
                                </span>
                              </>
                            ) : null}
                          </label>
                          <Input
                            value={form.mobile}
                            onChange={e =>
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                return {
                                  ...prev,
                                  [seller.sellerId]: {
                                    ...cur,
                                    mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                                  },
                                };
                              })
                            }
                            className={cn(
                              'h-9 w-full min-w-0 rounded-lg text-sm',
                              form.registered && !form.allowRegisteredEdit && 'cursor-not-allowed border-dashed bg-muted/45 text-muted-foreground'
                            )}
                            inputMode="tel"
                            disabled={!form.registrationChosen || (form.registered && !form.allowRegisteredEdit)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                          <Checkbox
                            className="h-4 w-4 rounded-none"
                            checked={form.addAndChangeSeller}
                            onCheckedChange={v =>
                              setSellerFormById(prev => {
                                const cur = prev[seller.sellerId] ?? defaultSellerForm(seller);
                                return { ...prev, [seller.sellerId]: { ...cur, addAndChangeSeller: v === true } };
                              })
                            }
                          />
                          <span>Add & change seller</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(arrSolidMd, 'min-w-[8rem]')}
                            disabled={
                              !!sellerRegSaving[seller.sellerId] ||
                              !form.registrationChosen ||
                              !form.mobile.trim() ||
                              !form.mark.trim() ||
                              form.registered
                            }
                            onClick={() => {
                              void (async () => {
                                if (!can('Settlement', 'Edit')) {
                                  toast.error('You do not have permission to add seller details.');
                                  return;
                                }
                                setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: true }));
                                try {
                                  const normalizedMark = form.mark.trim().toUpperCase();
                                  const normalizedMobile = form.mobile.trim();
                                  const normalizedName = form.name.trim() || normalizedMark;

                                  if (!normalizedMark) {
                                    toast.error('Mark is required');
                                    return;
                                  }
                                  if (!normalizedMobile) {
                                    toast.error('Mobile is required');
                                    return;
                                  }
                                  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
                                    toast.error('Enter a valid 10-digit mobile number');
                                    return;
                                  }

                                  const contactsRegistry = await contactApi.list({ scope: 'registry' });
                                  const markExists = contactsRegistry.some(
                                    c => (c.mark ?? '').trim().toLowerCase() === normalizedMark.toLowerCase()
                                  );
                                  if (markExists) {
                                    toast.error('This mark is already in use by another contact');
                                    return;
                                  }
                                  const mobileExists = contactsRegistry.some(
                                    c => (c.phone ?? '').trim() === normalizedMobile
                                  );
                                  if (mobileExists) {
                                    toast.error('This phone number is already registered');
                                    return;
                                  }

                                  const created = await contactApi.create({
                                    name: normalizedName,
                                    phone: normalizedMobile,
                                    mark: normalizedMark,
                                    trader_id: '',
                                  });
                                  const reg = await settlementApi.linkSellerContact(seller.sellerId, created.contact_id);
                                  const nextForm: SellerRegFormState = {
                                    ...form,
                                    registrationChosen: true,
                                    registered: true,
                                    contactId: reg.contactId,
                                    name: reg.sellerName,
                                    mark: reg.sellerMark,
                                    mobile: reg.sellerPhone,
                                    contactSearchQuery: '',
                                    addAndChangeSeller: false,
                                    allowRegisteredEdit: false,
                                  };
                                  setSellerFormById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
                                  setRegisteredBaselineById(prev => ({ ...prev, [seller.sellerId]: nextForm }));
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
                                  toast.success(
                                    form.addAndChangeSeller
                                      ? 'Seller added and changed for this sales bill'
                                      : 'Seller added successfully'
                                  );
                                } catch (e) {
                                  if (e instanceof ContactApiError && e.errorKey === 'markexists') {
                                    toast.error(e.message || 'This mark is already in use by another contact');
                                    return;
                                  }
                                  if (e instanceof ContactApiError && e.errorKey === 'phoneexistsinactive') {
                                    toast.error('Phone exists on inactive contact. Restore it from Contacts module first.');
                                    return;
                                  }
                                  toast.error(e instanceof Error ? e.message : 'Failed to add seller');
                                } finally {
                                  setSellerRegSaving(prev => ({ ...prev, [seller.sellerId]: false }));
                                }
                              })();
                            }}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(arrOutlineMd, 'min-w-[7rem]')}
                            onClick={() => {
                              setSellerFormById(prev => ({
                                ...prev,
                                [seller.sellerId]: {
                                  ...(registeredBaselineById[seller.sellerId] ?? defaultSellerForm(seller)),
                                  addAndChangeSeller: false,
                                  allowRegisteredEdit: false,
                                  contactSearchQuery: '',
                                },
                              }));
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
                      <div className="min-h-0 min-w-0 flex-1 overflow-x-auto rounded-xl border border-border/50 bg-background/40 shadow-sm lg:max-w-[calc(100%-18.25rem)]">
                        <table className="w-full min-w-[700px] border-separate border-spacing-0 text-[11px] leading-tight sm:text-sm">
                          <thead className={cn(SETTLEMENT_LOTS_TABLE_HEADER_GRADIENT, 'shadow-md')}>
                            <tr>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                #
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Item (lot)
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Qty
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Wt (kg)
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Avg (kg)
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Rate (₹/bag)
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
                                Amount
                              </th>
                              <th className="border-b border-white/25 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white lg:px-3">
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

                      <div className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/20 lg:w-[19.25rem]">
                        <div className="relative shrink-0 overflow-hidden px-3 py-2.5">
                          <div className={cn('absolute inset-0', DESKTOP_SIDEBAR_LIKE_GRADIENT_BG)} />
                          <div className={DESKTOP_SIDEBAR_LIKE_SHINE} />
                          <p className="relative z-10 text-center text-sm font-bold text-white drop-shadow-sm">Expenses</p>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5">
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
                            className="h-5 w-9 shrink-0"
                            checked={settlementWeighingEnabled}
                            onCheckedChange={v => setSettlementWeighingEnabled(v === true)}
                            aria-label="Use weighman in totals"
                          />
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground">Add to freight</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
                                  aria-label="Weighing merge toggle help"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                ON: move weighing amount into Freight line and hide separate weighing deduction. OFF: keep weighing as
                                a separate line.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            id={`sw-wm-${seller.sellerId}`}
                            className="h-5 w-9 shrink-0"
                            checked={isWeighingMergedIntoFreight(seller.sellerId)}
                            onCheckedChange={v =>
                              setSettlementWeighingMergeIntoFreightBySellerId(prev => ({
                                ...prev,
                                [seller.sellerId]: v === true,
                              }))
                            }
                            disabled={settlementWeighingEnabled}
                            aria-label="Add weighing amount to freight"
                          />
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                Freight
                                <InlineCalcTip
                                  label={`Freight formula ${seller.sellerId}`}
                                  lines={[
                                    'Quick Expenses default: (seller settlement weight / total settlement weight) x arrival freight.',
                                    `Current value: ${formatMoney2Display(exp.freight)}`,
                                  ]}
                                />
                              </span>
                              {(() => {
                                const mergeIntoFreightMode =
                                  !settlementWeighingEnabled && isWeighingMergedIntoFreight(seller.sellerId);
                                const displayedFreight = mergeIntoFreightMode ? exp.freight + exp.weighman : exp.freight;
                                return (
                              <Input
                                id={`settlement-seller-expense-${seller.sellerId}-freight`}
                                type="number"
                                min={0}
                                step={0.01}
                                inputMode="decimal"
                                className={settlementExpenseInputClass}
                                value={displayedFreight === 0 ? '' : displayedFreight}
                                onChange={e => {
                                  const entered = clampMoney(parseFloat(e.target.value) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    if (mergeIntoFreightMode) {
                                      const baseFreight = clampMoney(entered - e0.weighman);
                                      return { ...prev, [seller.sellerId]: { ...e0, freight: baseFreight } };
                                    }
                                    return { ...prev, [seller.sellerId]: { ...e0, freight: entered } };
                                  });
                                }}
                                aria-label="Freight amount"
                              />
                                );
                              })()}
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
                                type="text"
                                inputMode="decimal"
                                className={settlementExpenseInputClass}
                                value={
                                  unloadingDraftBySellerId[seller.sellerId] ??
                                  (exp.unloading === 0 ? '' : exp.unloading.toFixed(2))
                                }
                                onChange={e => {
                                  const raw = e.target.value;
                                  if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
                                  setUnloadingDraftBySellerId(prev => ({ ...prev, [seller.sellerId]: raw }));
                                }}
                                onBlur={() => {
                                  const raw = unloadingDraftBySellerId[seller.sellerId] ?? '';
                                  const v = clampMoney(parseFloat(raw) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, unloading: v } };
                                  });
                                  setUnloadingDraftBySellerId(prev => {
                                    const next = { ...prev };
                                    delete next[seller.sellerId];
                                    return next;
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
                                      ? 'Use weighman ON: shown as separate weighing deduction.'
                                      : isWeighingMergedIntoFreight(seller.sellerId)
                                        ? 'Use weighman OFF + Add to freight ON: weighing merged into freight.'
                                        : 'Use weighman OFF: weighing excluded until Add to freight is enabled.',
                                    `Current value: ${formatMoney2Display(exp.weighman)}`,
                                  ]}
                                />
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                disabled={!settlementWeighingEnabled}
                                className={cn(
                                  settlementExpenseInputClass,
                                  isWeighingMergedIntoFreight(seller.sellerId) &&
                                    settlementWeighingEnabled &&
                                    'opacity-80'
                                )}
                                value={
                                  !settlementWeighingEnabled
                                    ? ''
                                    : weighmanDraftBySellerId[seller.sellerId] ??
                                      (exp.weighman === 0 ? '' : exp.weighman.toFixed(2))
                                }
                                onChange={e => {
                                  const raw = e.target.value;
                                  if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
                                  setWeighmanDraftBySellerId(prev => ({ ...prev, [seller.sellerId]: raw }));
                                }}
                                onBlur={() => {
                                  const raw = weighmanDraftBySellerId[seller.sellerId] ?? '';
                                  const v = clampMoney(parseFloat(raw) || 0);
                                  setSellerExpensesById(prev => {
                                    const e0 = prev[seller.sellerId] ?? defaultSellerExpenses();
                                    return { ...prev, [seller.sellerId]: { ...e0, weighman: v } };
                                  });
                                  setWeighmanDraftBySellerId(prev => {
                                    const next = { ...prev };
                                    delete next[seller.sellerId];
                                    return next;
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
                        <div className="shrink-0 space-y-1 border-t border-border/50 p-3 pt-2 text-xs">
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
                                  'Net payable = Auction amount - Total expenses.',
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
                        variant="outline"
                        className={cn(arrOutlineMd, 'gap-1.5')}
                        onClick={() => void runPrintSellerSubPatti(seller)}
                        disabled={!!sellerValidationError}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Sub Patti
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(arrOutlineMd, 'gap-1.5')}
                        onClick={() => {
                          setAddVoucherSellerId(seller.sellerId);
                        }}
                      >
                        Add Voucher
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(arrSolidMd, 'gap-1.5')}
                        onClick={() => void savePattiForSeller(seller)}
                        disabled={!!sellerValidationError || pattiSaveBusy}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {existingPattiIdBySellerId[seller.sellerId] != null ? 'Update Patti' : 'Save Patti'}
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
                type="button"
                variant="outline"
                onClick={() => void savePatti()}
                disabled={!canRunMainPattiActions || pattiSaveBusy}
                className={cn(arrSolidTall, 'gap-2 sm:min-w-[11rem]')}
                title={mainPattiValidationError ?? undefined}
              >
                <Save className="h-5 w-5" />
                {isMainUpdateMode ? 'Update Main Patti (Alt S)' : 'Save Main Patti (Alt S)'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(arrOutlineTall, 'gap-2 sm:min-w-[10rem]')}
                disabled={!canRunMainPattiActions}
                onClick={() => void runPrintMainPatti()}
                title={mainPattiValidationError ?? undefined}
              >
                <Printer className="h-4 w-4" />
                Print Main Patti
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(arrOutlineTall, 'gap-2 sm:min-w-[10rem]')}
                disabled={!canRunMainPattiActions}
                onClick={() => void runPrintAllSubPatti()}
                title={mainPattiValidationError ?? undefined}
              >
                <Printer className="h-4 w-4" />
                Print All Sub Patti
              </Button>
              {pattiDetailDto && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Version</span>
                  <Select
                    value={selectedPattiVersion === 'latest' ? 'latest' : String(selectedPattiVersion)}
                    onValueChange={val => {
                      if (val === 'latest') {
                        applyPattiVersionSelection('latest');
                        return;
                      }
                      const num = Number(val);
                      if (Number.isFinite(num)) applyPattiVersionSelection(num);
                    }}
                  >
                    <SelectTrigger className={cn(arrOutlineTall, 'min-w-[12rem]')}>
                      <SelectValue placeholder="Latest (current)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="latest">Latest (current)</SelectItem>
                      {(pattiDetailDto.versions ?? []).map(v => (
                        <SelectItem key={v.version} value={String(v.version)}>
                          v{v.version}
                          {v.savedAt ? ` — ${new Date(v.savedAt).toLocaleString()}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </motion.div>

          <Dialog
            open={sellerLookupOpenForId != null}
            onOpenChange={open => {
              if (!open) setSellerLookupOpenForId(null);
            }}
          >
            <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-0 sm:p-0">
              <div className="border-b border-border/50 bg-muted/30 px-5 py-4 sm:px-6">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle className="text-base font-bold tracking-tight">Unregistered / Registered Seller Mark Search</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Search contacts to verify seller status. If Registered is checked, you can also pick a registered contact for update.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="space-y-3 px-4 py-4 sm:px-5">
                {(() => {
                  const sid = sellerLookupOpenForId;
                  const query = sid ? (sellerFormById[sid]?.contactSearchQuery ?? '').trim().toLowerCase() : '';
                  const canPickRegistered = !!sid && !!sellerFormById[sid]?.registrationChosen && !!sellerFormById[sid]?.registered;
                  const registeredRows = sid ? (sellerContactSearchById[sid] ?? []) : [];
                  const tempRows = sellers.filter(s => {
                    const noLinkedContact = s.contactId == null || String(s.contactId).trim() === '';
                    if (!noLinkedContact) return false;
                    if (!query) return true;
                    const hay = `${s.sellerName ?? ''} ${s.sellerMark ?? ''} ${s.sellerPhone ?? ''}`.toLowerCase();
                    return hay.includes(query);
                  });
                  return (
                    <>
                <div className="relative">
                  <Input
                    value={
                      sellerLookupOpenForId
                        ? (sellerFormById[sellerLookupOpenForId]?.contactSearchQuery ?? '')
                        : ''
                    }
                    onChange={e => {
                      if (!sellerLookupOpenForId) return;
                      const q = e.target.value;
                      setSellerFormById(prev => {
                        const sid = sellerLookupOpenForId;
                        if (!sid) return prev;
                        const cur = prev[sid] ?? {
                          registrationChosen: false,
                          registered: true,
                          contactId: null,
                          mark: '',
                          name: '',
                          mobile: '',
                          contactSearchQuery: '',
                          addAndChangeSeller: false,
                          allowRegisteredEdit: false,
                        };
                        return { ...prev, [sid]: { ...cur, contactSearchQuery: q } };
                      });
                      scheduleMarkContactSearch(sellerLookupOpenForId, q);
                    }}
                    placeholder="Search by mark, name, or mobile..."
                    className="h-9 pr-8 text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {sellerLookupOpenForId && sellerContactSearchLoading[sellerLookupOpenForId] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5 opacity-70" />
                    )}
                  </span>
                </div>
                <div className="max-h-[18rem] overflow-y-auto rounded-xl border border-border/50 bg-card/70">
                  {registeredRows.length === 0 && tempRows.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">No sellers found.</p>
                  ) : (
                    <ul>
                      {registeredRows.slice(0, 30).map(c => (
                        <li key={c.contact_id} className="border-b border-border/30 last:border-b-0">
                          <button
                            type="button"
                            disabled={!canPickRegistered}
                            className={cn(
                              'flex w-full items-center justify-between gap-3 px-3 py-2 text-left',
                              canPickRegistered ? 'hover:bg-muted/40' : 'cursor-default'
                            )}
                            onClick={() => {
                              if (!sid || !canPickRegistered) return;
                              setSellerFormById(prev => {
                                const cur = prev[sid] ?? {
                                  registrationChosen: false,
                                  registered: true,
                                  contactId: null,
                                  mark: '',
                                  name: '',
                                  mobile: '',
                                  contactSearchQuery: '',
                                  addAndChangeSeller: false,
                                  allowRegisteredEdit: false,
                                };
                                return {
                                  ...prev,
                                  [sid]: {
                                    ...cur,
                                    registrationChosen: true,
                                    registered: true,
                                    contactId: String(c.contact_id),
                                    mark: c.mark ?? '',
                                    name: c.name ?? '',
                                    mobile: c.phone ?? '',
                                    allowRegisteredEdit: true,
                                    contactSearchQuery: '',
                                  },
                                };
                              });
                              setSellerLookupOpenForId(null);
                              toast.success('Registered seller selected. You can update now.');
                            }}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{c.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {c.phone}
                                {c.mark ? ` · ${c.mark}` : ''}
                              </span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {canPickRegistered ? 'Registered · Select' : 'Registered'}
                            </span>
                          </button>
                        </li>
                      ))}
                      {tempRows.slice(0, 30).map(s => (
                        <li key={`temp-${s.sellerId}`} className="border-b border-border/30 last:border-b-0">
                          <div className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">{s.sellerName || '-'}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {s.sellerPhone || '-'}
                                {s.sellerMark ? ` · ${s.sellerMark}` : ''}
                              </span>
                            </span>
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Temporary</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                    </>
                  );
                })()}
              </div>
              <DialogFooter className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
                <Button type="button" variant="outline" className={arrOutlineMd} onClick={() => setSellerLookupOpenForId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={vehicleExpenseModalOpen}
            onOpenChange={setVehicleExpenseModalOpen}
          >
            <DialogContent className="max-h-[90dvh] max-w-5xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-0 sm:p-0">
              <div className="border-b border-border/50 bg-muted/30 px-5 py-4 sm:px-6">
                <DialogHeader className="space-y-1.5 text-center sm:text-center">
                  <DialogTitle className="text-lg font-bold tracking-tight sm:text-xl">Add Quick Adjustment</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                    Sellers and quantities come from Arrivals. Freight is allocated by settlement actual-weight share. Unloading / weighing use commodity
                    slab rules at lot level (editable). Press Alt X to open.
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
                    <thead className={cn(SETTLEMENT_LOTS_TABLE_HEADER_GRADIENT, 'shadow-md')}>
                      <tr>
                        <th className="min-w-[11rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                          Seller
                        </th>
                        <th className="min-w-[5.5rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                          Qty (bags)
                        </th>
                        <th className="min-w-[7.5rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                          <span className="inline-flex items-center gap-1.5">
                            Freight
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-white/90 hover:bg-white/15"
                                  aria-label="Quick adjustment freight formula"
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={8} className="z-[99999] max-w-[320px] text-xs leading-relaxed">
                                <div className="space-y-0.5 text-left normal-case tracking-normal">
                                  <p>Freight = (seller settlement weight / total settlement weight) x arrival freight amount.</p>
                                  <p>If total settlement weight is 0, fallback to saved seller freight; otherwise equal share.</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </th>
                        <th className="min-w-[7.5rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                          Unloading
                        </th>
                        <th className="min-w-[7.5rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
                          Weighing
                        </th>
                        <th className="min-w-[7.5rem] border-b border-white/25 px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
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
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              className="mx-auto h-9 w-20 rounded-md border-border/70 bg-background px-2 text-center text-xs font-semibold tabular-nums text-foreground shadow-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-sm"
                              value={row.quantity === 0 ? '' : row.quantity}
                              onChange={e => updateVehicleExpenseQty(row.id, e.target.value)}
                              aria-label="Quantity (bags)"
                            />
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            {renderVehicleExpenseInputCell(row, 'freight', 'Freight amount')}
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            {renderVehicleExpenseInputCell(row, 'unloading', 'Unloading charges')}
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            {renderVehicleExpenseInputCell(row, 'weighing', 'Weighing charges')}
                          </td>
                          <td className="px-2 py-2.5 text-center align-middle">
                            {renderVehicleExpenseInputCell(row, 'gunnies', 'Gunnies')}
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
                  <Button
                    type="button"
                    variant="outline"
                    className={arrOutlineMd}
                    onClick={() => setVehicleExpenseModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(arrSolidMd, 'gap-1.5')}
                    onClick={async () => {
                      try {
                        await settlementApi.saveQuickExpenseState(
                          vehicleExpenseRows.map(r => ({
                            sellerId: r.sellerId,
                            freight: r.freight,
                            unloading: r.unloading,
                            weighing: r.weighing,
                            gunnies: r.gunnies,
                          }))
                        );
                      } catch {
                        toast.error('Failed to save quick expense edits.');
                        return;
                      }
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
                    <PlusCircle className="h-4 w-4" />
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
                    Add or edit multiple voucher rows. Total is synced to Others charges.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="space-y-3 px-4 py-3 sm:px-5">
                {addVoucherLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading vouchers...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addVoucherRows.map((row, idx) => (
                      <div key={row.localId} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <Input
                          value={row.voucherName}
                          onChange={e =>
                            setAddVoucherRows(prev =>
                              prev.map(r => (r.localId === row.localId ? { ...r, voucherName: e.target.value } : r))
                            )
                          }
                          placeholder="Voucher name"
                          className="h-9 rounded-lg text-sm"
                          autoComplete="off"
                        />
                        <Input
                          value={row.description}
                          onChange={e =>
                            setAddVoucherRows(prev =>
                              prev.map(r => (r.localId === row.localId ? { ...r, description: e.target.value } : r))
                            )
                          }
                          placeholder="Description"
                          className="h-9 rounded-lg text-sm"
                          autoComplete="off"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={row.expenseAmount}
                            onChange={e => {
                              const raw = e.target.value;
                              if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
                              setAddVoucherRows(prev =>
                                prev.map(r => (r.localId === row.localId ? { ...r, expenseAmount: raw } : r))
                              );
                            }}
                            placeholder="0.00"
                            className="h-9 rounded-lg text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className={arrOutlineSm}
                            disabled={addVoucherRows.length === 1}
                            onClick={() => {
                              setAddVoucherRows(prev => (prev.length > 1 ? prev.filter(r => r.localId !== row.localId) : prev));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className={arrOutlineSm}
                        onClick={() => setAddVoucherRows(prev => [...prev, buildEmptyVoucherRow()])}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Row
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className={arrOutlineMd}
                    onClick={() => setAddVoucherSellerId(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(arrSolidMd, 'gap-1.5')}
                    disabled={addVoucherSaving || addVoucherLoading}
                    onClick={async () => {
                      if (!addVoucherSellerId) {
                        toast.error('Seller is required.');
                        return;
                      }
                      const rows = addVoucherRows
                        .map(r => ({
                          id: r.id,
                          voucherName: r.voucherName.trim(),
                          description: r.description.trim(),
                          expenseAmount: clampMoney(parseFloat(r.expenseAmount || '0') || 0),
                        }))
                        .filter(r => r.voucherName !== '' || r.description !== '' || r.expenseAmount > 0);
                      const invalid = rows.some(r => r.voucherName === '' || r.expenseAmount <= 0);
                      if (invalid) {
                        toast.message('Each voucher row needs name and amount > 0.');
                        return;
                      }
                      setAddVoucherSaving(true);
                      try {
                        const response = await settlementApi.saveTemporaryVouchers(addVoucherSellerId, rows);
                        setSellerExpensesById(prev => {
                          const e0 = prev[addVoucherSellerId] ?? defaultSellerExpenses();
                          return {
                            ...prev,
                            [addVoucherSellerId]: {
                              ...e0,
                              others: clampMoney(response.totalExpenseAmount ?? 0),
                            },
                          };
                        });
                        setAddVoucherRows(
                          response.rows.length > 0
                            ? response.rows.map(r => ({
                                id: r.id,
                                localId: `v_${r.id ?? Math.random().toString(36).slice(2, 8)}`,
                                voucherName: r.voucherName ?? '',
                                description: r.description ?? '',
                                expenseAmount: (Number(r.expenseAmount ?? 0) || 0).toFixed(2),
                              }))
                            : [buildEmptyVoucherRow()]
                        );
                        toast.success('Vouchers saved and summed in Others.');
                        setAddVoucherSellerId(null);
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : 'Failed to save voucher.';
                        toast.error(msg);
                      } finally {
                        setAddVoucherSaving(false);
                      }
                    }}
                  >
                    {addVoucherSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Add'
                    )}
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
                <AlertDialogCancel className={arrOutlineMd}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl h-9 px-3 text-sm font-semibold bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
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
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSettlementMainTab('arrival-summary')}
              className={settlementToggleTabBtnOnHero(settlementMainTab === 'arrival-summary')}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Arrival Summary</span>
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
              className={cn(
                settlementToggleTabBtnOnHero(settlementMainTab === 'create-settlements'),
                !hasArrivalSelection && 'opacity-50',
              )}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Create Settlements</span>
            </button>
          </div>
          {!hasArrivalSelection && (
            <p className="mb-3 text-center text-[11px] text-white/70">
              Tap any arrival bill row first to enable Create settlements.
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
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto" role="tablist" aria-label="Settlement views">
            <button
              type="button"
              role="tab"
              aria-selected={settlementMainTab === 'arrival-summary'}
              onClick={() => setSettlementMainTab('arrival-summary')}
              className={settlementToggleTabBtn(settlementMainTab === 'arrival-summary')}
            >
              <FileText className="w-4 h-4 shrink-0" /> Arrival Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={settlementMainTab === 'create-settlements'}
              disabled={!hasArrivalSelection}
              aria-disabled={!hasArrivalSelection}
              onClick={() => {
                if (!hasArrivalSelection) {
                  toast.message('Select an arrival bill first.');
                  return;
                }
                setSettlementMainTab('create-settlements');
              }}
              className={cn(
                settlementToggleTabBtn(settlementMainTab === 'create-settlements'),
                !hasArrivalSelection && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Edit3 className="w-4 h-4 shrink-0" /> Create Settlements
            </button>
          </div>
          <div className="relative w-full min-w-0 lg:flex-1 lg:max-w-md lg:order-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              aria-label="Search"
              placeholder="Search by vehicle, seller name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus-visible:ring-1 focus-visible:ring-[#6075FF]"
            />
          </div>
        </div>
      </div>
      )}

      <div className="mt-4 space-y-4 px-4 lg:px-8">
        {settlementMainTab === 'arrival-summary' ? (
          <>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Arrival summary">
              <button
                type="button"
                role="tab"
                aria-selected={arrivalSummaryTab === 'new-patti'}
                onClick={() => setArrivalSummaryTab('new-patti')}
                className={settlementToggleTabBtn(arrivalSummaryTab === 'new-patti')}
              >
                New Patti
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={arrivalSummaryTab === 'saved-patti'}
                onClick={() => setArrivalSummaryTab('saved-patti')}
                className={settlementToggleTabBtn(arrivalSummaryTab === 'saved-patti')}
              >
                Saved Patti
              </button>
            </div>
            {renderArrivalSummaryTable(arrivalSummaryTab)}
          </>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Edit3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Create settlements form section is ready.</p>
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