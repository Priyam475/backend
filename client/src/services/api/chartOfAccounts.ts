import type { AccountingClass, COALedger, LedgerClassification } from '@/types/accounting';
import { apiFetch } from './http';

/** Map backend DTO to frontend COALedger (ledger_id as string id). */
export function dtoToCOALedger(dto: ChartOfAccountDTO): COALedger {
  return {
    ledger_id: String(dto.id),
    trader_id: String(dto.traderId),
    ledger_name: dto.ledgerName,
    accounting_class: dto.accountingClass as AccountingClass,
    classification: dto.classification as LedgerClassification,
    parent_control_id: dto.parentControlId != null ? String(dto.parentControlId) : undefined,
    contact_id: dto.contactId != null ? String(dto.contactId) : undefined,
    is_system: dto.system,
    is_locked: dto.locked,
    opening_balance: Number(dto.openingBalance),
    current_balance: Number(dto.currentBalance),
    created_at: dto.createdAt ? new Date(dto.createdAt).toISOString() : new Date().toISOString(),
  };
}

/** Single chart of account (ledger) — aligns with backend ChartOfAccountDTO and frontend COALedger. */
export interface ChartOfAccountDTO {
  id: number;
  traderId: number;
  ledgerName: string;
  accountingClass: AccountingClass;
  classification: LedgerClassification;
  parentControlId?: number | null;
  contactId?: number | null;
  system: boolean;
  locked: boolean;
  openingBalance: number;
  currentBalance: number;
  createdAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

/** Paginated response (Spring Page). */
export interface ChartOfAccountPage {
  content: ChartOfAccountDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Create request. */
export interface ChartOfAccountCreateRequest {
  ledgerName: string;
  classification: LedgerClassification;
  openingBalance?: number;
  parentControlId?: number | null;
  contactId?: number | null;
}

/** Update request. */
export interface ChartOfAccountUpdateRequest {
  ledgerName: string;
  classification: LedgerClassification;
  openingBalance?: number;
  currentBalance?: number;
  parentControlId?: number | null;
  contactId?: number | null;
  locked?: boolean;
}

const BASE = '/chart-of-accounts';

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      const problem = (await res.json()) as {
        detail?: string;
        title?: string;
        message?: string;
        fieldErrors?: Array<{ field: string; message: string }>;
      };
      if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
        message = problem.detail;
      } else if (typeof problem.message === 'string' && problem.message.trim().length > 0) {
        message = problem.message;
      } else if (typeof problem.title === 'string' && problem.title.trim().length > 0) {
        message = problem.title;
      }
      if (problem.fieldErrors && Array.isArray(problem.fieldErrors) && problem.fieldErrors.length > 0) {
        message = problem.fieldErrors.map((e) => `${e.field}: ${e.message}`).join('; ');
      }
    } else {
      const text = await res.text();
      if (text && text.length < 200) message = text;
    }
  } catch {
    // ignore
  }
  throw new Error(message);
}

/**
 * Chart of Accounts API. Base path: /chart-of-accounts.
 * Use getPage, getById, create, update, delete. Auth: same as other APIs (credentials: include).
 */
export const chartOfAccountsApi = {
  /**
   * Get paginated chart of accounts. Optional: search, accountingClass, classification.
   */
  async getPage(params: {
    page?: number;
    size?: number;
    sort?: string;
    search?: string;
    accountingClass?: string;
    classification?: string;
  } = {}): Promise<ChartOfAccountPage> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 10));
    searchParams.set('sort', params.sort ?? 'ledgerName,asc');
    if (params.search != null && params.search.trim() !== '') {
      searchParams.set('search', params.search.trim());
    }
    if (params.accountingClass != null && params.accountingClass.trim() !== '') {
      searchParams.set('accountingClass', params.accountingClass.trim());
    }
    if (params.classification != null && params.classification.trim() !== '') {
      searchParams.set('classification', params.classification.trim());
    }
    const res = await apiFetch(`${BASE}?${searchParams.toString()}`, { method: 'GET' });
    return handleResponse<ChartOfAccountPage>(res, 'Failed to load chart of accounts');
  },

  async getById(id: string | number): Promise<ChartOfAccountDTO> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}`, { method: 'GET' });
    return handleResponse<ChartOfAccountDTO>(res, 'Failed to load ledger');
  },

  async create(payload: ChartOfAccountCreateRequest): Promise<ChartOfAccountDTO> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return handleResponse<ChartOfAccountDTO>(res, 'Failed to create ledger');
  },

  async update(id: string | number, payload: ChartOfAccountUpdateRequest): Promise<ChartOfAccountDTO> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return handleResponse<ChartOfAccountDTO>(res, 'Failed to update ledger');
  },

  async delete(id: string | number): Promise<void> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    if (!res.ok) {
      await handleResponse<unknown>(res, 'Failed to delete ledger');
    }
  },
};
