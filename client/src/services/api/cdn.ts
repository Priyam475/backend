import { apiFetch } from './http';

/** Line item (backend CDNLineItemDTO). */
export interface CDNLineItemDTO {
  id?: string;
  lotName: string;
  quantity: number;
  variant?: string;
}

/** CDN response (backend CDNResponseDTO). */
export interface CDNResponseDTO {
  id: number;
  cdnNumber: string;
  date: string;
  dispatchingParty?: string;
  receivingParty?: string;
  items: CDNLineItemDTO[];
  freightFormula?: string;
  transporter?: string;
  driver?: string;
  advancePaid?: number;
  remarks?: string;
  pin?: string;
  pinUsed?: boolean;
  pinExpiresAt?: string;
  source: string;
  status: string;
  createdAt?: string;
}

/** Create request (backend CDNCreateDTO). */
export interface CDNCreateRequest {
  receivingParty: string;
  receivingPartyId?: number;
  items: Array<{ lotName?: string; quantity: number; variant?: string }>;
  freightFormula?: string;
  transporter?: string;
  driver?: string;
  advancePaid?: number;
  remarks?: string;
  source: string;
}

/** Receive by PIN request (backend ReceiveByPINDTO). */
export interface ReceiveByPINRequest {
  pin: string;
}

/** Paginated list: Spring returns body as array + X-Total-Count header. */
export interface CDNListResult {
  content: CDNResponseDTO[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

const BASE = '/cdns';

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
      if (problem.fieldErrors?.length) {
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
 * CDN API. Base path: /api/cdns.
 */
export const cdnApi = {
  /**
   * Create CDN. Returns body with generated PIN.
   */
  async create(request: CDNCreateRequest): Promise<CDNResponseDTO> {
    const res = await apiFetch(BASE, {
      method: 'POST',
      body: JSON.stringify({
        receivingParty: request.receivingParty,
        receivingPartyId: request.receivingPartyId,
        items: request.items,
        freightFormula: request.freightFormula,
        transporter: request.transporter,
        driver: request.driver,
        advancePaid: request.advancePaid ?? 0,
        remarks: request.remarks,
        source: request.source,
      }),
    });
    return handleResponse(res, 'Failed to create CDN');
  },

  /**
   * Get CDN by id.
   */
  async getById(id: number): Promise<CDNResponseDTO | null> {
    const res = await apiFetch(`${BASE}/${id}`);
    if (res.status === 404) return null;
    return handleResponse(res, 'Failed to load CDN');
  },

  /**
   * List CDNs with pagination and optional search.
   */
  async list(params: { page?: number; size?: number; sort?: string; q?: string } = {}): Promise<CDNListResult> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page ?? 0));
    searchParams.set('size', String(params.size ?? 10));
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.q != null && params.q.trim() !== '') searchParams.set('q', params.q.trim());

    const res = await apiFetch(`${BASE}?${searchParams.toString()}`);
    const content = (await res.json()) as CDNResponseDTO[];
    const total = res.headers.get('X-Total-Count');
    const totalElements = total != null ? parseInt(total, 10) : content.length;
    const size = params.size ?? 10;
    const number = params.page ?? 0;
    return {
      content,
      totalElements,
      totalPages: size > 0 ? Math.ceil(totalElements / size) : 0,
      size,
      number,
    };
  },

  /**
   * Receive CDN by PIN.
   */
  async receiveByPin(request: ReceiveByPINRequest): Promise<CDNResponseDTO> {
    const res = await apiFetch(`${BASE}/receive`, {
      method: 'POST',
      body: JSON.stringify({ pin: request.pin.trim().toUpperCase() }),
    });
    return handleResponse(res, 'Invalid or expired PIN');
  },
};
