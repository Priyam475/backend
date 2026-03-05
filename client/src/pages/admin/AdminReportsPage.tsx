import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Truck, Gavel, Receipt, HandCoins, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reportsApi, type AdminDailySummaryDTO } from '@/services/api/reports';
import { toast } from 'sonner';
import { useAdminPermissions } from '@/admin/lib/adminPermissions';
import AdminForbiddenPage from '@/admin/components/AdminForbiddenPage';

const AdminReportsPage = () => {
  const { canAccessModule } = useAdminPermissions();
  const canView = canAccessModule('Reports');

  if (!canView) {
    return <AdminForbiddenPage moduleName="Reports" />;
  }

  const [summary, setSummary] = useState<AdminDailySummaryDTO | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; totalRevenue: number }[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let cancelled = false;
    const load = async () => {
      try {
        setSummaryLoading(true);
        const res = await reportsApi.getAdminDailySummary(today, today);
        if (!cancelled) setSummary(res);
      } catch (err) {
        if (!cancelled) {
          toast.error((err as Error)?.message ?? 'Failed to load admin reports');
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Build a 7-day revenue series using existing admin daily summary endpoint.
    let cancelled = false;
    const load = async () => {
      try {
        setRevenueLoading(true);
        const today = new Date();
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dates: { label: string; from: string; to: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const iso = d.toISOString().split('T')[0];
          dates.push({ label: dayLabels[d.getDay()], from: iso, to: iso });
        }
        const results = await Promise.all(
          dates.map(d => reportsApi.getAdminDailySummary(d.from, d.to).catch(() => null))
        );
        if (cancelled) return;
        const series = results.map((res, idx) => ({
          label: dates[idx].label,
          totalRevenue: res?.totalRevenue ?? 0,
        }));
        setRevenueSeries(series);
      } finally {
        if (!cancelled) {
          setRevenueLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = useMemo(
    () =>
      summary ?? {
        totalArrivals: 0,
        totalLots: 0,
        totalAuctions: 0,
        totalBills: 0,
        totalRevenue: 0,
        totalCollected: 0,
        totalPending: 0,
      },
    [summary]
  );

  const maxRevenue = revenueSeries.reduce((max, p) => (p.totalRevenue > max ? p.totalRevenue : max), 0);
  const revenueHeights = maxRevenue > 0 ? revenueSeries.map(p => (Number(p.totalRevenue) / Number(maxRevenue)) * 100) : [];

  const metrics = [
    { label: 'Total Arrivals', value: s.totalArrivals, icon: Truck, gradient: 'from-blue-500 via-blue-400 to-cyan-400', glow: 'shadow-blue-500/20' },
    { label: 'Total Lots', value: s.totalLots, icon: BarChart3, gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', glow: 'shadow-violet-500/20' },
    { label: 'Auctions Completed', value: s.totalAuctions, icon: Gavel, gradient: 'from-amber-400 via-orange-500 to-rose-500', glow: 'shadow-amber-500/20' },
    { label: 'Bills Generated', value: s.totalBills, icon: Receipt, gradient: 'from-emerald-400 via-green-500 to-teal-500', glow: 'shadow-emerald-500/20' },
    { label: 'Total Revenue', value: `₹${(s.totalRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, gradient: 'from-pink-400 via-rose-500 to-red-500', glow: 'shadow-pink-500/20' },
    { label: 'Pending Collection', value: `₹${(s.totalPending / 1000).toFixed(0)}K`, icon: HandCoins, gradient: 'from-indigo-500 via-blue-500 to-cyan-500', glow: 'shadow-indigo-500/20' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Background gradient blobs */}
      <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-pink-500/8 via-rose-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-gradient-to-br from-blue-500/7 via-indigo-400/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/3 w-[350px] h-[350px] bg-gradient-to-bl from-emerald-400/6 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 via-rose-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">System-wide metrics and performance data</p>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {summaryLoading && (
          <p className="col-span-full text-xs text-muted-foreground px-1">Loading admin summary…</p>
        )}
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="glass-card rounded-2xl p-5 hover:shadow-elevated transition-all relative overflow-hidden border border-white/40 dark:border-white/10"
          >
            <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-15 bg-gradient-to-br', m.gradient)} />
            <div className="relative z-10">
              <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-4', m.gradient, m.glow)}>
                <m.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-card rounded-2xl p-6 relative z-10 overflow-hidden border border-white/40 dark:border-white/10">
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-gradient-to-bl from-pink-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            Revenue Overview
          </h3>
          {revenueLoading && (
            <p className="text-xs text-muted-foreground px-4">Loading weekly revenue…</p>
          )}
          {!revenueLoading && revenueHeights.length === 0 && (
            <p className="text-xs text-muted-foreground px-4">
              No revenue data available for the recent days.
            </p>
          )}
          {revenueHeights.length > 0 && (
            <>
              <div className="h-48 flex items-end justify-between gap-2 px-4">
                {revenueHeights.map((h, i) => (
                  <motion.div
                    key={revenueSeries[i].label}
                    initial={{ height: 0 }}
                    animate={{ height: `${h || 2}%` }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                    className="flex-1 bg-gradient-to-t from-primary via-blue-500 to-accent rounded-t-xl min-w-[2rem] relative group shadow-md shadow-primary/10"
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap glass-card px-2 py-0.5 rounded-lg">
                      ₹{(Number(revenueSeries[i].totalRevenue) / 1000).toFixed(1)}K
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between px-4 mt-2 text-[10px] text-muted-foreground">
                {revenueSeries.map(p => (
                  <span key={p.label}>{p.label}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminReportsPage;
