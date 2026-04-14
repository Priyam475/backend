import { Shield } from 'lucide-react';
import { ReportDateRangeSelector } from '@/pages/reports/components/ReportDateRangeSelector';
import { useReportDateRangeState } from '@/pages/reports/hooks/useReportDateRangeState';
import { ReportDetailPageShell } from './ReportDetailPageShell';

const UserFeesReportPage = () => {
  const dateRange = useReportDateRangeState();

  return (
    <ReportDetailPageShell
      title="User Fees Report"
      subtitle="User fee and market cess breakdown (placeholder)."
      icon={Shield}
      filterControls={<ReportDateRangeSelector state={dateRange} idPrefix="ufees" />}
    />
  );
};

export default UserFeesReportPage;
