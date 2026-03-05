/** Seven admin modules (1:1 with sidebar). No merging. */
export const ADMIN_AVAILABLE_MODULES: Record<string, string[]> = {
  Dashboard: ['View'],
  Traders: ['View', 'Approve'],
  Categories: ['View', 'Create', 'Edit', 'Delete'],
  Commodities: ['View'],
  Contacts: ['View'],
  Reports: ['View'],
  Settings: ['View', 'Manage RBAC'],
};

export type AdminModuleKey = keyof typeof ADMIN_AVAILABLE_MODULES;
