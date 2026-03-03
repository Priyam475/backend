import { apiFetch } from './http';

const BASE = '/module-writers-pad';

export interface WriterPadSessionDTO {
  id: number;
  lotId: number;
  bidNumber: number;
  buyerMark: string;
  buyerName: string;
  lotName: string;
  totalBags: number;
  weighedBags: number;
  scaleId?: string;
  scaleName?: string;
  startedAt?: string;
  endedAt?: string | null;
}

export interface WriterPadWeightEntryDTO {
  id: number;
  sessionId: number;
  bidNumber: number;
  buyerMark: string;
  rawWeight: number;
  consideredWeight: number;
  scaleId?: string;
  weighedAt: string;
  retaggedFromBid?: number | null;
  deleted?: boolean;
}

export interface WriterPadSessionWithLogDTO {
  session: WriterPadSessionDTO;
  entries: WriterPadWeightEntryDTO[];
  totalEntries: number;
}

async function parseJsonOrThrow(res: Response, defaultMessage: string): Promise<never> {
  let message = defaultMessage;
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json();
      if (body?.message) message = body.message;
      else if (Array.isArray(body?.errors) && body.errors[0]?.message) {
        message = body.errors[0].message;
      }
    } else {
      const text = await res.text();
      if (text && text.length < 300) message = text;
    }
  } catch {
    // ignore
  }
  throw new Error(message);
}

export const writersPadApi = {
  async loadOrCreateSession(params: {
    lotId: number;
    bidNumber: number;
    buyerMark: string;
    buyerName: string;
    lotName: string;
    totalBags: number;
    scaleId?: string;
    scaleName?: string;
  }): Promise<WriterPadSessionDTO> {
    const res = await apiFetch(`${BASE}/sessions/load-or-create`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) await parseJsonOrThrow(res, 'Failed to start Writer\'s Pad session');
    return res.json();
  },

  async attachWeight(sessionId: number, rawWeight: number, consideredWeight: number, scaleId?: string): Promise<WriterPadWeightEntryDTO> {
    const searchParams = new URLSearchParams();
    searchParams.set('rawWeight', String(rawWeight));
    searchParams.set('consideredWeight', String(consideredWeight));
    if (scaleId) searchParams.set('scaleId', scaleId);
    const res = await apiFetch(`${BASE}/sessions/${sessionId}/weights?${searchParams.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) await parseJsonOrThrow(res, 'Failed to attach weight');
    return res.json();
  },

  async retag(entryId: number, targetBidNumber: number): Promise<WriterPadWeightEntryDTO> {
    const searchParams = new URLSearchParams();
    searchParams.set('targetBidNumber', String(targetBidNumber));
    const res = await apiFetch(`${BASE}/weights/${entryId}/retag?${searchParams.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) await parseJsonOrThrow(res, 'Failed to retag weight');
    return res.json();
  },

  async endOfDayCleanup(): Promise<void> {
    const res = await apiFetch(`${BASE}/cleanup/end-of-day`, { method: 'POST' });
    if (!res.ok) await parseJsonOrThrow(res, 'Failed to perform end-of-day cleanup');
  },

  async getSessionWithLog(sessionId: number, params: { page?: number; size?: number } = {}): Promise<WriterPadSessionWithLogDTO | null> {
    const searchParams = new URLSearchParams();
    if (params.page != null) searchParams.set('page', String(params.page));
    if (params.size != null) searchParams.set('size', String(params.size));
    const res = await apiFetch(`${BASE}/sessions/${sessionId}?${searchParams.toString()}`, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) await parseJsonOrThrow(res, 'Failed to load Writer\'s Pad log');
    return res.json();
  },
};

