import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, User } from 'lucide-react';
import { useContactAuth } from '@/context/ContactAuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useDesktopMode } from '@/hooks/use-desktop';
import ContactPortalDesktopSidebar from '@/components/ContactPortalDesktopSidebar';
import ContactPortalBottomNav from '@/components/ContactPortalBottomNav';

const navItems = [
  { to: '/portal', label: 'Dashboard' },
  { to: '/portal/arrivals', label: 'Arrivals' },
  { to: '/portal/purchases', label: 'Purchases' },
  { to: '/portal/statements', label: 'Statements' },
  { to: '/portal/settlements', label: 'Settlements' },
  { to: '/portal/profile', label: 'Profile' },
];

const pageTitles: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/arrivals': 'Arrivals',
  '/portal/purchases': 'Purchases',
  '/portal/statements': 'Statements',
  '/portal/settlements': 'Settlements',
  '/portal/profile': 'Profile',
};

const pageGradients: Record<string, string> = {
  '/portal': 'from-primary/8 to-violet-500/5',
  '/portal/arrivals': 'from-blue-500/8 to-cyan-500/5',
  '/portal/purchases': 'from-emerald-500/8 to-teal-500/5',
  '/portal/statements': 'from-red-500/8 to-rose-500/5',
  '/portal/settlements': 'from-rose-500/8 to-pink-500/5',
  '/portal/profile': 'from-emerald-500/8 to-teal-500/5',
};

const ContactPortalLayout = () => {
  const { contact } = useContactAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const isDesktop = useDesktopMode();

  const activePageTitle =
    pageTitles[location.pathname] ||
    Object.entries(pageTitles).find(([k]) => location.pathname.startsWith(k))?.[1] ||
    'Contact Portal';

  const headerGradient =
    pageGradients[location.pathname] || 'from-primary/8 to-violet-500/5';

  if (!isDesktop) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950 pb-24">
        <header className="border-b border-emerald-100/60 dark:border-emerald-900/40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Contact Portal
              </p>
              <h1 className="text-sm sm:text-base font-semibold text-foreground">
                {contact?.name || contact?.phone}
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-5">
          <Outlet />
        </main>
        <ContactPortalBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <ContactPortalDesktopSidebar />
      <div className="flex-1 min-h-screen lg:ml-[260px] transition-all duration-250">
        {/* Subtle background blobs */}
        <div className="fixed pointer-events-none inset-0 lg:left-[260px]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/8 via-accent/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-accent/6 via-primary/4 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Desktop Top Bar — mirrors trader layout */}
        <header
          className="sticky top-0 z-30 h-16 flex items-center justify-between px-8 border-b border-border/40 relative overflow-hidden"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r ${headerGradient} pointer-events-none`}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-violet-500 animate-pulse" />
            <h2 className="text-lg font-bold text-foreground">{activePageTitle}</h2>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <button
              aria-label="Notifications"
              className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-muted/50 transition-all relative border border-border/30"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gradient-to-r from-primary to-violet-500 shadow-sm shadow-primary/40" />
            </button>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-muted/50 transition-all border border-border/30"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass cursor-pointer hover:bg-muted/50 transition-all border border-border/30"
              onClick={() => navigate('/portal/profile')}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-md shadow-primary/20">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {contact?.name || contact?.phone || 'Contact'}
                </p>
                <p className="text-[10px] text-muted-foreground">Contact Portal</p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ContactPortalLayout;

