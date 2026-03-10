import { useEffect, useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContactAuth } from '@/context/ContactAuthContext';
import { contactPortalApi, type ContactPortalStatement, type ContactPortalPurchase } from '@/services/api/contactPortal';
import { useDesktopMode } from '@/hooks/use-desktop';
import { useTheme } from '@/context/ThemeContext';
import { useFontSize } from '@/context/FontSizeContext';
import FontSizeControls from '@/components/FontSizeControls';
import { Sparkles, Sun, Moon, LayoutDashboard, Truck, ShoppingBag, FileText, Scale, User } from 'lucide-react';
import { MercotraceIcon } from '@/components/MercotraceLogo';
import { cn } from '@/lib/utils';

import imgArrivals from '@/assets/modules/arrivals.png';
import imgBilling from '@/assets/modules/billing.png';
import imgFinancialReports from '@/assets/modules/financial-reports.png';
import imgSettings from '@/assets/modules/settings.png';
import imgContacts from '@/assets/modules/contacts.png';

const portalModules = [
  {
    image: imgArrivals,
    title: 'Arrivals',
    desc: 'View your vehicle arrivals',
    path: '/portal/arrivals',
    accent: 'from-emerald-400 to-teal-500',
    icon: Truck,
  },
  {
    image: imgBilling,
    title: 'Purchases',
    desc: 'Track your purchase history',
    path: '/portal/purchases',
    accent: 'from-blue-400 to-indigo-500',
    icon: ShoppingBag,
  },
  {
    image: imgFinancialReports,
    title: 'Statements',
    desc: 'Check account statements',
    path: '/portal/statements',
    accent: 'from-indigo-400 to-blue-600',
    icon: FileText,
  },
  {
    image: imgBilling,
    title: 'Settlements',
    desc: 'View your settlements',
    path: '/portal/settlements',
    accent: 'from-rose-400 to-pink-500',
    icon: Scale,
  },
  {
    image: imgContacts,
    title: 'Profile',
    desc: 'Update your basic details',
    path: '/portal/profile',
    accent: 'from-cyan-400 to-blue-500',
    icon: User,
  },
];

const TITLE_SIZE = ['text-base', 'text-lg', 'text-xl'] as const;
const DESC_SIZE = ['text-[12px]', 'text-[13px]', 'text-sm'] as const;
const ICON_SIZE = ['w-16 h-16', 'w-20 h-20', 'w-24 h-24'] as const;
const IMG_SIZE = [
  'w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem]',
  'w-16 h-16 sm:w-20 sm:h-20',
  'w-20 h-20 sm:w-24 sm:h-24',
] as const;

const PortalModuleCard = memo(
  ({
    mod,
    onClick,
    level,
  }: {
    mod: (typeof portalModules)[number];
    onClick: () => void;
    level: number;
  }) => (
    <button
      onClick={onClick}
      className="glass-card flex flex-col items-center gap-2.5 p-4 sm:p-5 text-center group hover:shadow-xl hover:scale-[1.03] transition-all duration-300 active:scale-[0.97] relative overflow-hidden rounded-2xl"
    >
      <div
        className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${mod.accent} opacity-[0.15] blur-xl group-hover:opacity-[0.3] group-hover:w-20 group-hover:h-20 transition-all duration-500 pointer-events-none`}
      />
      <div
        className={`absolute -bottom-3 -left-3 w-12 h-12 rounded-full bg-gradient-to-tr ${mod.accent} opacity-[0.08] blur-lg group-hover:opacity-[0.2] group-hover:w-16 group-hover:h-16 transition-all duration-500 pointer-events-none`}
      />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" />
      <div
        className={cn(
          `relative rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300`,
          ICON_SIZE[level],
        )}
      >
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${mod.accent} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-300`}
        />
        <div className="absolute inset-[1px] rounded-2xl bg-card/80 backdrop-blur-sm" />
        <img
          src={mod.image}
          alt={mod.title}
          className={cn('relative z-10 object-contain drop-shadow-md', IMG_SIZE[level])}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="relative z-10">
        <p className={cn('font-bold text-foreground leading-tight', TITLE_SIZE[level])}>
          {mod.title}
        </p>
        <p className={cn('text-muted-foreground mt-0.5 leading-snug', DESC_SIZE[level])}>
          {mod.desc}
        </p>
      </div>
    </button>
  ),
);
PortalModuleCard.displayName = 'PortalModuleCard';

const ContactPortalDashboardPage = () => {
  const { contact, isGuest } = useContactAuth();
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { isDark, toggleTheme } = useTheme();
  const { level } = useFontSize();
  const [statements, setStatements] = useState<ContactPortalStatement[]>([]);
  const [purchases, setPurchases] = useState<ContactPortalPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isGuest) {
        setIsLoading(false);
        return;
      }
      try {
        const [st, pu] = await Promise.all([
          contactPortalApi.getStatements(10),
          contactPortalApi.getPurchases(5),
        ]);
        if (!cancelled) {
          setStatements(st);
          setPurchases(pu);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load portal data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mobile hero + navigation cards — mirrors trader home pattern */}
        {!isDesktop && (
          <>
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 via-primary to-violet-500 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 px-5 rounded-3xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(123,97,255,0.3)_0%,transparent_40%)]" />

              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                  <MercotraceIcon size={28} color="white" />
                </div>
                <div className="flex items-center gap-2">
                  <FontSizeControls variant="light" />
                  <button
                    onClick={toggleTheme}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-white/80 hover:text-white hover:bg-white/25 transition-all duration-200"
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="relative z-10">
                <p className={cn('text-xs font-semibold uppercase tracking-wider text-white/70')}>
                  {isGuest ? 'Guest session' : 'Contact Portal'}
                </p>
                <h1
                  className={cn(
                    'font-bold text-white tracking-tight mt-1',
                    level === 0 ? 'text-xl' : level === 1 ? 'text-2xl' : 'text-3xl',
                  )}
                >
                  {greeting()},{' '}
                  <span className="bg-gradient-to-r from-emerald-200 to-white bg-clip-text text-transparent">
                    {contact?.name || contact?.phone || 'Contact'}
                  </span>
                </h1>
                <p
                  className={cn(
                    'text-white/70 mt-1 flex items-center gap-1.5',
                    level === 0 ? 'text-xs' : level === 1 ? 'text-sm' : 'text-base',
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGuest
                    ? 'Explore a read-only view. Register to see your real arrivals, purchases and statements.'
                    : 'Stay on top of your arrivals, purchases and statements.'}
                </p>
                <p className="text-[11px] text-white/60 mt-2 flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {todayStr}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portalModules.map((mod) => (
                  <PortalModuleCard
                    key={mod.path}
                    mod={mod}
                    level={level}
                    onClick={() => navigate(mod.path)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Desktop header + summary card */}
        {isDesktop && (
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Portal
              </p>
              <h1 className="text-2xl font-bold text-foreground mt-1">
                Welcome, {contact?.name || contact?.phone}
                {isGuest && <span className="text-sm text-muted-foreground ml-2">(guest)</span>}
              </h1>
            </div>
          </header>
        )}

        <section className="rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-emerald-500/10 border border-emerald-100/70 dark:border-emerald-900/40 p-5">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            {isGuest ? 'Guest session details' : 'Your contact details'}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground/80">Phone</dt>
              <dd className="font-medium text-foreground">{contact?.phone}</dd>
            </div>
            {!isGuest && (
              <div>
                <dt className="text-muted-foreground/80">Email</dt>
                <dd className="font-medium text-foreground">
                  {contact?.email || (
                    <span className="text-muted-foreground/60">Not provided</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          {isGuest && (
            <p className="mt-3 text-xs text-muted-foreground">
              You are browsing as a guest. To save your details and see your historical data,{' '}
              <Link to="/portal/signup" className="underline font-semibold">
                register for a contact login
              </Link>
              .
            </p>
          )}
        </section>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow border border-emerald-100/70 dark:border-emerald-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Recent Statements
              </h2>
              <Link
                to="/portal/statements"
                className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 underline"
              >
                View all
              </Link>
            </div>
            {isGuest ? (
              <p className="text-xs text-muted-foreground">
                Sign up or log in with a contact account to see your account statements.
              </p>
            ) : (
              <>
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading statements…</p>
                )}
                {!isLoading && !error && statements.length === 0 && (
                  <p className="text-xs text-muted-foreground">No statements yet.</p>
                )}
                <ul className="space-y-2 text-xs">
                  {statements.map((s) => (
                    <li
                      key={s.document_id}
                      className="flex items-center justify-between border-b border-border/40 pb-1 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{s.reference_number}</p>
                        <p className="text-muted-foreground">
                          {s.type} · {s.document_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          ₹{Math.abs(s.outstanding_balance ?? 0).toLocaleString()}
                        </p>
                        <p className="text-muted-foreground">{s.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow border border-emerald-100/70 dark:border-emerald-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Recent Purchases
              </h2>
              <Link
                to="/portal/purchases"
                className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 underline"
              >
                View all
              </Link>
            </div>
            {isGuest ? (
              <p className="text-xs text-muted-foreground">
                Guest sessions don&apos;t show purchase history. Register or log in to view your
                purchases.
              </p>
            ) : (
              <>
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading purchases…</p>
                )}
                {!isLoading && purchases.length === 0 && !error && (
                  <p className="text-xs text-muted-foreground">No purchases yet.</p>
                )}
                <ul className="space-y-2 text-xs">
                  {purchases.map((p) => (
                    <li
                      key={p.purchase_id}
                      className="flex items-center justify-between border-b border-border/40 pb-1 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">Purchase #{p.purchase_id}</p>
                        <p className="text-muted-foreground">{p.purchase_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                          ₹{Math.abs(p.total_amount ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactPortalDashboardPage;


