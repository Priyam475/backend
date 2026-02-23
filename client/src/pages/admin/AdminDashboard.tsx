import { motion } from 'framer-motion';
import {
  Users, Store, Package, Truck, Gavel, Receipt,
  TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3, Activity,
  Sparkles, Zap, Crown, Gem, ShieldCheck, CircleDollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEED_DAILY_SUMMARY } from '@/services/mockData';

const statCards = [
  { label: 'Total Traders', value: '24', change: '+3', up: true, icon: Crown, gradient: 'from-blue-500 via-blue-400 to-cyan-400', glow: 'shadow-blue-500/30' },
  { label: 'Active Categories', value: '7', change: '+1', up: true, icon: Gem, gradient: 'from-violet-500 via-purple-500 to-fuchsia-500', glow: 'shadow-violet-500/30' },
  { label: 'Commodities', value: '42', change: '+5', up: true, icon: Sparkles, gradient: 'from-amber-400 via-orange-500 to-rose-500', glow: 'shadow-orange-500/30' },
  { label: "Today's Revenue", value: '₹2.45L', change: '+12%', up: true, icon: CircleDollarSign, gradient: 'from-emerald-400 via-green-500 to-teal-500', glow: 'shadow-emerald-500/30' },
];

const recentTraders = [
  { name: 'Raj Vegetable Mart', owner: 'Rajesh Kumar', status: 'PENDING', date: '2 hours ago' },
  { name: 'Patel Onion Traders', owner: 'Vikram Patel', status: 'APPROVED', date: '1 day ago' },
  { name: 'Krishna Spice Hub', owner: 'Krishna Das', status: 'APPROVED', date: '2 days ago' },
  { name: 'Ganesh Fruits Co.', owner: 'Ganesh Patil', status: 'PENDING', date: '3 days ago' },
  { name: 'Lakshmi Grain Store', owner: 'Suresh Rao', status: 'REJECTED', date: '4 days ago' },
];

const recentActivity = [
  { action: 'Trader approved', detail: 'Patel Onion Traders', time: '1h ago', type: 'success' },
  { action: 'New registration', detail: 'Raj Vegetable Mart', time: '2h ago', type: 'info' },
  { action: 'Category added', detail: 'Dry Fruits', time: '5h ago', type: 'info' },
  { action: 'Trader rejected', detail: 'Unknown Traders', time: '1d ago', type: 'error' },
  { action: 'System update', detail: 'v3.0.1 deployed', time: '2d ago', type: 'info' },
];

const AdminDashboard = () => {
  const summary = SEED_DAILY_SUMMARY;

  return (
    <div className="space-y-6 relative">
      {/* Extra gradient blobs for the dashboard */}
      <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-violet-500/8 via-fuchsia-500/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-cyan-400/7 via-blue-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-gradient-to-tl from-amber-400/6 via-orange-400/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-gradient-to-br from-emerald-400/6 via-teal-500/4 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, Admin</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's your mandi ecosystem overview</p>
          </div>
        </div>
        <div className="text-right glass-card rounded-2xl px-4 py-2">
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-5 hover:shadow-elevated transition-all group relative overflow-hidden"
          >
            {/* Card internal glow */}
            <div className={cn('absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 bg-gradient-to-br', stat.gradient)} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', stat.gradient, stat.glow)}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl',
                  stat.up ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
                )}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Operations Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 glass-card rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Today's Operations
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Arrivals', value: summary.totalArrivals, icon: Truck, gradient: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/20' },
                { label: 'Lots', value: summary.totalLots, icon: Package, gradient: 'from-violet-500 to-fuchsia-500', glow: 'shadow-violet-500/20' },
                { label: 'Auctions', value: summary.totalAuctions, icon: Gavel, gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/20' },
                { label: 'Bills', value: summary.totalBills, icon: Receipt, gradient: 'from-emerald-400 to-teal-500', glow: 'shadow-emerald-500/20' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.03 }}
                  className="glass-card rounded-xl p-4 text-center transition-all relative overflow-hidden"
                >
                  <div className={cn('absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-15 bg-gradient-to-br', item.gradient)} />
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br mx-auto mb-2 flex items-center justify-center shadow-md', item.gradient, item.glow)}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Revenue Bar */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Collected</span>
                <span className="font-semibold text-success">₹{(summary.totalCollected / 1000).toFixed(0)}K</span>
              </div>
              <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(summary.totalCollected / summary.totalRevenue) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pending: ₹{(summary.totalPending / 1000).toFixed(0)}K</span>
                <span>Total: ₹{(summary.totalRevenue / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative z-10">
            <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Activity className="w-4 h-4 text-white" />
              </div>
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                    item.type === 'success' ? 'bg-success/15' : item.type === 'error' ? 'bg-destructive/15' : 'bg-primary/15'
                  )}>
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      item.type === 'success' ? 'bg-success' : item.type === 'error' ? 'bg-destructive' : 'bg-primary'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Traders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card rounded-2xl p-5 relative z-10 overflow-hidden border border-white/40 dark:border-white/10"
      >
        {/* Corner gradient accents */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-gradient-to-br from-blue-400/12 via-cyan-400/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-bl from-violet-400/10 via-purple-400/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-tl from-emerald-400/10 via-teal-400/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-amber-400/8 via-orange-400/5 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Users className="w-4 h-4 text-white" />
              </div>
              Recent Trader Registrations
            </h3>
          </div>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-primary/10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentTraders.map((t, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.05 }}
                    className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">{t.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{t.owner}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-semibold',
                        t.status === 'APPROVED' ? 'bg-success/10 text-success' :
                        t.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-destructive/10 text-destructive'
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{t.date}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
