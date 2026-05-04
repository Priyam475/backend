import {
  getAdminToken,
  getContactToken,
  getTraderToken,
  setAdminToken,
  setContactToken,
  setTraderToken,
} from './tokenStore';

const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
/** Empty in dev → same-origin `/api` (Vite proxy → Spring). Set VITE_API_URL for production or mobile webviews. */
const RAW_API_URL =
  envApiUrl != null && String(envApiUrl).trim() !== ''
    ? String(envApiUrl).trim()
    : import.meta.env.DEV
      ? ''
      : 'http://localhost:8080';

const trimmedBase = RAW_API_URL.replace(/\/+$/, '');

function devOriginFallback(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8080';
}

// Server origin (no path) — use for building authenticated image URLs.
export const API_ORIGIN =
  trimmedBase === ''
    ? devOriginFallback()
    : trimmedBase.replace(/\/api\/?$/, '') || trimmedBase;

// Always talk to the backend under the /api prefix, regardless of whether
// VITE_API_URL includes it or not.
export const API_BASE =
  trimmedBase === ''
    ? '/api'
    : trimmedBase.endsWith('/api')
      ? trimmedBase
      : `${trimmedBase}/api`;

type TokenKind = 'trader' | 'admin' | 'contact';

function resolveTokenKind(path: string): TokenKind {
  if (path.startsWith('/admin/')) {
    return 'admin';
  }
  if (path.startsWith('/portal/')) {
    return 'contact';
  }
  // Default: trader app + shared endpoints
  return 'trader';
}

function getTokenForKind(kind: TokenKind): string | null {
  switch (kind) {
    case 'admin':
      return getAdminToken();
    case 'contact':
      return getContactToken();
    default:
      return getTraderToken();
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method ?? 'GET').toUpperCase();
  const isReadRequest = method === 'GET' || method === 'HEAD';

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT for native/webviews where cookies may be unreliable.
  const kind = resolveTokenKind(path);
  const token = getTokenForKind(kind);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Always revalidate read requests to keep cross-module data fresh after sidebar navigation.
  if (isReadRequest) {
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-cache');
    if (!headers.has('Pragma')) headers.set('Pragma', 'no-cache');
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: isReadRequest ? 'no-store' : init.cache,
    credentials: 'include',
  });
}

export function captureAuthTokenFromResponse(res: Response, kind: TokenKind): void {
  const authHeader =
    res.headers.get('authorization') ?? res.headers.get('Authorization');
  if (!authHeader) return;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return;
  const rawToken = match[1].trim();
  if (!rawToken) return;

  switch (kind) {
    case 'admin':
      setAdminToken(rawToken);
      break;
    case 'contact':
      setContactToken(rawToken);
      break;
    default:
      setTraderToken(rawToken);
      break;
  }
}
