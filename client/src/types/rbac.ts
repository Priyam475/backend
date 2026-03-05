export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermissions;
  created_at: string;
  updated_at: string;
}

export interface ModulePermissions {
  [moduleName: string]: {
    enabled: boolean;
    features: { [featureName: string]: boolean };
  };
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
}

export const AVAILABLE_MODULES: Record<string, string[]> = {
  'Dashboard': ['View Analytics', 'Export Data'],
  'Commodity Settings': ['View', 'Create', 'Edit', 'Delete'],
  'Contacts': ['View', 'Create', 'Edit', 'Delete', 'Import', 'Export'],
  'Arrivals': ['View', 'Create', 'Edit', 'Delete'],
  'Auctions': ['View', 'Create', 'Edit', 'Delete', 'Approve'],
  'Weighing': ['View', 'Create', 'Edit'],
  "Writer's Pad": ['View', 'Create', 'Edit'],
  'Logistics': ['View', 'Create', 'Edit', 'Delete'],
  // Print Hub (Print Logs) is the operational module behind Logistics.
  'Print Hub': ['View', 'Create', 'Edit', 'Delete'],
  'Self-Sale': ['View', 'Create', 'Edit'],
  'Stock Purchase': ['View', 'Create', 'Edit'],
  'CDN': ['View', 'Create', 'Edit', 'Delete'],
  'Settlement': ['View', 'Create', 'Edit', 'Approve'],
  'Billing': ['View', 'Create', 'Edit', 'Delete', 'Print'],
  'Accounting': ['View', 'Create', 'Edit'],
  'Vouchers': ['View', 'Create', 'Edit', 'Delete', 'Approve'],
  'Financial Reports': ['View', 'Export'],
  'Print Templates': ['View', 'Create', 'Edit'],
  'Reports': ['View', 'Export'],
  'Settings': ['View', 'Manage Roles', 'Manage Users'],
};
