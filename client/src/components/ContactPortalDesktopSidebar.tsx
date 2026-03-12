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
  { icon: LayoutDashboard, title: 'Dashboard', path: '/portal' },
  { icon: Truck, title: 'Arrivals', path: '/portal/arrivals' },
  { icon: ShoppingBag, title: 'Purchases', path: '/portal/purchases' },
  { icon: FileText, title: 'Statements', path: '/portal/statements' },
  { icon: Scale, title: 'Settlements', path: '/portal/settlements' },
  { icon: User, title: 'Profile', path: '/portal/profile' },
];

const ContactPortalDesktopSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { contact, logout } = useContactAuth();

  const handleLogout = async () => {
    await Promise.resolve(logout());
    navigate('/portal/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #4B7CF3 0%, #5B8CFF 30%, #7B61FF 100%)' }}
    >
      {/* Shine overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-5 border-b border-white/15">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg flex-shrink-0 border border-white/25">
          <MercotraceIcon size={22} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-sm font-bold text-white whitespace-nowrap drop-shadow-sm">
                Mercotrace
              </h1>
              <p className="text-[10px] text-white/70 whitespace-nowrap flex items-center gap-1">
                Contact Portal
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 py-3 px-2 space-y-1 overflow-y-auto no-scrollbar">
        {portalNavItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/portal' && location.pathname.startsWith(item.path + '/'));
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

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-6 -right-5 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/30 flex items-center justify-center text-white hover:scale-110 transition-all duration-300 z-50 border-2 border-white/30"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

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
  );
};

export default ContactPortalDesktopSidebar;

