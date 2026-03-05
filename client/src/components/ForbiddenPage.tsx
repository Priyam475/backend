import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForbiddenPageProps {
  moduleName?: string;
  message?: string;
}

const ForbiddenPage = ({ moduleName, message }: ForbiddenPageProps) => {
  const navigate = useNavigate();
  const title = moduleName ? `You do not have access to ${moduleName}.` : 'You do not have access to this area.';
  const detail =
    message ??
    'Your role does not include permission to view this module. Please contact your administrator if you believe this is a mistake.';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-red-500 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate('/home')}>Go to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;

