import { apiFetch } from './http';

/** Open lot for self-sale (backend OpenLotDTO). */
export interface OpenLotDTO {
  lotId: number;
  lotName: string;
  bagCount: number;
  commodityName: string;
  sellerName: string;
  sellerMark?: string;
  vehicleNumber: string;
  status: string;
}

/** Create closure request (backend CreateClosureRequestDTO). */
export interface CreateClosureRequest {
  lotId: number;
  rate: number;
  mode: 'COMMISSION' | 'TRADING';
}

/** Closed self-sale record (backend ClosureDTO). */
export interface ClosureDTO {
  id: number;
  lotId: number;
  lotName: string;
  commodityName: string;
  sellerName: string;
  rate: number;
  quantity: number;
  amount: number;
  mode: 'COMMISSION' | 'TRADING';
  closedAt: string;
}

/** Summary of all closures (total amount and count). For "Total Sold" header, aligns with client_origin. */
export interface ClosuresSummaryDTO {
  totalAmount: number;
  totalCount: number;
}

export interface SelfSaleClosuresPage {
  content: ClosureDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface OpenLotsPage {
  content: OpenLotDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      const problem = await res.json();
      if (typeof (problem as { detail?: string }).detail === 'string' && (problem as { detail: string }).detail.trim().length > 0) {
        message = (problem as { detail: string }).detail;
      } else if (typeof (problem as { title?: string }).title === 'string' && (problem as { title: string }).title.trim().length > 0) {
        message = (problem as { title: string }).title;
      } else if (typeof (problem as { message?: string }).message === 'string') {
        message = (problem as { message: string }).message;
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
 * Self-Sale API. Base path: /self-sale.
 */
export const selfSaleApi = {
  /**
   * Get open lots (paginated, optional search). Backend excludes already closed lots.
   */
  async getOpenLots(params: { page?: number; size?: number; search?: string } = {}): Promise<{ content: OpenLotDTO[]; totalElements: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 50));
    if (params.search != null && params.search.trim() !== '') {
      searchParams.set('search', params.search.trim());
    }
    const res = await apiFetch(`/self-sale/open-lots?${searchParams.toString()}`, { method: 'GET' });
    const content = await handleResponse<OpenLotDTO[]>(res, 'Failed to load open lots');
    const totalElements = res.headers.get('X-Total-Count') ? Number(res.headers.get('X-Total-Count')) : content.length;
    const totalPages = Math.ceil(totalElements / (params.size ?? 50)) || 1;
    return { content, totalElements, totalPages };
  },

  /**
   * Create a self-sale closure.
   */
  async createClosure(payload: CreateClosureRequest): Promise<ClosureDTO> {
    const res = await apiFetch('/self-sale/closures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return handleResponse<ClosureDTO>(res, 'Failed to create self-sale closure');
  },

  /**
   * Get summary of all closed self-sales (total amount and count). For "Total Sold" header; aligns with client_origin.
   */
  async getClosuresSummary(): Promise<ClosuresSummaryDTO> {
    const res = await apiFetch('/self-sale/closures/summary', { method: 'GET' });
    const data = await handleResponse<{ totalAmount: number; totalCount: number }>(res, 'Failed to load closures summary');
    return { totalAmount: Number(data.totalAmount), totalCount: Number(data.totalCount) };
  },

  /**
   * Get closed self-sales (paginated). Default sort: closedAt,desc.
   */
  async getClosures(params: { page?: number; size?: number } = {}): Promise<{ content: ClosureDTO[]; totalElements: number; totalPages: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 10));
    searchParams.set('sort', 'closedAt,desc');
    const res = await apiFetch(`/self-sale/closures?${searchParams.toString()}`, { method: 'GET' });
    const content = await handleResponse<ClosureDTO[]>(res, 'Failed to load closed self-sales');
    const totalElements = res.headers.get('X-Total-Count') ? Number(res.headers.get('X-Total-Count')) : content.length;
    const totalPages = Math.ceil(totalElements / (params.size ?? 10)) || 1;
    return { content, totalElements, totalPages };
  },
};
