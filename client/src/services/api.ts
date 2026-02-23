// ============================================================
// Mercotrace — Mock API Service Layer (localStorage-backed)
// Mirrors the RESTful API spec for seamless backend swap
// ============================================================

import type {
  Trader, User, Commodity, Contact, Vehicle,
  DynamicCharge, Voucher, BusinessCategory, AuthState
} from '@/types/models';

// ── Helpers ────────────────────────────────────────────────

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Auth Module ────────────────────────────────────────────

export const authApi = {
  async register(data: {
    business_name: string; owner_name: string; mobile: string; email: string;
    password: string; address: string; city: string; state: string;
    pin_code: string; category: string;
  }): Promise<{ trader: Trader; user: User; token: string }> {
    await delay();
    const traderId = id();
    const userId = id();

    const trader: Trader = {
      trader_id: traderId,
      business_name: data.business_name,
      owner_name: data.owner_name,
      mobile: data.mobile,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      pin_code: data.pin_code,
      category: data.category,
      approval_status: 'PENDING',
      bill_prefix: '',
      shop_photos: [],
      created_at: now(),
      updated_at: now(),
    };

    const user: User = {
      user_id: userId,
      trader_id: traderId,
      username: data.email,
      name: data.owner_name,
      role: 'TRADER',
      is_active: true,
      created_at: now(),
    };

    const token = btoa(JSON.stringify({ userId, traderId, role: 'TRADER' }));

    const traders = getStore<Trader>('mkt_traders');
    traders.push(trader);
    setStore('mkt_traders', traders);

    const users = getStore<any>('mkt_users');
    users.push({ ...user, password: data.password });
    setStore('mkt_users', users);

    return { trader, user, token };
  },

  async login(email: string, password: string): Promise<{ trader: Trader; user: User; token: string }> {
    await delay();
    const users = getStore<any>('mkt_users');
    const found = users.find((u: any) => (u.username === email || u.email === email) && u.password === password);
    if (!found) throw new Error('Invalid email or password');

    const traders = getStore<Trader>('mkt_traders');
    const trader = traders.find(t => t.trader_id === found.trader_id);
    if (!trader) throw new Error('Trader account not found');

    const token = btoa(JSON.stringify({ userId: found.user_id, traderId: found.trader_id, role: found.role }));
    const { password: _, ...user } = found;
    return { trader, user, token };
  },

  async getProfile(): Promise<{ trader: Trader; user: User } | null> {
    const saved = localStorage.getItem('mkt_auth');
    if (!saved) return null;
    const auth: AuthState = JSON.parse(saved);
    if (!auth.user || !auth.trader) return null;
    return { trader: auth.trader, user: auth.user };
  },
};

// ── Commodity Module ───────────────────────────────────────

export const commodityApi = {
  async list(): Promise<Commodity[]> {
    await delay(150);
    return getStore<Commodity>('mkt_commodities');
  },
  async create(data: Partial<Commodity>): Promise<Commodity> {
    await delay();
    const item: Commodity = { ...data, commodity_id: id(), created_at: now() } as Commodity;
    const list = getStore<Commodity>('mkt_commodities');
    list.push(item);
    setStore('mkt_commodities', list);
    return item;
  },
  async update(itemId: string, data: Partial<Commodity>): Promise<Commodity> {
    await delay();
    const list = getStore<Commodity>('mkt_commodities');
    const idx = list.findIndex(c => c.commodity_id === itemId);
    if (idx === -1) throw new Error('Commodity not found');
    list[idx] = { ...list[idx], ...data };
    setStore('mkt_commodities', list);
    return list[idx];
  },
  async remove(itemId: string): Promise<void> {
    await delay();
    const list = getStore<Commodity>('mkt_commodities').filter(c => c.commodity_id !== itemId);
    setStore('mkt_commodities', list);
  },
};

// ── Contact Module ─────────────────────────────────────────

export const contactApi = {
  async list(): Promise<Contact[]> {
    await delay(150);
    return getStore<Contact>('mkt_contacts');
  },
  async create(data: Partial<Contact>): Promise<Contact> {
    await delay();
    const item: Contact = { ...data, contact_id: id(), created_at: now(), opening_balance: 0, current_balance: 0 } as Contact;
    const list = getStore<Contact>('mkt_contacts');
    list.push(item);
    setStore('mkt_contacts', list);
    return item;
  },
  async update(itemId: string, data: Partial<Contact>): Promise<Contact> {
    await delay();
    const list = getStore<Contact>('mkt_contacts');
    const idx = list.findIndex(c => c.contact_id === itemId);
    if (idx === -1) throw new Error('Contact not found');
    list[idx] = { ...list[idx], ...data };
    setStore('mkt_contacts', list);
    return list[idx];
  },
  async search(mark: string): Promise<Contact[]> {
    await delay(100);
    return getStore<Contact>('mkt_contacts').filter(c => c.mark?.toLowerCase().includes(mark.toLowerCase()));
  },
};

// ── Vehicle / Arrivals Module ──────────────────────────────

export const vehicleApi = {
  async list(): Promise<Vehicle[]> {
    await delay(150);
    return getStore<Vehicle>('mkt_vehicles');
  },
  async create(data: Partial<Vehicle>): Promise<Vehicle> {
    await delay();
    const item: Vehicle = { ...data, vehicle_id: id(), created_at: now() } as Vehicle;
    const list = getStore<Vehicle>('mkt_vehicles');
    list.push(item);
    setStore('mkt_vehicles', list);
    return item;
  },
};

// ── Categories ─────────────────────────────────────────────

export const categoryApi = {
  async list(): Promise<BusinessCategory[]> {
    await delay(100);
    return getStore<BusinessCategory>('mkt_categories');
  },
};
