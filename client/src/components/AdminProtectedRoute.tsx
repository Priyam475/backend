import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasBootstrapped, user } = useAdminAuth();

  if (!hasBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const authorities = user?.authorities ?? [];
  const isAdmin = authorities.includes('ROLE_ADMIN') || authorities.includes('ROLE_SUPER_ADMIN') || authorities.includes('SUPER_ADMIN');
  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;

