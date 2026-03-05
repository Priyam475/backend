import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Phone, BookUser, UserCheck, ShoppingCart, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { contactApi } from '@/services/api';
import type { Contact, ContactType } from '@/types/models';
import { useAdminPermissions } from '@/admin/lib/adminPermissions';
import AdminForbiddenPage from '@/admin/components/AdminForbiddenPage';

const typeStyles: Record<ContactType, { bg: string; text: string; gradient: string; icon: typeof UserCheck }> = {
  SELLER: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-400 to-teal-500', icon: UserCheck },
  BUYER: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-500 to-cyan-400', icon: ShoppingCart },
  BROKER: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-400 to-orange-500', icon: Handshake },
};

const AdminContactsPage = () => {
  const { canAccessModule } = useAdminPermissions();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'ALL'>('ALL');

  useEffect(() => {
    contactApi.adminList().then(setContacts);
  }, []);

  if (!canAccessModule('Contacts')) {
    return <AdminForbiddenPage moduleName="Contacts" />;
  }

  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchType = filterType === 'ALL' || c.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-5 relative">
      <div className="fixed pointer-events-none z-0" style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-emerald-400/8 via-teal-400/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/7 via-violet-400/4 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <BookUser className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Contacts Directory</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts across all traders</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex gap-3 relative z-10">
        {(['SELLER', 'BUYER', 'BROKER'] as const).map((t, i) => {
          const style = typeStyles[t];
          const count = contacts.filter(c => c.type === t).length;
          return (
            <motion.div key={t} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.06 }}
              className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', style.gradient)}>
                <style.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground">{t.charAt(0) + t.slice(1).toLowerCase()}s</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-3 flex-wrap relative z-10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'SELLER', 'BUYER', 'BROKER'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={cn('px-3 py-2 rounded-xl text-xs font-semibold transition-all', filterType === t ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' : 'glass-card text-muted-foreground hover:text-foreground')}>
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mark</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const style = typeStyles[c.type!];
                return (
                  <motion.tr key={c.contact_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}
                    className="border-b border-border/20 hover:bg-primary/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', style.gradient)}>
                          <span className="text-white font-bold text-xs">{c.mark || c.name.charAt(0)}</span>
                        </div>
                        <span className="font-semibold text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1', style.bg, style.text)}>
                        <style.icon className="w-3 h-3" /> {c.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">{c.mark || '—'}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{c.address || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={cn('font-semibold', (c.current_balance ?? 0) >= 0 ? 'text-success' : 'text-destructive')}>
                        ₹{Math.abs(c.current_balance ?? 0).toLocaleString()}
                      </span>
                      <p className="text-[10px] text-muted-foreground">{(c.current_balance ?? 0) >= 0 ? 'Receivable' : 'Payable'}</p>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground">No contacts found</div>}
      </motion.div>
    </div>
  );
};

export default AdminContactsPage;
