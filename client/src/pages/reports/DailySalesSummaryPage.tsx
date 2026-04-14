import { BarChart3 } from 'lucide-react';
import { ReportDateRangeSelector } from '@/pages/reports/components/ReportDateRangeSelector';
import { useReportDateRangeState } from '@/pages/reports/hooks/useReportDateRangeState';
import { ReportDetailPageShell } from './ReportDetailPageShell';

const DailySalesSummaryPage = () => {
  const dateRange = useReportDateRangeState();

  return (
    <ReportDetailPageShell
      title="Daily Sales Summary"
      subtitle="Sales totals and collection metrics for the selected period."
      icon={BarChart3}
      filterControls={<ReportDateRangeSelector state={dateRange} idPrefix="dss" />}
    />
  );
};

export default DailySalesSummaryPage;
