import type { ARAPDocument, ARAPStatus } from '@/types/accounting';
import { apiFetch } from './http';

export interface ArApDocumentDTO {
  documentId: string;
  traderId?: string;
  contactId: string;
  contactName?: string;
  ledgerId: string;
  type: 'AR' | 'AP';
  referenceVoucherId: string;
  referenceNumber: string;
  originalAmount: number;
  outstandingBalance: number;
  status: ARAPStatus;
  documentDate: string;
  createdAt?: string;
}

function dtoToARAPDocument(d: ArApDocumentDTO): ARAPDocument {
  return {
    document_id: d.documentId,
    trader_id: d.traderId ?? '',
    contact_id: d.contactId,
    contact_name: d.contactName,
    ledger_id: d.ledgerId,
    type: d.type,
    reference_voucher_id: d.referenceVoucherId,
    reference_number: d.referenceNumber,
    original_amount: Number(d.originalAmount),
    outstanding_balance: Number(d.outstandingBalance),
    status: d.status,
    document_date: d.documentDate,
    created_at: d.createdAt ?? new Date().toISOString(),
  };
}

export interface ArApDocumentPage {
  content: ArApDocumentDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE = '/arap-documents';

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = defaultMessage;
  try {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      const problem = (await res.json()) as { detail?: string; message?: string; title?: string };
      if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) message = problem.detail;
      else if (typeof problem.message === 'string' && problem.message.trim().length > 0) message = problem.message;
      else if (typeof problem.title === 'string' && problem.title.trim().length > 0) message = problem.title;
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
 * AR/AP Documents API. Base path: /api/arap-documents.
 * For Financial Reports AR/AP aging.
 */
export const arapDocumentsApi = {
  /**
   * Get paginated AR/AP documents. Optional type (AR|AP), status. Trader-scoped.
   */
  async getPage(params: {
    page?: number;
    size?: number;
    sort?: string;
    type?: 'AR' | 'AP';
    status?: string;
  } = {}): Promise<{ content: ARAPDocument[]; totalElements: number; totalPages: number; size: number; number: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 100));
    searchParams.set('sort', params.sort ?? 'documentDate,desc');
    if (params.type != null) {
      searchParams.set('type', params.type);
    }
    if (params.status != null && params.status.trim() !== '') {
      searchParams.set('status', params.status.trim());
    }
    const res = await apiFetch(`${BASE}?${searchParams.toString()}`, { method: 'GET' });
    const data = await handleResponse<ArApDocumentPage>(res, 'Failed to load AR/AP documents');
    return {
      ...data,
      content: data.content.map(dtoToARAPDocument),
    };
  },
};
