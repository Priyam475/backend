import { Navigate } from 'react-router-dom';
import { useContactAuth } from '@/context/ContactAuthContext';

const ContactProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasBootstrapped, contact } = useContactAuth();

  if (!hasBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !contact) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ContactProtectedRoute;

