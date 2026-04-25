import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import ForbiddenPage from '@/components/ForbiddenPage';
import { usePermissions } from '@/lib/permissions';

const SUMMARY_MODULE = 'SummaryPage' as const;

const SummaryPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { canAccessModule } = usePermissions();
  const canView = canAccessModule(SUMMARY_MODULE);

  if (!canView) {
    return <ForbiddenPage moduleName={SUMMARY_MODULE} />;
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      <div
        className={cn(
          'border-b border-border/60 bg-gradient-to-r from-amber-500/10 via-background to-violet-500/10',
          isDesktop ? 'pl-4 pr-6' : 'px-4',
        )}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3 py-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight">Summary page</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Add content and data when ready</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">
          Content for this screen can be added when business rules and data sources are defined.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SummaryPage;
