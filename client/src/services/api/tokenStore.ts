// In-memory token storage only. No localStorage, no IndexedDB.
// This avoids persisting JWTs on disk and keeps cookies as the primary auth mechanism.

let traderToken: string | null = null;
let adminToken: string | null = null;
let contactToken: string | null = null;

export function getTraderToken(): string | null {
  return traderToken;
}

export function setTraderToken(token: string | null): void {
  traderToken = token;
}

export function getAdminToken(): string | null {
  return adminToken;
}

export function setAdminToken(token: string | null): void {
  adminToken = token;
}

export function getContactToken(): string | null {
  return contactToken;
}

export function setContactToken(token: string | null): void {
  contactToken = token;
}
