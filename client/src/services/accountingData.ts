// ============================================================
// Mercotrace — Accounting Seed Data (SRS Part 6)
// ============================================================

import type {
  COALedger, VoucherHeader, VoucherLine, ARAPDocument, BankAccount, PeriodLock
} from '@/types/accounting';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = new Date().toISOString().split('T')[0];

// ── System-Generated Immutable Ledgers (Section 3.2) ───────

const TRADER_ID = 'trader-001';

export const SYSTEM_LEDGERS: COALedger[] = [
  // Assets
  { ledger_id: 'ledger-cash', trader_id: TRADER_ID, ledger_name: 'Cash', accounting_class: 'ASSET', classification: 'CASH', is_system: true, is_locked: true, opening_balance: 50000, current_balance: 72500, created_at: now() },
  { ledger_id: 'ledger-upi-clearing', trader_id: TRADER_ID, ledger_name: 'UPI Clearing', accounting_class: 'ASSET', classification: 'BANK', is_system: true, is_locked: true, opening_balance: 0, current_balance: 15000, created_at: now() },
  { ledger_id: 'ledger-ar-control', trader_id: TRADER_ID, ledger_name: 'Accounts Receivable – Control', accounting_class: 'ASSET', classification: 'CONTROL', is_system: true, is_locked: true, opening_balance: 0, current_balance: 87000, created_at: now() },
  { ledger_id: 'ledger-gst-input', trader_id: TRADER_ID, ledger_name: 'GST Input Credit', accounting_class: 'ASSET', classification: 'TAX', is_system: true, is_locked: true, opening_balance: 0, current_balance: 4200, created_at: now() },

  // Liabilities
  { ledger_id: 'ledger-ap-control', trader_id: TRADER_ID, ledger_name: 'Accounts Payable – Control', accounting_class: 'LIABILITY', classification: 'CONTROL', is_system: true, is_locked: true, opening_balance: 0, current_balance: 65000, created_at: now() },
  { ledger_id: 'ledger-gst-output', trader_id: TRADER_ID, ledger_name: 'GST Output', accounting_class: 'LIABILITY', classification: 'TAX', is_system: true, is_locked: true, opening_balance: 0, current_balance: 8400, created_at: now() },
  { ledger_id: 'ledger-market-fee', trader_id: TRADER_ID, ledger_name: 'Market Fee Payable', accounting_class: 'LIABILITY', classification: 'PAYABLE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 3500, created_at: now() },
  { ledger_id: 'ledger-brokerage-payable', trader_id: TRADER_ID, ledger_name: 'Brokerage Payable (Master)', accounting_class: 'LIABILITY', classification: 'PAYABLE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 2800, created_at: now() },

  // Income
  { ledger_id: 'ledger-commission', trader_id: TRADER_ID, ledger_name: 'Commission Income', accounting_class: 'INCOME', classification: 'INCOME', is_system: true, is_locked: true, opening_balance: 0, current_balance: 45000, created_at: now() },
  { ledger_id: 'ledger-extra-rate', trader_id: TRADER_ID, ledger_name: 'Extra Rate Income', accounting_class: 'INCOME', classification: 'INCOME', is_system: true, is_locked: true, opening_balance: 0, current_balance: 12000, created_at: now() },
  { ledger_id: 'ledger-sales-revenue', trader_id: TRADER_ID, ledger_name: 'Sales Revenue', accounting_class: 'INCOME', classification: 'INCOME', is_system: true, is_locked: true, opening_balance: 0, current_balance: 0, created_at: now() },

  // Expenses
  { ledger_id: 'ledger-freight-exp', trader_id: TRADER_ID, ledger_name: 'Freight Expense', accounting_class: 'EXPENSE', classification: 'EXPENSE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 18000, created_at: now() },
  { ledger_id: 'ledger-coolie-exp', trader_id: TRADER_ID, ledger_name: 'Coolie Expense', accounting_class: 'EXPENSE', classification: 'EXPENSE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 6500, created_at: now() },
  { ledger_id: 'ledger-salary-exp', trader_id: TRADER_ID, ledger_name: 'Salary Expense', accounting_class: 'EXPENSE', classification: 'EXPENSE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 25000, created_at: now() },
  { ledger_id: 'ledger-bad-debt', trader_id: TRADER_ID, ledger_name: 'Bad Debt Expense', accounting_class: 'EXPENSE', classification: 'EXPENSE', is_system: true, is_locked: true, opening_balance: 0, current_balance: 0, created_at: now() },

  // Equity
  { ledger_id: 'ledger-capital', trader_id: TRADER_ID, ledger_name: 'Capital', accounting_class: 'EQUITY', classification: 'EQUITY', is_system: true, is_locked: true, opening_balance: 250000, current_balance: 250000, created_at: now() },
  { ledger_id: 'ledger-retained', trader_id: TRADER_ID, ledger_name: 'Retained Earnings', accounting_class: 'EQUITY', classification: 'EQUITY', is_system: true, is_locked: true, opening_balance: 0, current_balance: 15000, created_at: now() },
];

// ── User-Created Subledgers ────────────────────────────────

export const USER_LEDGERS: COALedger[] = [
  { ledger_id: 'ledger-vijay-ar', trader_id: TRADER_ID, ledger_name: 'Vijay Traders – Receivable', accounting_class: 'ASSET', classification: 'RECEIVABLE', parent_control_id: 'ledger-ar-control', contact_id: 'c3', is_system: false, is_locked: true, opening_balance: 0, current_balance: 52000, created_at: now() },
  { ledger_id: 'ledger-mahalaxmi-ar', trader_id: TRADER_ID, ledger_name: 'Mahalaxmi Store – Receivable', accounting_class: 'ASSET', classification: 'RECEIVABLE', parent_control_id: 'ledger-ar-control', contact_id: 'c4', is_system: false, is_locked: true, opening_balance: 0, current_balance: 35000, created_at: now() },
  { ledger_id: 'ledger-ramesh-ap', trader_id: TRADER_ID, ledger_name: 'Ramesh Kumar – Payable', accounting_class: 'LIABILITY', classification: 'PAYABLE', parent_control_id: 'ledger-ap-control', contact_id: 'c1', is_system: false, is_locked: true, opening_balance: 0, current_balance: 38000, created_at: now() },
  { ledger_id: 'ledger-suresh-ap', trader_id: TRADER_ID, ledger_name: 'Suresh Patil – Payable', accounting_class: 'LIABILITY', classification: 'PAYABLE', parent_control_id: 'ledger-ap-control', contact_id: 'c2', is_system: false, is_locked: true, opening_balance: 0, current_balance: 27000, created_at: now() },
  { ledger_id: 'ledger-hdfc', trader_id: TRADER_ID, ledger_name: 'HDFC Bank A/c', accounting_class: 'ASSET', classification: 'BANK', is_system: false, is_locked: false, opening_balance: 200000, current_balance: 185000, created_at: now() },
];

// ── Sample Vouchers ────────────────────────────────────────

export const SEED_VOUCHERS: VoucherHeader[] = [
  { voucher_id: 'v-001', trader_id: TRADER_ID, voucher_type: 'SALES_BILL', voucher_number: 'KT/SB/001', voucher_date: today, narration: 'Sales Bill – Vijay Traders (Onion)', status: 'POSTED', total_debit: 52000, total_credit: 52000, is_migrated: false, created_at: now(), posted_at: now() },
  { voucher_id: 'v-002', trader_id: TRADER_ID, voucher_type: 'SALES_SETTLEMENT', voucher_number: 'KT/SS/001', voucher_date: today, narration: 'Settlement – Ramesh Kumar', status: 'POSTED', total_debit: 38000, total_credit: 38000, is_migrated: false, created_at: now(), posted_at: now() },
  { voucher_id: 'v-003', trader_id: TRADER_ID, voucher_type: 'RECEIPT', voucher_number: 'KT/RV/001', voucher_date: today, narration: 'Receipt from Vijay Traders – Cash', status: 'POSTED', total_debit: 20000, total_credit: 20000, is_migrated: false, created_at: now(), posted_at: now() },
  { voucher_id: 'v-004', trader_id: TRADER_ID, voucher_type: 'PAYMENT', voucher_number: 'KT/PV/001', voucher_date: today, narration: 'Payment to Ramesh Kumar – Cash', status: 'DRAFT', total_debit: 15000, total_credit: 15000, is_migrated: false, created_at: now() },
  { voucher_id: 'v-005', trader_id: TRADER_ID, voucher_type: 'JOURNAL', voucher_number: 'KT/JV/001', voucher_date: today, narration: 'Freight allocation adjustment', status: 'POSTED', total_debit: 5000, total_credit: 5000, is_migrated: false, created_at: now(), posted_at: now() },
];

export const SEED_VOUCHER_LINES: VoucherLine[] = [
  // V-001: Sales Bill – Dr Receivable-Vijay, Cr Commission, Cr Payable-Ramesh, Cr Market Fee, Cr GST
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-vijay-ar', ledger_name: 'Vijay Traders – Receivable', debit: 52000, credit: 0, commodity_id: 'onion', commodity_name: 'Onion', quantity: 750, rate: 800 },
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-ramesh-ap', ledger_name: 'Ramesh Kumar – Payable', debit: 0, credit: 38000 },
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-commission', ledger_name: 'Commission Income', debit: 0, credit: 8000 },
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-extra-rate', ledger_name: 'Extra Rate Income', debit: 0, credit: 2500 },
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-market-fee', ledger_name: 'Market Fee Payable', debit: 0, credit: 1500 },
  { line_id: id(), voucher_id: 'v-001', ledger_id: 'ledger-gst-output', ledger_name: 'GST Output', debit: 0, credit: 2000 },

  // V-003: Receipt – Dr Cash, Cr Vijay Traders AR
  { line_id: id(), voucher_id: 'v-003', ledger_id: 'ledger-cash', ledger_name: 'Cash', debit: 20000, credit: 0 },
  { line_id: id(), voucher_id: 'v-003', ledger_id: 'ledger-vijay-ar', ledger_name: 'Vijay Traders – Receivable', debit: 0, credit: 20000 },

  // V-004: Payment – Dr Ramesh AP, Cr Cash
  { line_id: id(), voucher_id: 'v-004', ledger_id: 'ledger-ramesh-ap', ledger_name: 'Ramesh Kumar – Payable', debit: 15000, credit: 0 },
  { line_id: id(), voucher_id: 'v-004', ledger_id: 'ledger-cash', ledger_name: 'Cash', debit: 0, credit: 15000 },

  // V-005: Journal – Dr Freight Expense, Cr Ramesh Payable
  { line_id: id(), voucher_id: 'v-005', ledger_id: 'ledger-freight-exp', ledger_name: 'Freight Expense', debit: 5000, credit: 0 },
  { line_id: id(), voucher_id: 'v-005', ledger_id: 'ledger-ramesh-ap', ledger_name: 'Ramesh Kumar – Payable', debit: 0, credit: 5000 },
];

// ── AR/AP Documents ────────────────────────────────────────

export const SEED_ARAP_DOCS: ARAPDocument[] = [
  { document_id: 'arap-001', trader_id: TRADER_ID, contact_id: 'c3', contact_name: 'Vijay Traders', ledger_id: 'ledger-vijay-ar', type: 'AR', reference_voucher_id: 'v-001', reference_number: 'KT/SB/001', original_amount: 52000, outstanding_balance: 32000, status: 'PARTIAL', document_date: today, created_at: now() },
  { document_id: 'arap-002', trader_id: TRADER_ID, contact_id: 'c4', contact_name: 'Mahalaxmi Store', ledger_id: 'ledger-mahalaxmi-ar', type: 'AR', reference_voucher_id: 'v-001', reference_number: 'KT/SB/002', original_amount: 35000, outstanding_balance: 35000, status: 'OPEN', document_date: today, created_at: now() },
  { document_id: 'arap-003', trader_id: TRADER_ID, contact_id: 'c1', contact_name: 'Ramesh Kumar', ledger_id: 'ledger-ramesh-ap', type: 'AP', reference_voucher_id: 'v-002', reference_number: 'KT/SS/001', original_amount: 38000, outstanding_balance: 23000, status: 'PARTIAL', document_date: today, created_at: now() },
  { document_id: 'arap-004', trader_id: TRADER_ID, contact_id: 'c2', contact_name: 'Suresh Patil', ledger_id: 'ledger-suresh-ap', type: 'AP', reference_voucher_id: 'v-002', reference_number: 'KT/SS/002', original_amount: 27000, outstanding_balance: 27000, status: 'OPEN', document_date: today, created_at: now() },
];

// ── Bank Accounts ──────────────────────────────────────────

export const SEED_BANK_ACCOUNTS: BankAccount[] = [
  { account_id: 'bank-001', trader_id: TRADER_ID, account_name: 'HDFC Current A/c', bank_name: 'HDFC Bank', account_number: '50100XXXXXX789', ifsc_code: 'HDFC0001234', upi_id: 'krishna@hdfcbank', is_active: true, ledger_id: 'ledger-hdfc', created_at: now() },
];

// ── Period Lock ────────────────────────────────────────────

export const SEED_PERIOD_LOCK: PeriodLock = {
  lock_id: 'lock-001',
  trader_id: TRADER_ID,
  financial_year: '2025-26',
  locked_until: '2025-03-31',
  gst_locked_until: '2025-03-31',
  created_at: now(),
};

// ── Initialize Accounting Data ─────────────────────────────

export function initializeAccountingData() {
  if (!localStorage.getItem('mkt_accounting_v2')) {
    const allLedgers = [...SYSTEM_LEDGERS, ...USER_LEDGERS];
    localStorage.setItem('mkt_coa_ledgers', JSON.stringify(allLedgers));
    localStorage.setItem('mkt_acc_vouchers', JSON.stringify(SEED_VOUCHERS));
    localStorage.setItem('mkt_acc_voucher_lines', JSON.stringify(SEED_VOUCHER_LINES));
    localStorage.setItem('mkt_arap_docs', JSON.stringify(SEED_ARAP_DOCS));
    localStorage.setItem('mkt_bank_accounts', JSON.stringify(SEED_BANK_ACCOUNTS));
    localStorage.setItem('mkt_period_lock', JSON.stringify(SEED_PERIOD_LOCK));
    localStorage.setItem('mkt_allocations', JSON.stringify([]));
    localStorage.setItem('mkt_accounting_v2', 'true');
  }
}
