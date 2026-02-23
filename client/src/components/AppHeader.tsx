import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useDesktopMode } from '@/hooks/use-desktop';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  transparent?: boolean;
}

const AppHeader = ({ title, showBack = true, transparent = false }: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const isDesktop = useDesktopMode();

  // On desktop, TraderLayout provides the top bar — hide mobile header
  if (isDesktop) return null;

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <header className={`sticky top-0 z-50 flex items-center justify-between px-5 py-4 ${transparent ? '' : 'glass-panel border-b border-border/50'}`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-foreground hover:primary-glow transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {title && (
          <h1 className={`text-lg font-bold ${transparent ? 'text-white' : 'text-foreground'}`}>{title}</h1>
        )}
      </div>
      <button
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`w-11 h-11 rounded-2xl glass-panel flex items-center justify-center ${transparent ? 'text-white' : 'text-primary'} hover:primary-glow transition-all duration-300`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </header>
  );
};

export default AppHeader;
