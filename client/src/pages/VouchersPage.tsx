import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, FileText, Receipt, HandCoins, ArrowRightLeft, Landmark, BadgeAlert, Eraser, Search, Filter, ChevronDown, Check, X, Banknote, Smartphone, Building2, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { VoucherHeader, VoucherLine, VoucherType, VoucherLifecycle, COALedger, PaymentModeType } from '@/types/accounting';
import { initializeAccountingData } from '@/services/accountingData';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';

initializeAccountingData();

const VOUCHER_CONFIG: Record<VoucherType, { label: string; icon: typeof FileText; gradient: string; debitLabel: string; creditLabel: string }> = {
  SALES_BILL: { label: 'Sales Bill', icon: FileText, gradient: 'from-blue-400 to-cyan-500', debitLabel: 'Receivable', creditLabel: 'Income/Payable' },
  SALES_SETTLEMENT: { label: 'Sales Settlement', icon: Receipt, gradient: 'from-rose-400 to-pink-500', debitLabel: 'Expense/Payable', creditLabel: 'Payable' },
  RECEIPT: { label: 'Receipt', icon: HandCoins, gradient: 'from-emerald-400 to-teal-500', debitLabel: 'Cash/Bank', creditLabel: 'Receivable' },
  PAYMENT: { label: 'Payment', icon: Banknote, gradient: 'from-amber-400 to-orange-500', debitLabel: 'Payable', creditLabel: 'Cash/Bank' },
  JOURNAL: { label: 'Journal', icon: ArrowRightLeft, gradient: 'from-violet-400 to-purple-500', debitLabel: 'Any', creditLabel: 'Any' },
  CONTRA: { label: 'Contra', icon: Landmark, gradient: 'from-indigo-400 to-blue-500', debitLabel: 'Cash/Bank', creditLabel: 'Cash/Bank' },
  ADVANCE: { label: 'Advance', icon: BadgeAlert, gradient: 'from-fuchsia-400 to-pink-500', debitLabel: 'Advance', creditLabel: 'Cash/Bank' },
  WRITE_OFF: { label: 'Write-Off', icon: Eraser, gradient: 'from-red-400 to-rose-500', debitLabel: 'Bad Debt', creditLabel: 'Receivable/Payable' },
};

const STATUS_COLORS: Record<VoucherLifecycle, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  POSTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PARTIALLY_SETTLED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CLOSED: 'bg-muted text-muted-foreground',
  REVERSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const VouchersPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [vouchers, setVouchers] = useState<VoucherHeader[]>(() => JSON.parse(localStorage.getItem('mkt_acc_vouchers') || '[]'));
  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>(() => JSON.parse(localStorage.getItem('mkt_acc_voucher_lines') || '[]'));
  const [ledgers] = useState<COALedger[]>(() => JSON.parse(localStorage.getItem('mkt_coa_ledgers') || '[]'));
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherHeader | null>(null);

  // Create form state
  const [createType, setCreateType] = useState<VoucherType>('RECEIPT');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<{ ledger_id: string; debit: string; credit: string }[]>([
    { ledger_id: '', debit: '', credit: '' },
    { ledger_id: '', debit: '', credit: '' },
  ]);
  const [paymentMode, setPaymentMode] = useState<PaymentModeType>('CASH');

  const filtered = useMemo(() => {
    let list = vouchers;
    if (filterType !== 'ALL') list = list.filter(v => v.voucher_type === filterType);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => v.voucher_number.toLowerCase().includes(q) || v.narration.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [vouchers, filterType, search]);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const addLine = () => setLines([...lines, { ledger_id: '', debit: '', credit: '' }]);
  const removeLine = (i: number) => { if (lines.length > 2) setLines(lines.filter((_, idx) => idx !== i)); };

  const getNextNumber = (type: VoucherType) => {
    const prefix = type === 'RECEIPT' ? 'RV' : type === 'PAYMENT' ? 'PV' : type === 'JOURNAL' ? 'JV' : type === 'CONTRA' ? 'CV' : type === 'ADVANCE' ? 'AV' : type === 'WRITE_OFF' ? 'WO' : type === 'SALES_BILL' ? 'SB' : 'SS';
    const count = vouchers.filter(v => v.voucher_type === type).length + 1;
    return `KT/${prefix}/${String(count).padStart(3, '0')}`;
  };

  const handleCreate = () => {
    if (!isBalanced || !narration.trim()) return;
    const voucherId = crypto.randomUUID();
    const voucherNumber = getNextNumber(createType);
    const newVoucher: VoucherHeader = {
      voucher_id: voucherId,
      trader_id: 'trader-001',
      voucher_type: createType,
      voucher_number: voucherNumber,
      voucher_date: new Date().toISOString().split('T')[0],
      narration: narration.trim(),
      status: 'DRAFT',
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_migrated: false,
      created_at: new Date().toISOString(),
    };
    const newLines: VoucherLine[] = lines
      .filter(l => l.ledger_id && (parseFloat(l.debit) || parseFloat(l.credit)))
      .map(l => ({
        line_id: crypto.randomUUID(),
        voucher_id: voucherId,
        ledger_id: l.ledger_id,
        ledger_name: ledgers.find(lg => lg.ledger_id === l.ledger_id)?.ledger_name || '',
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }));

    const updatedVouchers = [...vouchers, newVoucher];
    const updatedLines = [...voucherLines, ...newLines];
    setVouchers(updatedVouchers);
    setVoucherLines(updatedLines);
    localStorage.setItem('mkt_acc_vouchers', JSON.stringify(updatedVouchers));
    localStorage.setItem('mkt_acc_voucher_lines', JSON.stringify(updatedLines));
    setShowCreate(false);
    setNarration('');
    setLines([{ ledger_id: '', debit: '', credit: '' }, { ledger_id: '', debit: '', credit: '' }]);
  };

  const handlePost = (v: VoucherHeader) => {
    const updated = vouchers.map(x => x.voucher_id === v.voucher_id ? { ...x, status: 'POSTED' as VoucherLifecycle, posted_at: new Date().toISOString() } : x);
    setVouchers(updated);
    localStorage.setItem('mkt_acc_vouchers', JSON.stringify(updated));
    // Update ledger balances and lock after first posting (Section 3.2)
    const relatedLines = voucherLines.filter(l => l.voucher_id === v.voucher_id);
    const updatedLedgers: COALedger[] = JSON.parse(localStorage.getItem('mkt_coa_ledgers') || '[]');
    relatedLines.forEach(line => {
      const idx = updatedLedgers.findIndex(l => l.ledger_id === line.ledger_id);
      if (idx >= 0) {
        updatedLedgers[idx].is_locked = true;
        const isDebitNature = updatedLedgers[idx].accounting_class === 'ASSET' || updatedLedgers[idx].accounting_class === 'EXPENSE';
        if (isDebitNature) {
          updatedLedgers[idx].current_balance += (line.debit - line.credit);
        } else {
          updatedLedgers[idx].current_balance += (line.credit - line.debit);
        }
      }
    });
    localStorage.setItem('mkt_coa_ledgers', JSON.stringify(updatedLedgers));
    setSelectedVoucher(null);
  };

  const handleReverse = (v: VoucherHeader) => {
    const updated = vouchers.map(x => x.voucher_id === v.voucher_id ? { ...x, status: 'REVERSED' as VoucherLifecycle, reversed_at: new Date().toISOString() } : x);
    setVouchers(updated);
    localStorage.setItem('mkt_acc_vouchers', JSON.stringify(updated));
    setSelectedVoucher(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 px-5 rounded-b-[2.5rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Vouchers & Payments</h1>
                <p className="text-white/70 text-xs">Double-Entry Bookkeeping</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vouchers..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white placeholder:text-white/40 text-sm border border-white/20 outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/home')} className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <p className="text-sm text-muted-foreground">Double-Entry Bookkeeping · {vouchers.length} vouchers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vouchers…"
                className="w-full pl-10 pr-4 h-10 rounded-xl bg-muted/50 text-foreground text-sm border border-border focus:outline-none focus:border-primary/50" />
            </div>
            <button onClick={() => setShowCreate(true)} className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold text-sm flex items-center gap-2 shadow-md">
              <Plus className="w-4 h-4" /> New Voucher
            </button>
          </div>
        </div>
      )}

      {/* Voucher Summary Chart */}
      <div className="px-4 -mt-4 relative z-10 mb-3">
        {(() => {
          const statusData = [
            { name: 'Draft', value: vouchers.filter(v => v.status === 'DRAFT').length, fill: '#f59e0b' },
            { name: 'Posted', value: vouchers.filter(v => v.status === 'POSTED').length, fill: '#10b981' },
            { name: 'Reversed', value: vouchers.filter(v => v.status === 'REVERSED').length, fill: '#ef4444' },
          ].filter(d => d.value > 0);
          const totalAmount = vouchers.reduce((s, v) => s + v.total_debit, 0);
          return (
            <div className="glass-card rounded-2xl p-4 border border-violet-200/20 dark:border-violet-800/10 bg-gradient-to-br from-violet-500/5 to-purple-500/5">
              <div className="flex items-center gap-4">
                {statusData.length > 0 && (
                  <div className="w-20 h-20 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={18} outerRadius={35} paddingAngle={3} dataKey="value">
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                      <BarChart3 className="w-3 h-3 text-white" />
                    </div>
                    Voucher Summary
                  </p>
                  <p className="text-xl font-black text-foreground">₹{totalAmount.toLocaleString()}</p>
                  <div className="flex gap-3 mt-1">
                    {statusData.map(d => (
                      <div key={d.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-[10px] text-muted-foreground">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Quick Type Filters */}
      <div className="px-4 mb-4">
        <div className="glass-card rounded-2xl p-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilterType('ALL')} className={cn('px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95', filterType === 'ALL' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/40 text-muted-foreground')}>All ({vouchers.length})</button>
          {(Object.keys(VOUCHER_CONFIG) as VoucherType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={cn('px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all whitespace-nowrap active:scale-95', filterType === t ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/40 text-muted-foreground')}>
              {VOUCHER_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Voucher List */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No vouchers found</p>
          </div>
        )}
        {filtered.map((v, i) => {
          const cfg = VOUCHER_CONFIG[v.voucher_type];
          const borderColor = v.voucher_type === 'RECEIPT' ? 'border-emerald-200/30 dark:border-emerald-800/20'
            : v.voucher_type === 'PAYMENT' ? 'border-amber-200/30 dark:border-amber-800/20'
            : v.voucher_type === 'JOURNAL' ? 'border-violet-200/30 dark:border-violet-800/20'
            : 'border-border/30';
          return (
            <motion.button
              key={v.voucher_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedVoucher(v)}
              className={cn("w-full glass-card rounded-2xl p-4 text-left hover:shadow-lg transition-all border", borderColor)}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0', cfg.gradient)}>
                  <cfg.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-foreground">{v.voucher_number}</p>
                    <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium', STATUS_COLORS[v.status])}>{v.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{v.narration}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{v.voucher_date} • {cfg.label}</p>
                </div>
                <p className="text-sm font-bold text-foreground shrink-0">₹{v.total_debit.toLocaleString()}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* FAB — mobile only */}
      {!isDesktop && (
        <motion.button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30 z-20"
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      )}

      {/* Voucher Detail Sheet */}
      <AnimatePresence>
        {selectedVoucher && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center" onClick={() => setSelectedVoucher(null)}>
            <motion.div initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }} animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }} exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-border/30" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-5 lg:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">{selectedVoucher.voucher_number}</h3>
                <span className={cn('px-3 py-1 rounded-lg text-xs font-medium', STATUS_COLORS[selectedVoucher.status])}>{selectedVoucher.status.replace('_', ' ')}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{selectedVoucher.narration}</p>

              {/* Lines */}
              <div className="rounded-xl border border-border overflow-hidden mb-4">
                <div className="bg-muted/50 px-3 py-2 flex text-[10px] font-medium text-muted-foreground uppercase">
                  <span className="flex-1">Ledger</span>
                  <span className="w-20 text-right">Debit</span>
                  <span className="w-20 text-right">Credit</span>
                </div>
                {voucherLines.filter(l => l.voucher_id === selectedVoucher.voucher_id).map(l => (
                  <div key={l.line_id} className="px-3 py-2.5 flex items-center border-t border-border/50">
                    <span className="flex-1 text-xs text-foreground truncate">{l.ledger_name || l.ledger_id}</span>
                    <span className="w-20 text-right text-xs font-medium">{l.debit > 0 ? `₹${l.debit.toLocaleString()}` : '—'}</span>
                    <span className="w-20 text-right text-xs font-medium">{l.credit > 0 ? `₹${l.credit.toLocaleString()}` : '—'}</span>
                  </div>
                ))}
                <div className="bg-muted/30 px-3 py-2 flex font-bold text-xs border-t border-border">
                  <span className="flex-1">Total</span>
                  <span className="w-20 text-right">₹{selectedVoucher.total_debit.toLocaleString()}</span>
                  <span className="w-20 text-right">₹{selectedVoucher.total_credit.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedVoucher.status === 'DRAFT' && (
                  <button onClick={() => handlePost(selectedVoucher)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Post Voucher
                  </button>
                )}
                {selectedVoucher.status === 'POSTED' && (
                  <button onClick={() => handleReverse(selectedVoucher)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-400 to-rose-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Reverse
                  </button>
                )}
                <button onClick={() => setSelectedVoucher(null)} className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-medium text-sm">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Voucher Sheet */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center" onClick={() => setShowCreate(false)}>
            <motion.div initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }} animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }} exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-border/30" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-5 lg:hidden" />
              <h3 className="text-lg font-bold text-foreground mb-4">Create Voucher</h3>

              {/* Voucher Type */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Voucher Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'ADVANCE', 'WRITE_OFF'] as VoucherType[]).map(t => (
                    <button key={t} onClick={() => setCreateType(t)} className={cn('p-2 rounded-xl text-center transition-all', createType === t ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground')}>
                      {(() => { const Icon = VOUCHER_CONFIG[t].icon; return <Icon className="w-4 h-4 mx-auto mb-1" />; })()}
                      <p className="text-[10px] font-medium">{VOUCHER_CONFIG[t].label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Mode (for Receipt/Payment) */}
              {(createType === 'RECEIPT' || createType === 'PAYMENT' || createType === 'CONTRA') && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Payment Mode</label>
                  <div className="flex gap-2">
                    {([{ mode: 'CASH', icon: Banknote, label: 'Cash' }, { mode: 'UPI', icon: Smartphone, label: 'UPI' }, { mode: 'BANK', icon: Building2, label: 'Bank' }] as const).map(m => (
                      <button key={m.mode} onClick={() => setPaymentMode(m.mode)} className={cn('flex-1 p-3 rounded-xl flex flex-col items-center gap-1 transition-all', paymentMode === m.mode ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground')}>
                        <m.icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Narration */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Narration</label>
                <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g., Receipt from Vijay Traders" className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-sm border border-border outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Debit/Credit Lines */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Entries (Dr / Cr)</label>
                  <button onClick={addLine} className="text-xs text-primary font-medium">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={line.ledger_id} onChange={e => { const nl = [...lines]; nl[i].ledger_id = e.target.value; setLines(nl); }} className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-foreground text-xs border border-border outline-none min-w-0">
                        <option value="">Select Ledger</option>
                        {ledgers.filter(l => l.classification !== 'CONTROL').map(l => (
                          <option key={l.ledger_id} value={l.ledger_id}>{l.ledger_name}</option>
                        ))}
                      </select>
                      <input type="number" value={line.debit} onChange={e => { const nl = [...lines]; nl[i].debit = e.target.value; if (e.target.value) nl[i].credit = ''; setLines(nl); }} placeholder="Dr" className="w-20 px-2 py-2.5 rounded-xl bg-muted text-foreground text-xs border border-border outline-none text-right" />
                      <input type="number" value={line.credit} onChange={e => { const nl = [...lines]; nl[i].credit = e.target.value; if (e.target.value) nl[i].debit = ''; setLines(nl); }} placeholder="Cr" className="w-20 px-2 py-2.5 rounded-xl bg-muted text-foreground text-xs border border-border outline-none text-right" />
                      {lines.length > 2 && <button onClick={() => removeLine(i)} className="text-destructive"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs font-bold px-1">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={isBalanced ? 'text-emerald-500' : 'text-destructive'}>
                    Dr ₹{totalDebit.toLocaleString()} = Cr ₹{totalCredit.toLocaleString()} {isBalanced ? '✓' : '✗'}
                  </span>
                </div>
              </div>

              <button onClick={handleCreate} disabled={!isBalanced || !narration.trim()} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-400 to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 disabled:opacity-50">
                Create as Draft
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isDesktop && <BottomNav />}
    </div>
  );
};

export default VouchersPage;
