import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Truck,
  ShoppingBag,
  FileText,
  Scale,
  User,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MercotraceIcon } from '@/components/MercotraceLogo';
import { useTheme } from '@/context/ThemeContext';
import { useContactAuth } from '@/context/ContactAuthContext';

const portalNavItems = [
  { icon: LayoutDashboard, title: 'Dashboard', path: '/contact' },
  { icon: Truck, title: 'Arrivals', path: '/contact/arrivals' },
  { icon: ShoppingBag, title: 'Purchases', path: '/contact/purchases' },
  { icon: FileText, title: 'Statements', path: '/contact/statements' },
  { icon: Scale, title: 'Settlements', path: '/contact/settlements' },
  { icon: User, title: 'Profile', path: '/contact/profile' },
];

const ContactPortalDesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { contact, logout } = useContactAuth();

  const handleLogout = async () => {
    await Promise.resolve(logout());
    navigate('/login');
  };

  const collapsedRailPx = 72;

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? collapsedRailPx : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #4B7CF3 0%, #5B8CFF 30%, #7B61FF 100%)' }}
      >
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />

        {/* Logo + collapse when expanded; icon-only when collapsed */}
        <div
          className={cn(
            'relative z-10 flex items-center border-b border-white/15 min-w-0',
            collapsed ? 'justify-center px-2 py-5' : 'gap-2 sm:gap-3 px-3 sm:px-4 py-5'
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg flex-shrink-0 border border-white/25">
            <MercotraceIcon size={22} color="white" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <h1 className="text-sm font-bold text-white truncate drop-shadow-sm">Mercotrace</h1>
                    <p className="text-[10px] text-white/70 truncate flex items-center gap-1">
                      Contact Portal
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform duration-300 border-2 border-white/30"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}
        </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 py-3 px-2 space-y-1 overflow-y-auto no-scrollbar">
        {portalNavItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/contact' && location.pathname.startsWith(item.path + '/'));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-white/25 text-white shadow-lg border border-white/30 backdrop-blur-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                  isActive ? 'bg-white/30 shadow-md' : 'bg-white/10 group-hover:bg-white/15'
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                  )}
                />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap text-[13px]"
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-indicator-glow" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="relative z-10 p-3 border-t border-white/15 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/75 hover:text-white hover:bg-white/10 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-200 hover:bg-red-500/20 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          {!collapsed && <span className="whitespace-nowrap">Sign Out</span>}
        </button>
      </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/25 rounded-full"
              style={{ left: `${15 + Math.random() * 70}%`, top: `${Math.random() * 100}%` }}
              animate={{ y: [-12, 12], opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
      </motion.aside>

      {collapsed && (
        <div className="fixed z-[60] top-20 left-[72px] hidden -translate-x-1/2 lg:block" role="presentation">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/50 bg-gradient-to-br from-primary to-accent text-white shadow-xl shadow-primary/35 hover:scale-105 active:scale-95 transition-transform"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </>
  );
};

export default ContactPortalDesktopSidebar;

