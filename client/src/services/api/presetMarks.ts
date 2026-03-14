import { apiFetch } from './http';

const BASE = '/trader/preset-marks';

export interface PresetMarkSettingDTO {
  id?: number;
  predefined_mark: string;
  extra_amount: number;
}

export const presetMarksApi = {
  list: async (): Promise<PresetMarkSettingDTO[]> => {
    const res = await apiFetch(BASE, { method: 'GET' });
    if (!res.ok) throw new Error(res.statusText || 'Failed to load preset settings');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  create: async (body: PresetMarkSettingDTO): Promise<PresetMarkSettingDTO> => {
    const res = await apiFetch(BASE, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(res.statusText || 'Failed to create');
    return res.json();
  },

  update: async (id: number, body: PresetMarkSettingDTO): Promise<PresetMarkSettingDTO> => {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(res.statusText || 'Failed to update');
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(res.statusText || 'Failed to delete');
  },
};
