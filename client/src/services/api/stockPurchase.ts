import { apiFetch } from './http';

/** Line item (backend PurchaseLineItemDTO). */
export interface PurchaseLineItemDTO {
  id?: number;
  commodity?: string;
  commodityId?: number;
  quantity: number;
  rate: number;
  amount: number;
}

/** Charge (backend PurchaseChargeDTO). */
export interface PurchaseChargeDTO {
  id?: number;
  name: string;
  amount: number;
}

/** Stock purchase record (backend StockPurchaseDTO). */
export interface StockPurchaseDTO {
  id: number;
  vendorId: number;
  vendorName: string;
  items: PurchaseLineItemDTO[];
  charges: PurchaseChargeDTO[];
  subtotal: number;
  totalCharges: number;
  grandTotal: number;
  lotNumbers: string[];
  createdAt: string;
}

/** Create request body (backend CreateStockPurchaseRequestDTO). */
export interface CreateStockPurchaseRequest {
  vendorId: number;
  items: Array<{
    commodityId?: number;
    commodity?: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  charges?: Array<{ name: string; amount: number }>;
}

/** Paginated response (Spring Page). */
export interface StockPurchasePage {
  content: StockPurchaseDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE = '/stock-purchases';

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      const problem = await res.json() as { detail?: string; title?: string; message?: string; fieldErrors?: Array<{ field: string; message: string }> };
      if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
        message = problem.detail;
      } else if (typeof problem.message === 'string' && problem.message.trim().length > 0) {
        message = problem.message;
      } else if (typeof problem.title === 'string' && problem.title.trim().length > 0) {
        message = problem.title;
      }
      if (problem.fieldErrors && Array.isArray(problem.fieldErrors) && problem.fieldErrors.length > 0) {
        message = problem.fieldErrors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join('; ');
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
 * Stock Purchase API. Base path: /stock-purchases.
 */
export const stockPurchaseApi = {
  /**
   * Get paginated stock purchases. Optional vendor search. Default sort: createdDate,desc.
   */
  async getPage(params: { page?: number; size?: number; sort?: string; vendorSearch?: string } = {}): Promise<StockPurchasePage> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 10));
    searchParams.set('sort', params.sort ?? 'createdDate,desc');
    if (params.vendorSearch != null && params.vendorSearch.trim() !== '') {
      searchParams.set('vendorSearch', params.vendorSearch.trim());
    }
    const res = await apiFetch(`${BASE}?${searchParams.toString()}`, { method: 'GET' });
    return handleResponse<StockPurchasePage>(res, 'Failed to load stock purchases');
  },

  /**
   * Get one stock purchase by id.
   */
  async getById(id: number): Promise<StockPurchaseDTO> {
    const res = await apiFetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'GET' });
    return handleResponse<StockPurchaseDTO>(res, 'Failed to load stock purchase');
  },

  /**
   * Create a stock purchase.
   */
  async create(payload: CreateStockPurchaseRequest): Promise<StockPurchaseDTO> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return handleResponse<StockPurchaseDTO>(res, 'Failed to create stock purchase');
  },
};
