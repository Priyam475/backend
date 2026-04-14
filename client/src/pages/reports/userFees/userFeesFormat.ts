import { formatBillingInr } from '@/utils/billingMoney';
import type { UserFeesReportDTO } from '@/services/api/reports';

export function userFeesMoney(n: number): string {
  return formatBillingInr(Number(n) || 0);
}

/** Weekday label for UTC calendar date (matches server `bill_date` UTC day grouping). */
export function utcWeekdayShort(ymd: string): string {
  const parts = ymd.split('-').map((x) => Number(x));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return '—';
  }
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function isUserFeesReportEmpty(report: UserFeesReportDTO): boolean {
  const t = report.totals;
  if (!t) return true;
  return (
    (Number(t.totalBags) || 0) === 0 &&
    (Number(t.totalSales) || 0) === 0 &&
    (Number(t.userCharges) || 0) === 0 &&
    (Number(t.weighmanCharge) || 0) === 0
  );
}
