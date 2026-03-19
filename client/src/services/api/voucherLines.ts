import type { VoucherLine } from '@/types/accounting';
import { apiFetch } from './http';

export interface VoucherLineDTO {
  lineId: string;
  voucherId: string;
  ledgerId: string;
  ledgerName?: string;
  debit: number;
  credit: number;
  commodityId?: string;
  commodityName?: string;
  quantity?: number;
  rate?: number;
  lotId?: string;
  /** Voucher header fields (when fetched by ledger). */
  voucherDate?: string;
  voucherNumber?: string;
  voucherType?: string;
  narration?: string;
  status?: string;
}

function dtoToVoucherLine(l: VoucherLineDTO): VoucherLine {
  return {
    line_id: l.lineId,
    voucher_id: l.voucherId,
    ledger_id: l.ledgerId,
    ledger_name: l.ledgerName,
    debit: Number(l.debit),
    credit: Number(l.credit),
    commodity_id: l.commodityId,
    commodity_name: l.commodityName,
    quantity: l.quantity != null ? Number(l.quantity) : undefined,
    rate: l.rate != null ? Number(l.rate) : undefined,
    lot_id: l.lotId,
    voucher_date: l.voucherDate,
    voucher_number: l.voucherNumber,
    voucher_type: l.voucherType as VoucherLine['voucher_type'],
    narration: l.narration,
    status: l.status as VoucherLine['status'],
  };
}

const BASE = '/voucher-lines';

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = defaultMessage;
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const p = (await res.json()) as { detail?: string; message?: string };
      if (typeof p.detail === 'string' && p.detail.trim()) message = p.detail;
      else if (typeof p.message === 'string' && p.message.trim()) message = p.message;
    } else {
      const t = await res.text();
      if (t && t.length < 200) message = t;
    }
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

export const voucherLinesApi = {
  async getByDateRange(dateFrom: string, dateTo: string): Promise<VoucherLine[]> {
    const q = new URLSearchParams();
    q.set('dateFrom', dateFrom);
    q.set('dateTo', dateTo);
    const res = await apiFetch(`${BASE}?${q.toString()}`, { method: 'GET' });
    const list = await handleResponse<VoucherLineDTO[]>(res, 'Failed to load voucher lines');
    return list.map(dtoToVoucherLine);
  },

  async getByLedgerAndDateRange(ledgerId: string, dateFrom: string, dateTo: string): Promise<VoucherLine[]> {
    const q = new URLSearchParams();
    q.set('ledgerId', ledgerId);
    q.set('dateFrom', dateFrom);
    q.set('dateTo', dateTo);
    const res = await apiFetch(`${BASE}?${q.toString()}`, { method: 'GET' });
    const list = await handleResponse<VoucherLineDTO[]>(res, 'Failed to load voucher lines');
    return list.map(dtoToVoucherLine);
  },
};
