import { apiFetch } from './http';
import type { FreightMethod } from '@/types/models';

export interface ArrivalLotPayload {
  lot_name: string;
  quantity: number;
  commodity_name: string;
  broker_tag?: string;
}

export interface ArrivalSellerPayload {
  contact_id: string;
  seller_name: string;
  seller_phone: string;
  seller_mark?: string;
  lots: ArrivalLotPayload[];
}

export interface ArrivalCreatePayload {
  vehicle_number?: string;
  is_multi_seller: boolean;
  loaded_weight: number;
  empty_weight: number;
  deducted_weight: number;
  freight_method: FreightMethod;
  freight_rate: number;
  no_rental: boolean;
  advance_paid: number;
  broker_name?: string;
  narration?: string;
  sellers: ArrivalSellerPayload[];
}

/**
 * Mirrors backend ArrivalSummaryDTO (camelCase fields).
 */
export interface ArrivalSummary {
  vehicleId: string | number;
  vehicleNumber: string;
  sellerCount: number;
  lotCount: number;
  netWeight: number;
  finalBillableWeight: number;
  freightTotal: number;
  freightMethod: FreightMethod | null;
  arrivalDatetime: string;
}

/** Lot in arrival detail (id for lot lookup, e.g. WeighingPage bid enrichment). */
export interface ArrivalLotDetail {
  id: number;
  lotName: string;
}

/** Seller in arrival detail. */
export interface ArrivalSellerDetail {
  sellerName: string;
  contactId?: number;
  origin?: string;
  lots: ArrivalLotDetail[];
}

/** Arrival with nested sellers/lots; mirrors backend ArrivalDetailDTO. */
export interface ArrivalDetail {
  vehicleId: number;
  vehicleNumber: string;
  arrivalDatetime: string;
  sellers: ArrivalSellerDetail[];
}

async function handleArrivalResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
      const problem = await res.json();
      if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
        message = problem.detail;
      } else if (typeof problem.title === 'string' && problem.title.trim().length > 0) {
        message = problem.title;
      }
    } else {
      const text = await res.text();
      if (text && text.length < 200) {
        message = text;
      }
    }
  } catch {
    // ignore parse errors
  }
  throw new Error(message);
}

export const arrivalsApi = {
  async list(page = 0, size = 10): Promise<ArrivalSummary[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('size', String(size));

    const res = await apiFetch(`/arrivals?${searchParams.toString()}`, { method: 'GET' });
    const data = await handleArrivalResponse<ArrivalSummary[]>(res, 'Failed to load arrivals');
    return data;
  },

  /**
   * List arrivals with nested sellers and lots (id, lotName, sellerName) for lot-level lookup (e.g. WeighingPage).
   * Paginated; use multiple pages if you need all arrivals.
   */
  async listDetail(page = 0, size = 100): Promise<ArrivalDetail[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(page));
    searchParams.set('size', String(size));

    const res = await apiFetch(`/arrivals/detail?${searchParams.toString()}`, { method: 'GET' });
    const data = await handleArrivalResponse<ArrivalDetail[]>(res, 'Failed to load arrival details');
    return data;
  },

  async create(payload: ArrivalCreatePayload): Promise<ArrivalSummary> {
    const body = {
      vehicleNumber: payload.vehicle_number,
      multiSeller: payload.is_multi_seller,
      loadedWeight: payload.loaded_weight,
      emptyWeight: payload.empty_weight,
      deductedWeight: payload.deducted_weight,
      freightMethod: payload.freight_method,
      freightRate: payload.freight_rate,
      noRental: payload.no_rental,
      advancePaid: payload.advance_paid,
      brokerName: payload.broker_name,
      narration: payload.narration,
      sellers: payload.sellers.map(s => ({
        contactId: Number(s.contact_id),
        sellerName: s.seller_name,
        sellerPhone: s.seller_phone,
        sellerMark: s.seller_mark,
        lots: s.lots.map(l => ({
          lotName: l.lot_name,
          bagCount: l.quantity,
          commodityName: l.commodity_name,
          brokerTag: l.broker_tag,
        })),
      })),
    };

    const res = await apiFetch('/arrivals', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const created = await handleArrivalResponse<ArrivalSummary>(res, 'Failed to submit arrival');
    return created;
  },
};

