import { API_BASE } from './http';

export const traderApi = {
  async uploadPhotos(traderId: string, files: File[]): Promise<string[]> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));

    const res = await fetch(`${API_BASE}/traders/${traderId}/photos`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      throw new Error('Failed to upload photos');
    }
    return res.json();
  },
};

