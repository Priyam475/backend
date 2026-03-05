import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const TraderProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasBootstrapped, user, trader } = useAuth();

  if (!hasBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !trader) {
    return <Navigate to="/login" replace />;
  }

  const authorities = user?.authorities ?? [];
  const hasBaseline = authorities.includes('ROLE_USER');
  if (!hasBaseline) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default TraderProtectedRoute;

