// ============================================================
// Mercotrace — Financial Accounting Types (SRS Part 6)
// ============================================================

// ── Accounting Classifications (Immutable) ─────────────────
export type AccountingClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type LedgerClassification =
  | 'RECEIVABLE' | 'PAYABLE' | 'BANK' | 'EXPENSE' | 'INCOME'
  | 'LOAN' | 'CASH' | 'EQUITY' | 'INVENTORY' | 'TAX' | 'CONTROL';

export type VoucherType =
  | 'SALES_BILL' | 'SALES_SETTLEMENT' | 'RECEIPT' | 'PAYMENT'
  | 'JOURNAL' | 'CONTRA' | 'ADVANCE' | 'WRITE_OFF';

export type VoucherLifecycle = 'DRAFT' | 'POSTED' | 'PARTIALLY_SETTLED' | 'CLOSED' | 'REVERSED';

export type ARAPStatus = 'OPEN' | 'PARTIAL' | 'CLOSED' | 'OVERPAID';

export type PaymentModeType = 'CASH' | 'UPI' | 'BANK';

export type AccountingMode = 'COMMISSION' | 'TRADING';

// ── Chart of Accounts ──────────────────────────────────────

export interface COALedger {
  ledger_id: string;
  trader_id: string;
  ledger_name: string;
  accounting_class: AccountingClass;
  classification: LedgerClassification;
  parent_control_id?: string;         // Link to AR/AP control
  contact_id?: string;                // Link to contact if subledger
  is_system: boolean;                 // Cannot be deleted/reclassified
  is_locked: boolean;                 // Locked after first posting
  opening_balance: number;
  current_balance: number;
  created_at: string;
}

// ── Voucher Header ─────────────────────────────────────────

export interface VoucherHeader {
  voucher_id: string;
  trader_id: string;
  voucher_type: VoucherType;
  voucher_number: string;
  voucher_date: string;
  narration: string;
  status: VoucherLifecycle;
  total_debit: number;
  total_credit: number;
  is_migrated: boolean;
  created_by?: string;
  created_at: string;
  posted_at?: string;
  reversed_at?: string;
}

// ── Voucher Line ───────────────────────────────────────────

export interface VoucherLine {
  line_id: string;
  voucher_id: string;
  ledger_id: string;
  ledger_name?: string;               // Denormalized
  debit: number;
  credit: number;
  commodity_id?: string;
  commodity_name?: string;
  quantity?: number;
  rate?: number;
  lot_id?: string;
}

// ── AR/AP Document ─────────────────────────────────────────

export interface ARAPDocument {
  document_id: string;
  trader_id: string;
  contact_id: string;
  contact_name?: string;
  ledger_id: string;
  type: 'AR' | 'AP';
  reference_voucher_id: string;
  reference_number: string;
  original_amount: number;
  outstanding_balance: number;
  status: ARAPStatus;
  document_date: string;
  created_at: string;
}

// ── Allocation ─────────────────────────────────────────────

export interface Allocation {
  allocation_id: string;
  document_id: string;                // AR/AP Document being settled
  payment_voucher_id: string;         // Receipt/Payment voucher
  amount: number;
  is_advance_conversion: boolean;
  allocated_at: string;
}

// ── Payment Split ──────────────────────────────────────────

export interface PaymentSplit {
  split_id: string;
  voucher_id: string;
  payment_mode: PaymentModeType;
  amount: number;
  bank_account_id?: string;
  upi_reference?: string;
}

// ── Bank Account Configuration ─────────────────────────────

export interface BankAccount {
  account_id: string;
  trader_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
  is_active: boolean;
  ledger_id: string;
  created_at: string;
}

// ── Period Lock ────────────────────────────────────────────

export interface PeriodLock {
  lock_id: string;
  trader_id: string;
  financial_year: string;             // e.g., "2024-25"
  locked_until: string;               // Date — entries before this are locked
  gst_locked_until?: string;
  created_at: string;
}

// ── Report Types ───────────────────────────────────────────

export interface TrialBalanceRow {
  ledger_id: string;
  ledger_name: string;
  accounting_class: AccountingClass;
  debit: number;
  credit: number;
}

export interface PLRow {
  category: 'INCOME' | 'EXPENSE';
  ledger_name: string;
  amount: number;
}

export interface BalanceSheetRow {
  category: 'ASSET' | 'LIABILITY' | 'EQUITY';
  ledger_name: string;
  amount: number;
}

export interface AgingBucket {
  contact_name: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

export interface CommodityProfitRow {
  commodity_name: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface LedgerTransaction {
  date: string;
  voucher_number: string;
  voucher_type: VoucherType;
  narration: string;
  debit: number;
  credit: number;
  running_balance: number;
}
