import { apiFetch } from './http';

export interface ContactPortalArrival {
  seller_vehicle_id: string;
  vehicle_id?: string;
  trader_id?: string;
  vehicle_number?: string;
  arrival_datetime?: string;
}

export interface ContactPortalPurchase {
  purchase_id: string;
  trader_id?: string;
  purchase_date?: string;
  total_amount?: number;
}

export interface ContactPortalStatement {
  document_id: string;
  trader_id?: string;
  type?: string;
  reference_number?: string;
  original_amount?: number;
  outstanding_balance?: number;
  status?: string;
  document_date?: string;
}

function toArrival(raw: any): ContactPortalArrival {
  return {
    seller_vehicle_id: String(raw.sellerVehicleId ?? ''),
    vehicle_id: raw.vehicleId ? String(raw.vehicleId) : undefined,
    trader_id: raw.traderId ? String(raw.traderId) : undefined,
    vehicle_number: raw.vehicleNumber ?? undefined,
    arrival_datetime: raw.arrivalDatetime ?? undefined,
  };
}

function toPurchase(raw: any): ContactPortalPurchase {
  return {
    purchase_id: String(raw.purchaseId ?? ''),
    trader_id: raw.traderId ? String(raw.traderId) : undefined,
    purchase_date: raw.purchaseDate ?? undefined,
    total_amount: typeof raw.totalAmount === 'number' ? raw.totalAmount : undefined,
  };
}

function toStatement(raw: any): ContactPortalStatement {
  return {
    document_id: String(raw.documentId ?? ''),
    trader_id: raw.traderId ? String(raw.traderId) : undefined,
    type: raw.type ?? undefined,
    reference_number: raw.referenceNumber ?? undefined,
    original_amount: typeof raw.originalAmount === 'number' ? raw.originalAmount : undefined,
    outstanding_balance: typeof raw.outstandingBalance === 'number' ? raw.outstandingBalance : undefined,
    status: raw.status ?? undefined,
    document_date: raw.documentDate ?? undefined,
  };
}

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let message = fallback;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
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
    // ignore
  }
  throw new Error(message);
}

export const contactPortalApi = {
  async getArrivals(limit = 20): Promise<ContactPortalArrival[]> {
    const res = await apiFetch(`/portal/arrivals?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
    const data = await parseOrThrow<any[]>(res, 'Failed to load arrivals');
    return (data ?? []).map(toArrival);
  },

  async getPurchases(limit = 20): Promise<ContactPortalPurchase[]> {
    const res = await apiFetch(`/portal/purchases?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
    const data = await parseOrThrow<any[]>(res, 'Failed to load purchases');
    return (data ?? []).map(toPurchase);
  },

  async getStatements(limit = 50): Promise<ContactPortalStatement[]> {
    const res = await apiFetch(`/portal/statements?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
    const data = await parseOrThrow<any[]>(res, 'Failed to load statements');
    return (data ?? []).map(toStatement);
  },

  async getSettlements(limit = 50): Promise<ContactPortalStatement[]> {
    const res = await apiFetch(`/portal/settlements?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
    const data = await parseOrThrow<any[]>(res, 'Failed to load settlements');
    return (data ?? []).map(toStatement);
  },
};

