import { apiFetch } from './http';

const BASE = '/logistics';

export interface DailySerialsResponse {
  sellerSerials: Record<string, number>;
  lotNumbers: Record<string, number>;
}

export interface DailySerialsRequest {
  sellerNames: string[];
  lotIds: string[];
}

export const logisticsApi = {
  /**
   * Get or allocate daily serials for the given seller names and lot ids (REQ-LOG-001, REQ-LOG-002).
   * Returns stable mappings for the current trader and today; persisted on server (no localStorage).
   */
  async allocateDailySerials(request: DailySerialsRequest): Promise<DailySerialsResponse> {
    const res = await apiFetch(`${BASE}/daily-serials`, {
      method: 'POST',
      body: JSON.stringify({
        sellerNames: request.sellerNames ?? [],
        lotIds: request.lotIds ?? [],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to allocate daily serials');
    }
    return res.json();
  },
};
