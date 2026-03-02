import type { VoucherHeader, VoucherLine, VoucherType, VoucherLifecycle } from '@/types/accounting';
import { apiFetch } from './http';

/** Backend DTO (camelCase) — aligns with VoucherHeaderDTO. */
export interface VoucherHeaderDTO {
  voucherId: string;
  traderId?: string;
  voucherType: VoucherType;
  voucherNumber: string;
  voucherDate: string;
  narration: string;
  status: VoucherLifecycle;
  totalDebit: number;
  totalCredit: number;
  isMigrated?: boolean;
  createdAt?: string;
  createdBy?: string;
  postedAt?: string;
  reversedAt?: string;
  lines?: VoucherLineDTO[];
}

export interface VoucherLineDTO {
  lineId: string;
  voucherId: string;
  ledgerId: string;
  ledgerName?: string;
  debit: number;
  credit: number;
}

/** Paginated response (Spring Page). */
export interface VoucherHeaderPage {
  content: VoucherHeaderDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Create request body. */
export interface VoucherHeaderCreateRequest {
  voucherType: VoucherType;
  narration: string;
  voucherDate?: string;
  lines: Array<{ ledgerId: number; debit: number; credit: number }>;
}

/** Round to 2 decimals for API payload (floating-point safety). */
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dtoToVoucherHeader(d: VoucherHeaderDTO): VoucherHeader {
  return {
    voucher_id: d.voucherId,
    trader_id: d.traderId ?? '',
    voucher_type: d.voucherType,
    voucher_number: d.voucherNumber,
    voucher_date: d.voucherDate,
    narration: d.narration,
    status: d.status,
    total_debit: Number(d.totalDebit),
    total_credit: Number(d.totalCredit),
    is_migrated: d.isMigrated ?? false,
    created_at: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    posted_at: d.postedAt ?? undefined,
    reversed_at: d.reversedAt ?? undefined,
  };
}

function dtoToVoucherLine(l: VoucherLineDTO): VoucherLine {
  return {
    line_id: l.lineId,
    voucher_id: l.voucherId,
    ledger_id: l.ledgerId,
    ledger_name: l.ledgerName,
    debit: Number(l.debit),
    credit: Number(l.credit),
  };
}

const BASE = '/voucher-headers';

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const problem = (await res.json()) as { detail?: string; message?: string; title?: string; fieldErrors?: Array<{ field: string; message: string }> };
      if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) message = problem.detail;
      else if (typeof problem.message === 'string' && problem.message.trim().length > 0) message = problem.message;
      else if (typeof problem.title === 'string' && problem.title.trim().length > 0) message = problem.title;
      if (problem.fieldErrors && Array.isArray(problem.fieldErrors) && problem.fieldErrors.length > 0) {
        message = problem.fieldErrors.map((e) => `${e.field}: ${e.message}`).join('; ');
      }
    } else {
      const text = await res.text();
      if (text && text.length < 200) message = text;
    }
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

/**
 * Voucher Headers API. Base path: /voucher-headers.
 * List (paginated, filter by type/status/search), get by id, create, post, reverse.
 */
export const voucherHeadersApi = {
  async getPage(params: {
    page?: number;
    size?: number;
    sort?: string;
    voucherType?: VoucherType | '';
    status?: string;
    search?: string;
  } = {}): Promise<{ content: VoucherHeader[]; totalElements: number; totalPages: number; size: number; number: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 20));
    searchParams.set('sort', params.sort ?? 'createdDate,desc');
    if (params.voucherType != null && params.voucherType !== '') {
      searchParams.set('voucherType', params.voucherType);
    }
    if (params.status != null && params.status.trim() !== '') {
      searchParams.set('status', params.status.trim());
    }
    if (params.search != null && params.search.trim() !== '') {
      searchParams.set('search', params.search.trim());
    }
    const res = await apiFetch(`${BASE}?${searchParams.toString()}`, { method: 'GET' });
    const data = await handleResponse<VoucherHeaderPage>(res, 'Failed to load vouchers');
    return {
      ...data,
      content: data.content.map(dtoToVoucherHeader),
    };
  },

  async getById(id: string | number): Promise<{ header: VoucherHeader; lines: VoucherLine[] }> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}`, { method: 'GET' });
    const d = await handleResponse<VoucherHeaderDTO>(res, 'Failed to load voucher');
    const header = dtoToVoucherHeader(d);
    const lines = (d.lines ?? []).map(dtoToVoucherLine);
    return { header, lines };
  },

  async create(payload: VoucherHeaderCreateRequest): Promise<{ header: VoucherHeader; lines: VoucherLine[] }> {
    const body = {
      voucherType: payload.voucherType,
      narration: payload.narration,
      voucherDate: payload.voucherDate ?? undefined,
      lines: payload.lines.map((l) => ({
        ledgerId: l.ledgerId,
        debit: roundTo2(l.debit),
        credit: roundTo2(l.credit),
      })),
    };
    const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
    const d = await handleResponse<VoucherHeaderDTO>(res, 'Failed to create voucher');
    const header = dtoToVoucherHeader(d);
    const lines = (d.lines ?? []).map(dtoToVoucherLine);
    return { header, lines };
  },

  async post(id: string | number): Promise<VoucherHeader> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}/post`, { method: 'POST' });
    const d = await handleResponse<VoucherHeaderDTO>(res, 'Failed to post voucher');
    return dtoToVoucherHeader(d);
  },

  async reverse(id: string | number): Promise<VoucherHeader> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}/reverse`, { method: 'POST' });
    const d = await handleResponse<VoucherHeaderDTO>(res, 'Failed to reverse voucher');
    return dtoToVoucherHeader(d);
  },
};
