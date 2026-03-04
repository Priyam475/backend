import type { Trader, User } from '@/types/models';
import { apiFetch } from './http';

export const authApi = {
  async register(data: {
    business_name: string;
    owner_name: string;
    mobile: string;
    email: string;
    password: string;
    address: string;
    city: string;
    state: string;
    pin_code: string;
    category: string;
    gst_number?: string;
    rmc_apmc_code?: string;
    shop_photos?: string[];
  }): Promise<{ trader: Trader; user: User }> {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      let message = 'Registration failed. Please try again.';
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const problem = await res.json();
          if (typeof problem.detail === 'string' && problem.detail.includes('login already used')) {
            message = 'Email is already registered';
          } else if (typeof problem.detail === 'string' && problem.detail.includes('email address already used')) {
            message = 'Email is already registered';
          } else if (typeof problem.detail === 'string' && problem.detail.includes('Password must be at least 6 characters')) {
            message = 'Password must be at least 6 characters';
          } else if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
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

    const dataRes = await res.json();

    const user: User = {
      user_id: dataRes.user.user_id,
      trader_id: dataRes.user.trader_id,
      username: dataRes.user.username,
      is_active: dataRes.user.is_active,
      created_at: dataRes.user.created_at ?? new Date().toISOString(),
      name: dataRes.user.name,
      role: dataRes.user.role,
    };

    const trader: Trader = {
      trader_id: dataRes.trader.trader_id,
      business_name: dataRes.trader.business_name,
      owner_name: dataRes.trader.owner_name,
      address: dataRes.trader.address ?? '',
      category: dataRes.trader.category ?? '',
      approval_status: dataRes.trader.approval_status ?? 'PENDING',
      bill_prefix: dataRes.trader.bill_prefix ?? '',
      created_at: dataRes.trader.created_at ?? new Date().toISOString(),
      updated_at: dataRes.trader.updated_at ?? new Date().toISOString(),
      mobile: dataRes.trader.mobile ?? data.mobile,
      email: dataRes.trader.email ?? data.email,
      city: dataRes.trader.city ?? data.city,
      state: dataRes.trader.state ?? data.state,
      pin_code: dataRes.trader.pin_code ?? data.pin_code,
      gst_number: dataRes.trader.gst_number ?? data.gst_number,
      rmc_apmc_code: dataRes.trader.rmc_apmc_code ?? data.rmc_apmc_code,
      shop_photos: dataRes.trader.shop_photos ?? data.shop_photos ?? [],
    };

    return { trader, user };
  },

  async login(email: string, password: string): Promise<{ trader: Trader; user: User }> {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password }),
    });

    if (!res.ok) {
      let message = 'Login failed. Please try again.';
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const problem = await res.json();
          if (typeof problem.detail === 'string' && problem.detail.includes('Invalid email or password')) {
            message = 'Invalid email or password';
          } else if (typeof problem.detail === 'string' && problem.detail.includes('Password must be at least 6 characters')) {
            message = 'Password must be at least 6 characters';
          } else if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
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

    const data = await res.json();

    const user: User = {
      user_id: data.user.user_id,
      trader_id: data.user.trader_id,
      username: data.user.username,
      is_active: data.user.is_active,
      created_at: data.user.created_at ?? new Date().toISOString(),
      name: data.user.name,
      role: data.user.role,
    };

    const trader: Trader = {
      trader_id: data.trader.trader_id,
      business_name: data.trader.business_name,
      owner_name: data.trader.owner_name,
      address: data.trader.address ?? '',
      category: data.trader.category ?? '',
      approval_status: data.trader.approval_status ?? 'PENDING',
      bill_prefix: data.trader.bill_prefix ?? '',
      created_at: data.trader.created_at ?? new Date().toISOString(),
      updated_at: data.trader.updated_at ?? new Date().toISOString(),
      mobile: data.trader.mobile,
      email: data.trader.email,
      city: data.trader.city,
      state: data.trader.state,
      pin_code: data.trader.pin_code,
      gst_number: data.trader.gst_number,
      rmc_apmc_code: data.trader.rmc_apmc_code,
      shop_photos: data.trader.shop_photos ?? [],
    };

    return { trader, user };
  },

  async getProfile(): Promise<{ trader: Trader; user: User } | null> {
    const res = await apiFetch('/auth/me', {
      method: 'GET',
    });

    if (res.status === 401) {
      return null;
    }

    if (!res.ok) {
      throw new Error('Failed to load profile');
    }

    const data = await res.json();

    const user: User = {
      user_id: data.user.user_id,
      trader_id: data.user.trader_id,
      username: data.user.username,
      is_active: data.user.is_active,
      created_at: data.user.created_at ?? new Date().toISOString(),
      name: data.user.name,
      role: data.user.role,
    };

    const trader: Trader = {
      trader_id: data.trader.trader_id,
      business_name: data.trader.business_name,
      owner_name: data.trader.owner_name,
      address: data.trader.address ?? '',
      category: data.trader.category ?? '',
      approval_status: data.trader.approval_status ?? 'PENDING',
      bill_prefix: data.trader.bill_prefix ?? '',
      created_at: data.trader.created_at ?? new Date().toISOString(),
      updated_at: data.trader.updated_at ?? new Date().toISOString(),
      mobile: data.trader.mobile,
      email: data.trader.email,
      city: data.trader.city,
      state: data.trader.state,
      pin_code: data.trader.pin_code,
      gst_number: data.trader.gst_number,
      rmc_apmc_code: data.trader.rmc_apmc_code,
      shop_photos: data.trader.shop_photos ?? [],
    };

    return { trader, user };
  },

  async requestOtp(mobile: string): Promise<void> {
    const res = await apiFetch('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });

    if (!res.ok) {
      let message = 'Failed to send OTP. Please try again.';
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
  },

  async verifyOtp(mobile: string, otp: string): Promise<{ trader: Trader; user: User }> {
    const res = await apiFetch('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });

    if (!res.ok) {
      let message = 'OTP verification failed. Please try again.';
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

    const data = await res.json();

    const user: User = {
      user_id: data.user.user_id,
      trader_id: data.user.trader_id,
      username: data.user.username,
      is_active: data.user.is_active,
      created_at: data.user.created_at ?? new Date().toISOString(),
      name: data.user.name,
      role: data.user.role,
    };

    const trader: Trader = {
      trader_id: data.trader.trader_id,
      business_name: data.trader.business_name,
      owner_name: data.trader.owner_name,
      address: data.trader.address ?? '',
      category: data.trader.category ?? '',
      approval_status: data.trader.approval_status ?? 'PENDING',
      bill_prefix: data.trader.bill_prefix ?? '',
      created_at: data.trader.created_at ?? new Date().toISOString(),
      updated_at: data.trader.updated_at ?? new Date().toISOString(),
      mobile: data.trader.mobile,
      email: data.trader.email,
      city: data.trader.city,
      state: data.trader.state,
      pin_code: data.trader.pin_code,
      gst_number: data.trader.gst_number,
      rmc_apmc_code: data.trader.rmc_apmc_code,
      shop_photos: data.trader.shop_photos ?? [],
    };

    return { trader, user };
  },
};
