import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AVAILABLE_MODULES } from '@/types/rbac';

type ModuleKey = keyof typeof AVAILABLE_MODULES;

type FeatureMap = Record<string, string>;
type ModuleFeatureAuthorityMap = Record<string, FeatureMap>;

const normalize = (value: string) => value.trim().toLowerCase();

// Keep this mapping structurally in sync with
// RbacAuthorityService.buildModuleFeatureToAuthorityMap on the backend.
const MODULE_FEATURE_TO_AUTHORITY: ModuleFeatureAuthorityMap = {
  [normalize('Commodity Settings')]: {
    view: 'ROLE_COMMODITY_SETTINGS_VIEW',
    create: 'ROLE_COMMODITY_SETTINGS_CREATE',
    edit: 'ROLE_COMMODITY_SETTINGS_EDIT',
    delete: 'ROLE_COMMODITY_SETTINGS_DELETE',
    approve: 'ROLE_COMMODITY_SETTINGS_APPROVE',
  },
  [normalize('Contacts')]: {
    view: 'ROLE_CONTACTS_VIEW',
    export: 'ROLE_CONTACTS_VIEW',
    create: 'ROLE_CONTACTS_CREATE',
    import: 'ROLE_CONTACTS_CREATE',
    edit: 'ROLE_CONTACTS_EDIT',
    delete: 'ROLE_CONTACTS_DELETE',
  },
  [normalize('Arrivals')]: {
    view: 'ROLE_ARRIVALS_VIEW',
    create: 'ROLE_ARRIVALS_CREATE',
    edit: 'ROLE_ARRIVALS_EDIT',
    delete: 'ROLE_ARRIVALS_DELETE',
    approve: 'ROLE_ARRIVALS_APPROVE',
  },
  [normalize('Auctions')]: {
    view: 'ROLE_AUCTIONS_VIEW',
    create: 'ROLE_AUCTIONS_CREATE',
    edit: 'ROLE_AUCTIONS_EDIT',
    delete: 'ROLE_AUCTIONS_DELETE',
    approve: 'ROLE_AUCTIONS_APPROVE',
  },
  [normalize('Weighing')]: {
    view: 'ROLE_WEIGHING_VIEW',
    create: 'ROLE_WEIGHING_CREATE',
    edit: 'ROLE_WEIGHING_EDIT',
    delete: 'ROLE_WEIGHING_DELETE',
  },
  [normalize("Writer's Pad")]: {
    view: 'ROLE_WRITERS_PAD_VIEW',
    create: 'ROLE_WRITERS_PAD_CREATE',
    edit: 'ROLE_WRITERS_PAD_EDIT',
    delete: 'ROLE_WRITERS_PAD_DELETE',
  },
  [normalize('Self-Sale')]: {
    view: 'ROLE_SELF_SALE_VIEW',
    create: 'ROLE_SELF_SALE_CREATE',
    edit: 'ROLE_SELF_SALE_EDIT',
    delete: 'ROLE_SELF_SALE_DELETE',
    approve: 'ROLE_SELF_SALE_APPROVE',
  },
  [normalize('Stock Purchase')]: {
    view: 'ROLE_STOCK_PURCHASE_VIEW',
    create: 'ROLE_STOCK_PURCHASE_CREATE',
    edit: 'ROLE_STOCK_PURCHASE_EDIT',
    delete: 'ROLE_STOCK_PURCHASE_DELETE',
    approve: 'ROLE_STOCK_PURCHASE_APPROVE',
  },
  [normalize('CDN')]: {
    view: 'ROLE_CDN_VIEW',
    create: 'ROLE_CDN_CREATE',
    edit: 'ROLE_CDN_EDIT',
    delete: 'ROLE_CDN_DELETE',
    approve: 'ROLE_CDN_APPROVE',
  },
  // Accounting UI module → Chart of Accounts authorities.
  [normalize('Accounting')]: {
    view: 'ROLE_CHART_OF_ACCOUNTS_VIEW',
    create: 'ROLE_CHART_OF_ACCOUNTS_CREATE',
    edit: 'ROLE_CHART_OF_ACCOUNTS_EDIT',
    delete: 'ROLE_CHART_OF_ACCOUNTS_DELETE',
    approve: 'ROLE_CHART_OF_ACCOUNTS_APPROVE',
  },
  [normalize('Vouchers')]: {
    view: 'ROLE_VOUCHERS_VIEW',
    create: 'ROLE_VOUCHERS_CREATE',
    edit: 'ROLE_VOUCHERS_EDIT',
    delete: 'ROLE_VOUCHERS_DELETE',
    approve: 'ROLE_VOUCHERS_APPROVE',
  },
  [normalize('Billing')]: {
    view: 'ROLE_BILLING_VIEW',
    print: 'ROLE_BILLING_VIEW',
    create: 'ROLE_BILLING_CREATE',
    edit: 'ROLE_BILLING_EDIT',
    delete: 'ROLE_BILLING_DELETE',
    approve: 'ROLE_BILLING_APPROVE',
  },
  [normalize('Financial Reports')]: {
    view: 'ROLE_FINANCIAL_REPORTS_VIEW',
    export: 'ROLE_FINANCIAL_REPORTS_VIEW',
  },
  [normalize('Reports')]: {
    view: 'ROLE_REPORTS_VIEW',
    export: 'ROLE_REPORTS_VIEW',
  },
  [normalize('Print Templates')]: {
    view: 'ROLE_PRINT_TEMPLATES_VIEW',
    create: 'ROLE_PRINT_TEMPLATES_CREATE',
    edit: 'ROLE_PRINT_TEMPLATES_EDIT',
    delete: 'ROLE_PRINT_TEMPLATES_DELETE',
    approve: 'ROLE_PRINT_TEMPLATES_APPROVE',
  },
  // Settings (RBAC) module.
  [normalize('Settings')]: {
    view: 'ROLE_RBAC_SETTINGS_VIEW',
    'manage roles': 'ROLE_RBAC_SETTINGS_EDIT',
    'manage users': 'ROLE_RBAC_SETTINGS_EDIT',
  },
  // Settlement (Puty) module.
  [normalize('Settlement')]: {
    view: 'ROLE_SETTLEMENTS_VIEW',
    create: 'ROLE_SETTLEMENTS_CREATE',
    edit: 'ROLE_SETTLEMENTS_EDIT',
    delete: 'ROLE_SETTLEMENTS_DELETE',
    approve: 'ROLE_SETTLEMENTS_APPROVE',
  },
  // Print Hub / Print Logs module.
  [normalize('Print Hub')]: {
    view: 'ROLE_PRINT_LOGS_VIEW',
    create: 'ROLE_PRINT_LOGS_CREATE',
    edit: 'ROLE_PRINT_LOGS_EDIT',
    delete: 'ROLE_PRINT_LOGS_DELETE',
  },
};

const hasAuthority = (authorities: Set<string>, authority?: string | null) =>
  !!authority && authorities.has(authority);

export function canAccessModuleWithAuthorities(
  authorities: Set<string>,
  module: ModuleKey
): boolean {
  const moduleKey = normalize(module);
  const featureMap = MODULE_FEATURE_TO_AUTHORITY[moduleKey];
  if (!featureMap) {
    // Modules without an authority map are considered purely UI and always accessible.
    return true;
  }
  return Object.values(featureMap).some(a => hasAuthority(authorities, a));
}

export function canWithAuthorities(
  authorities: Set<string>,
  module: ModuleKey,
  feature: string
): boolean {
  const moduleKey = normalize(module);
  const featureKey = normalize(feature);
  const featureMap = MODULE_FEATURE_TO_AUTHORITY[moduleKey];
  if (!featureMap) {
    return false;
  }
  const authority = featureMap[featureKey];
  return hasAuthority(authorities, authority);
}

// Route → module name mapping. Centralized so menus and pages stay consistent.
export function getModuleKeyForRoute(pathname: string): ModuleKey | null {
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/contacts')) return 'Contacts';
  if (pathname.startsWith('/commodity-settings')) return 'Commodity Settings';
  if (pathname.startsWith('/arrivals')) return 'Arrivals';
  if (pathname.startsWith('/auctions')) return 'Auctions';
  if (pathname.startsWith('/weighing')) return 'Weighing';
  if (pathname.startsWith('/writers-pad')) return "Writer's Pad";
  if (pathname.startsWith('/logistics')) return 'Print Hub';
  if (pathname.startsWith('/self-sale')) return 'Self-Sale';
  if (pathname.startsWith('/stock-purchase')) return 'Stock Purchase';
  if (pathname.startsWith('/cdn')) return 'CDN';
  if (pathname.startsWith('/settlement')) return 'Settlement';
  if (pathname.startsWith('/billing')) return 'Billing';
  if (pathname.startsWith('/accounting')) return 'Accounting';
  if (pathname.startsWith('/vouchers')) return 'Vouchers';
  if (pathname.startsWith('/financial-reports')) return 'Financial Reports';
  if (pathname.startsWith('/prints')) return 'Print Templates';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/home')) return 'Dashboard';
  return null;
}

export function usePermissions() {
  const { user } = useAuth();
  const location = useLocation();

  const authorities = useMemo(() => {
    const raw = (user as any)?.authorities as string[] | undefined;
    return new Set(raw ?? []);
  }, [user]);

  // Temporary RBAC debug logging to verify module visibility wiring end-to-end.
  // Uncomment locally if you need to inspect authorities and module access decisions.
  //
  // console.debug('[RBAC] authorities', Array.from(authorities));
  // console.debug('[RBAC] canAccess Contacts', canAccessModuleWithAuthorities(authorities, 'Contacts'));
  // console.debug('[RBAC] canAccess Commodity Settings', canAccessModuleWithAuthorities(authorities, 'Commodity Settings'));
  // console.debug('[RBAC] canAccess Arrivals', canAccessModuleWithAuthorities(authorities, 'Arrivals'));

  const canAccessModule = (module: ModuleKey) =>
    canAccessModuleWithAuthorities(authorities, module);

  const can = (module: ModuleKey, feature: string) =>
    canWithAuthorities(authorities, module, feature);

  const currentModule = useMemo(
    () => getModuleKeyForRoute(location.pathname),
    [location.pathname]
  );

  return {
    authorities,
    canAccessModule,
    can,
    currentModule,
  };
}

