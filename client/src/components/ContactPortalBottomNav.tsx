import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Truck, ShoppingBag, FileText, Scale, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const portalTabs = [
  { icon: Home, label: 'Home', path: '/contact' },
  { icon: Truck, label: 'Arrivals', path: '/contact/arrivals' },
  { icon: ShoppingBag, label: 'Purchases', path: '/contact/purchases' },
  { icon: FileText, label: 'Statements', path: '/contact/statements' },
  { icon: Scale, label: 'Settlements', path: '/contact/settlements' },
  { icon: User, label: 'Profile', path: '/contact/profile' },
] as const;

const ContactPortalBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav z-50 w-full max-w-[56rem] left-1/2 -translate-x-1/2 lg:hidden">
      <div className="flex items-center justify-around h-14 px-2 md:px-6">
        {portalTabs.map((tab) => {
          const isHome = tab.path === '/contact';
          const isActive = isHome
            ? location.pathname === '/contact'
            : location.pathname.startsWith(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-all duration-200',
                isActive
                  ? 'text-primary scale-110'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon
                className={cn(
                  'w-5 h-5 mb-0.5',
                  isActive && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isActive && 'font-bold'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ContactPortalBottomNav;

