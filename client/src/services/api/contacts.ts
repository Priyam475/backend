import type { Contact, ContactType } from '@/types/models';
import { apiFetch } from './http';

type ContactDto = {
  id?: string | number;
  traderId?: string | number | null;
  trader_id?: string | number | null;
  contact_id?: string | number;
  name?: string;
  phone?: string;
  mark?: string;
  address?: string;
  createdAt?: string;
  created_at?: string;
  openingBalance?: number;
  opening_balance?: number;
  currentBalance?: number;
  current_balance?: number;
  type?: ContactType;
  email?: string;
  canLogin?: boolean;
  can_login?: boolean;
};

function mapDtoToContact(dto: ContactDto): Contact {
  const contactId = dto.contact_id ?? dto.id;
  const traderId = dto.trader_id ?? dto.traderId ?? '';

  return {
    contact_id: String(contactId ?? ''),
    trader_id: String(traderId ?? ''),
    name: dto.name ?? '',
    phone: dto.phone ?? '',
    mark: dto.mark ?? '',
    address: dto.address ?? '',
    created_at: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    type: dto.type,
    opening_balance: dto.opening_balance ?? dto.openingBalance ?? 0,
    current_balance: dto.current_balance ?? dto.currentBalance ?? 0,
    email: dto.email,
    can_login: dto.can_login ?? dto.canLogin,
  };
}

function mapContactToCreatePayload(data: Partial<Contact>): Record<string, unknown> {
  return {
    name: data.name?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    mark: data.mark?.trim() ?? '',
    address: data.address?.trim() ?? '',
    traderId: data.trader_id && data.trader_id.length > 0 ? data.trader_id : undefined,
    type: data.type ?? undefined,
  };
}

function mapContactToUpdatePayload(id: string, data: Partial<Contact>): Record<string, unknown> {
  return {
    id,
    name: data.name?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    mark: data.mark?.trim() ?? '',
    address: data.address?.trim() ?? '',
    type: data.type ?? undefined,
  };
}

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  let message = defaultMessage;
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
    // ignore parse errors and keep default message
  }
  throw new Error(message);
}

export const contactApi = {
  async list(): Promise<Contact[]> {
    const res = await apiFetch('/contacts', {
      method: 'GET',
    });
    const data = await handleResponse<ContactDto[]>(res, 'Failed to load contacts');
    return data.map(mapDtoToContact);
  },

  async adminList(): Promise<Contact[]> {
    const res = await apiFetch('/admin/contacts', {
      method: 'GET',
    });
    const data = await handleResponse<ContactDto[]>(res, 'Failed to load contacts');
    return data.map(mapDtoToContact);
  },

  async create(data: Partial<Contact>): Promise<Contact> {
    const res = await apiFetch('/contacts', {
      method: 'POST',
      body: JSON.stringify(mapContactToCreatePayload(data)),
    });
    const created = await handleResponse<ContactDto>(res, 'Failed to register contact');
    return mapDtoToContact(created);
  },

  async update(itemId: string, data: Partial<Contact>): Promise<Contact> {
    const res = await apiFetch(`/contacts/${encodeURIComponent(itemId)}`, {
      method: 'PUT',
      body: JSON.stringify(mapContactToUpdatePayload(itemId, data)),
    });
    const updated = await handleResponse<ContactDto>(res, 'Failed to update contact');
    return mapDtoToContact(updated);
  },

  async remove(itemId: string): Promise<void> {
    const res = await apiFetch(`/contacts/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleResponse<unknown>(res, 'Failed to delete contact');
    }
  },

  async search(mark: string): Promise<Contact[]> {
    const trimmed = mark.trim();
    if (!trimmed) {
      return this.list();
    }
    const params = new URLSearchParams({ mark: trimmed });
    const res = await apiFetch(`/contacts/search?${params.toString()}`, {
      method: 'GET',
    });
    const data = await handleResponse<ContactDto[]>(res, 'Failed to search contacts');
    return data.map(mapDtoToContact);
  },
};

