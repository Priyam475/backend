import { cn } from '@/lib/utils';

export type ArrivalStatus = 'PENDING' | 'WEIGHED' | 'AUCTIONED' | 'SETTLED';

const STATUS_CONFIG: Record<ArrivalStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: 'Pending',   bg: 'bg-amber-100 dark:bg-amber-950/30',   text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
  WEIGHED:   { label: 'Weighed',   bg: 'bg-blue-100 dark:bg-blue-950/30',     text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
  AUCTIONED: { label: 'Auctioned', bg: 'bg-violet-100 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  SETTLED:   { label: 'Settled',   bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

export const ALL_STATUSES: ArrivalStatus[] = ['PENDING', 'WEIGHED', 'AUCTIONED', 'SETTLED'];

/**
 * Derive status from backend arrival data (no localStorage).
 * WEIGHED when net weight present; PENDING otherwise. AUCTIONED/SETTLED can be extended when APIs are wired.
 */
export function getArrivalStatus(arrival: { netWeight?: number; emptyWeight?: number }): ArrivalStatus {
  const hasWeighing = (arrival.netWeight ?? 0) > 0;
  if (hasWeighing) return 'WEIGHED';
  return 'PENDING';
}

interface ArrivalStatusBadgeProps {
  status: ArrivalStatus;
  size?: 'sm' | 'md';
}

const ArrivalStatusBadge = ({ status, size = 'sm' }: ArrivalStatusBadgeProps) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold',
      cfg.bg, cfg.text,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

export default ArrivalStatusBadge;
