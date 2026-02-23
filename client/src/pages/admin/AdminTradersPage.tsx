import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, XCircle, Clock, Eye,
  Building2, Phone, Mail, MapPin, Crown, ShieldAlert, Users2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Trader, ApprovalStatus } from '@/types/models';

const mockTraders: Trader[] = [
  { trader_id: '1', business_name: 'Raj Vegetable Mart', owner_name: 'Rajesh Kumar', mobile: '9876543210', email: 'raj@test.com', address: 'Market Yard', city: 'Pune', state: 'Maharashtra', pin_code: '411001', category: 'Vegetables', approval_status: 'PENDING', bill_prefix: '', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), updated_at: new Date().toISOString() },
  { trader_id: '2', business_name: 'Patel Onion Traders', owner_name: 'Vikram Patel', mobile: '9876543211', email: 'patel@test.com', address: 'APMC Market', city: 'Nashik', state: 'Maharashtra', pin_code: '422001', category: 'Vegetables', approval_status: 'APPROVED', bill_prefix: 'PO', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date().toISOString() },
  { trader_id: '3', business_name: 'Krishna Spice Hub', owner_name: 'Krishna Das', mobile: '9876543212', email: 'krishna@test.com', address: 'Spice Market', city: 'Guntur', state: 'Andhra Pradesh', pin_code: '522001', category: 'Spices', approval_status: 'APPROVED', bill_prefix: 'KS', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { trader_id: '4', business_name: 'Ganesh Fruits Co.', owner_name: 'Ganesh Patil', mobile: '9876543213', email: 'ganesh@test.com', address: 'Fruit Market', city: 'Mumbai', state: 'Maharashtra', pin_code: '400001', category: 'Fruits', approval_status: 'PENDING', bill_prefix: '', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date().toISOString() },
];

const statusConfig: Record<ApprovalStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  PENDING: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Clock, label: 'Pending' },
  APPROVED: { color: 'bg-success/10 text-success', icon: CheckCircle2, label: 'Approved' },
};

const AdminTradersPage = () => {
  const [traders, setTraders] = useState(mockTraders);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);

  const filtered = traders.filter(t => {
    const matchSearch = t.business_name.toLowerCase().includes(search.toLowerCase()) || t.owner_name.toLowerCase().includes(search.toLowerCase()) || (t.city || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || t.approval_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = (id: string) => {
    setTraders(prev => prev.map(t => t.trader_id === id ? { ...t, approval_status: 'APPROVED' as ApprovalStatus } : t));
    setSelectedTrader(null);
  };

  const counts = { ALL: traders.length, PENDING: traders.filter(t => t.approval_status === 'PENDING').length, APPROVED: traders.filter(t => t.approval_status === 'APPROVED').length };

  return (
    <div className="space-y-5 relative">
      <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-tl from-blue-500/8 via-cyan-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/7 via-purple-400/4 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Trader Management</h1>
            <p className="text-sm text-muted-foreground">{traders.length} registered traders</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex gap-3 relative z-10">
        {[
          { label: 'Total', value: counts.ALL, gradient: 'from-primary to-accent', icon: Crown },
          { label: 'Pending', value: counts.PENDING, gradient: 'from-amber-400 to-orange-500', icon: Clock },
          { label: 'Approved', value: counts.APPROVED, gradient: 'from-emerald-400 to-teal-500', icon: CheckCircle2 },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
            className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[120px]">
            <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', s.gradient)}>
              <s.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-3 flex-wrap relative z-10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search traders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-3 py-2 rounded-xl text-xs font-semibold transition-all', filterStatus === s ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'glass-card text-muted-foreground hover:text-foreground')}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl overflow-hidden relative z-10 border border-white/40 dark:border-white/10">
        <div className="relative z-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-primary/10">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const sc = statusConfig[t.approval_status];
                return (
                  <motion.tr key={t.trader_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}
                    className="border-b border-border/20 hover:bg-primary/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-foreground">{t.business_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{t.owner_name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{t.city}, {t.state}</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-1 rounded-lg bg-muted/50 text-xs font-medium text-foreground">{t.category}</span></td>
                    <td className="py-3.5 px-4">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1', sc.color)}>
                        <sc.icon className="w-3 h-3" /> {sc.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedTrader(t)} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        {t.approval_status === 'PENDING' && (
                          <button onClick={() => handleApprove(t.trader_id)} className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-all">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No traders found</div>}
      </motion.div>

      <AnimatePresence>
        {selectedTrader && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedTrader(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-lg glass-card rounded-2xl p-6 shadow-elevated border border-white/30 dark:border-white/10 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selectedTrader.business_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTrader.category}</p>
                    </div>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold', statusConfig[selectedTrader.approval_status].color)}>
                    {statusConfig[selectedTrader.approval_status].label}
                  </span>
                </div>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: Building2, label: 'Owner', value: selectedTrader.owner_name },
                    { icon: Phone, label: 'Mobile', value: selectedTrader.mobile || '' },
                    { icon: Mail, label: 'Email', value: selectedTrader.email || '' },
                    { icon: MapPin, label: 'Address', value: `${selectedTrader.address}, ${selectedTrader.city}, ${selectedTrader.state} - ${selectedTrader.pin_code}` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl glass-card">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm text-foreground font-medium">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  {selectedTrader.approval_status === 'PENDING' && (
                    <Button onClick={() => handleApprove(selectedTrader.trader_id)} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl h-11">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                    </Button>
                  )}
                  <Button onClick={() => setSelectedTrader(null)} variant="outline" className="flex-1 rounded-xl h-11">Close</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTradersPage;
