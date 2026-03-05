import type { Role as RbacRole, Profile as RbacProfile, UserRole, ModulePermissions } from '@/types/rbac';
import { apiFetch } from './http';
import {
  adminModulePermissionsToAuthorities,
  authoritiesToAdminModulePermissions,
} from '@/admin/lib/adminPermissions';

type AdminRoleDTO = {
  id?: number;
  name?: string;
  description?: string | null;
  authorities?: string[] | null;
};

type AdminRbacUserDTO = {
  id?: number;
  login?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string | null;
  activated?: boolean;
  roles?: number[];
};

type TraderRoleDTO = {
  id?: number;
  roleName?: string;
  description?: string | null;
  createdAt?: string | null;
  modulePermissions?: {
    [moduleName: string]: {
      enabled?: boolean | null;
      features?: Record<string, boolean> | null;
    } | null;
  } | null;
};

function mapAdminRoleDtoToRole(dto: AdminRoleDTO): RbacRole {
  const permissions = authoritiesToAdminModulePermissions(dto.authorities ?? []);

  return {
    id: dto.id != null ? String(dto.id) : '',
    name: dto.name ?? '',
    description: dto.description ?? '',
    permissions: permissions as RbacRole['permissions'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapAdminRbacUserToProfile(dto: AdminRbacUserDTO): RbacProfile {
  const fullName =
    [dto.firstName, dto.lastName].filter(Boolean).join(' ') ||
    dto.login ||
    dto.email ||
    '';

  return {
    id: String(dto.id ?? ''),
    user_id: String(dto.id ?? ''),
    full_name: fullName,
    email: dto.email ?? dto.login ?? '',
    mobile: dto.mobile ?? null,
    status: dto.activated ? 'active' : 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mapRoleDtoToRole(dto: TraderRoleDTO): RbacRole {
  const perms: ModulePermissions = {};
  const modulePermissions = dto.modulePermissions ?? {};

  Object.entries(modulePermissions).forEach(([mod, entry]) => {
    const enabled = !!entry?.enabled;
    const features = entry?.features ?? {};
    perms[mod] = {
      enabled,
      features: { ...features },
    };
  });

  return {
    id: dto.id != null ? String(dto.id) : '',
    name: dto.roleName ?? '',
    description: dto.description ?? '',
    permissions: perms,
    created_at: dto.createdAt ?? new Date().toISOString(),
    updated_at: dto.createdAt ?? new Date().toISOString(),
  };
}

async function handleRes<T>(res: Response, msg: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let detail = msg;
  if (res.status === 401 || res.status === 403) {
    detail = "You don't have permission to perform this action.";
  }
  try {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await res.json() as { detail?: string; message?: string };
      if (typeof j.detail === 'string') detail = j.detail;
      else if (typeof j.message === 'string') detail = j.message;
    }
  } catch {
    // ignore
  }
  throw new Error(detail);
}

export const rbacApi = {
  async listRoles(): Promise<RbacRole[]> {
    const res = await apiFetch('/admin/rbac/roles', { method: 'GET' });
    const data = await handleRes<AdminRoleDTO[]>(res, 'Failed to load roles');
    return Array.isArray(data) ? data.map(mapAdminRoleDtoToRole) : [];
  },

  async createRole(data: { name: string; description: string; permissions: RbacRole['permissions'] }): Promise<RbacRole> {
    const authorities = adminModulePermissionsToAuthorities(data.permissions);

    const res = await apiFetch('/admin/rbac/roles', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, description: data.description, authorities }),
    });
    const dto = await handleRes<AdminRoleDTO>(res, 'Failed to create role');
    return mapAdminRoleDtoToRole(dto);
  },

  async updateRole(
    roleId: string,
    data: { name: string; description: string; permissions: RbacRole['permissions'] },
  ): Promise<RbacRole> {
    const authorities = adminModulePermissionsToAuthorities(data.permissions);

    const res = await apiFetch(`/admin/rbac/roles/${encodeURIComponent(roleId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: Number(roleId),
        name: data.name,
        description: data.description,
        authorities,
      }),
    });
    const dto = await handleRes<AdminRoleDTO>(res, 'Failed to update role');
    return mapAdminRoleDtoToRole(dto);
  },

  async deleteRole(roleId: string): Promise<void> {
    const res = await apiFetch(`/admin/rbac/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' });
    if (!res.ok) await handleRes<unknown>(res, 'Failed to delete role');
  },

  async listProfiles(): Promise<RbacProfile[]> {
    try {
      const res = await apiFetch('/admin/rbac/users', { method: 'GET' });
      const data = await handleRes<AdminRbacUserDTO[]>(res, 'Failed to load users');
      const users: AdminRbacUserDTO[] = Array.isArray(data) ? data : [];
      return users.map(mapAdminRbacUserToProfile);
    } catch {
      return [];
    }
  },

  async createProfile(data: { full_name: string; email: string; mobile?: string | null; password?: string }): Promise<RbacProfile> {
    const [first, ...rest] = (data.full_name || '').trim().split(/\s+/);
    const res = await apiFetch('/admin/rbac/users', {
      method: 'POST',
      body: JSON.stringify({
        login: data.email?.split('@')[0] ?? data.email,
        firstName: first ?? '',
        lastName: rest.join(' ') ?? '',
        email: data.email,
        password: data.password,
        activated: true,
      }),
    });
    const u = await handleRes<{ id?: number; login?: string; firstName?: string; lastName?: string; email?: string; activated?: boolean }>(res, 'Failed to create user');
    return {
      id: String(u.id ?? ''),
      user_id: String(u.id ?? ''),
      full_name: data.full_name,
      email: data.email,
      mobile: data.mobile,
      status: u.activated ? 'active' : 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async updateProfile(profileId: string, data: { full_name?: string; email?: string; mobile?: string | null }): Promise<RbacProfile> {
    const [first, ...rest] = (data.full_name ?? '').trim().split(/\s+/);
    const res = await apiFetch(`/admin/rbac/users/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        firstName: first ?? '',
        lastName: rest.join(' ') ?? '',
        email: data.email,
        mobile: data.mobile != null ? (data.mobile.trim() || null) : undefined,
      }),
    });
    const u = await handleRes<AdminRbacUserDTO>(res, 'Failed to update user');
    return {
      id: String(u.id ?? profileId),
      user_id: String(u.id ?? profileId),
      full_name: ([u.firstName, u.lastName].filter(Boolean).join(' ') || u.login) ?? '',
      email: u.email ?? '',
      mobile: u.mobile ?? null,
      status: u.activated ? 'active' : 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async setProfileStatus(profileId: string, _status: 'active' | 'inactive'): Promise<void> {
    await apiFetch(`/admin/rbac/users/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify({ activated: _status === 'active' }),
    });
  },

  async listUserRoles(): Promise<UserRole[]> {
    const res = await apiFetch('/admin/rbac/users', { method: 'GET' });
    const data = await handleRes<AdminRbacUserDTO[]>(res, 'Failed to load user roles');
    if (!Array.isArray(data)) return [];

    const out: UserRole[] = [];
    for (const u of data) {
      const uid = String(u.id ?? '');
      const roleIds = u.roles ?? [];
      for (const rid of roleIds) {
        out.push({
          id: `${uid}-${rid}`,
          user_id: uid,
          role_id: String(rid),
          assigned_by: null,
          created_at: new Date().toISOString(),
        });
      }
    }
    return out;
  },

  async setUserRoles(profileId: string, roleIds: string[]): Promise<void> {
    const numericIds = roleIds.map((r) => Number(r)).filter((n) => !Number.isNaN(n));
    await apiFetch(`/admin/rbac/users/${encodeURIComponent(profileId)}/roles`, {
      method: 'PUT',
      body: JSON.stringify(numericIds),
    });
  },
};

// --- Trader-scoped RBAC (Settings when user has a trader: only that trader's roles and staff) ---

type TraderRbacUserVM = {
  id?: number;
  login?: string;
  email?: string;
  fullName?: string;
  activated?: boolean;
  roleInTrader?: string;
  roleIds?: number[];
};

function traderUserToProfile(u: TraderRbacUserVM): RbacProfile {
  return {
    id: String(u.id ?? ''),
    user_id: String(u.id ?? ''),
    full_name: u.fullName ?? u.login ?? '',
    email: u.email ?? '',
    mobile: null,
    status: u.activated ? 'active' : 'inactive',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Trader-scoped RBAC surface for module roles and staff management.
 *
 * Use this when the current user has a trader (e.g. from useAuth().trader).
 * All methods hit {@code /api/trader/rbac/*} so each trader sees only their
 * own roles and staff; this client never talks to {@code /api/roles}.
 */
export const traderRbacApi = {
  async listRoles(): Promise<RbacRole[]> {
    const res = await apiFetch('/trader/rbac/roles', { method: 'GET' });
    const data = await handleRes<any[]>(res, 'Failed to load roles');
    // Trader role DTO → Role mapping is implemented elsewhere; keep behaviour but
    // avoid relying on an untyped helper here.
    return Array.isArray(data) ? (data as any) : [];
  },

  async listProfiles(): Promise<RbacProfile[]> {
    const res = await apiFetch('/trader/rbac/users', { method: 'GET' });
    const data = await handleRes<TraderRbacUserVM[]>(res, 'Failed to load users');
    if (!Array.isArray(data)) return [];
    return data.map(traderUserToProfile);
  },

  async listUserRoles(): Promise<UserRole[]> {
    const res = await apiFetch('/trader/rbac/users', { method: 'GET' });
    const users = await handleRes<TraderRbacUserVM[]>(res, 'Failed to load users');
    if (!Array.isArray(users)) return [];
    const out: UserRole[] = [];
    for (const u of users) {
      const uid = String(u.id ?? '');
      const roleIds = u.roleIds ?? [];
      for (const rid of roleIds) {
        out.push({
          id: `${uid}-${rid}`,
          user_id: uid,
          role_id: String(rid),
          assigned_by: null,
          created_at: new Date().toISOString(),
        });
      }
    }
    return out;
  },

  async setUserRoles(profileId: string, roleIds: string[]): Promise<void> {
    const numericIds = roleIds.map((r) => Number(r)).filter((n) => !Number.isNaN(n));
    await apiFetch(`/trader/rbac/users/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds: numericIds }),
    });
  },

  async createProfile(data: {
    full_name: string;
    email: string;
    mobile?: string | null;
    password: string;
    roleInTrader?: string;
  }): Promise<RbacProfile> {
    const res = await apiFetch('/trader/rbac/users', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.full_name,
        email: data.email,
        password: data.password,
        roleInTrader: data.roleInTrader ?? 'STAFF',
        activated: true,
      }),
    });
    const u = await handleRes<TraderRbacUserVM>(res, 'Failed to create user');
    return traderUserToProfile(u);
  },

  async updateProfile(
    profileId: string,
    data: { full_name?: string; email?: string; mobile?: string | null }
  ): Promise<RbacProfile> {
    const res = await apiFetch(`/trader/rbac/users/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        fullName: data.full_name,
        email: data.email,
      }),
    });
    const u = await handleRes<TraderRbacUserVM>(res, 'Failed to update user');
    return traderUserToProfile(u);
  },

  async setProfileStatus(profileId: string, status: 'active' | 'inactive'): Promise<void> {
    await apiFetch(`/trader/rbac/users/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      body: JSON.stringify({ activated: status === 'active' }),
    });
  },

  // Trader RBAC uses dedicated /api/trader/rbac/roles CRUD endpoints; it does not call /api/roles.
  async createRole(data: {
    name: string;
    description: string;
    permissions: RbacRole['permissions'];
  }): Promise<RbacRole> {
    const res = await apiFetch('/trader/rbac/roles', {
      method: 'POST',
      body: JSON.stringify({
        roleName: data.name,
        description: data.description,
        modulePermissions: data.permissions,
      }),
    });
    const dto = await handleRes<any>(res, 'Failed to create role');
    return dto as RbacRole;
  },

  async updateRole(
    roleId: string,
    data: { name: string; description: string; permissions: RbacRole['permissions'] }
  ): Promise<RbacRole> {
    const res = await apiFetch(`/trader/rbac/roles/${encodeURIComponent(roleId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: Number(roleId),
        roleName: data.name,
        description: data.description,
        modulePermissions: data.permissions,
      }),
    });
    const dto = await handleRes<any>(res, 'Failed to update role');
    return dto as RbacRole;
  },

  async deleteRole(roleId: string): Promise<void> {
    const res = await apiFetch(`/trader/rbac/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' });
    if (!res.ok) await handleRes<unknown>(res, 'Failed to delete role');
  },
};
