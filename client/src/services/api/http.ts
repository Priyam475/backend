import type { AuthState } from '@/types/models';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

function getAuthToken(): string | null {
  const saved = localStorage.getItem('mkt_auth');
  if (!saved) {
    return null;
  }
  try {
    const auth = JSON.parse(saved) as AuthState;
    return auth.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}

