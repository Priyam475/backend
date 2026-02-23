import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Toggles layout class on #root:
 * - Trader routes get responsive max-width (mobile/tablet/desktop friendly)
 * - Admin routes get full-width desktop layout
 */
const RootClassManager = () => {
  const location = useLocation();

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const isAdmin = location.pathname.startsWith('/admin');
    if (isAdmin) {
      root.classList.remove('is-trader-app');
    } else {
      root.classList.add('is-trader-app');
    }
  }, [location.pathname]);

  return null;
};

export default RootClassManager;
