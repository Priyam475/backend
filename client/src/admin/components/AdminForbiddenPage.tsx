import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminForbiddenPageProps {
  moduleName?: string;
}

const AdminForbiddenPage = ({ moduleName }: AdminForbiddenPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {moduleName ? `You don't have access to ${moduleName}` : "You don't have access to this area"}
        </h1>
        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, please contact a system administrator to adjust your admin role or permissions.
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-md hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Home
        </button>
      </div>
    </div>
  );
};

export default AdminForbiddenPage;

