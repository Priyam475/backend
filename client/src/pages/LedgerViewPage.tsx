import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, ChevronRight, Wallet, TrendingDown, PiggyBank, TrendingUp, Building2, BookOpen, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { COALedger, VoucherHeader, VoucherLine, LedgerTransaction, AccountingClass } from '@/types/accounting';
import { initializeAccountingData } from '@/services/accountingData';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';

initializeAccountingData();

const CLASS_THEME: Record<AccountingClass, {
  gradient: string;
  headerGradient: string;
  glow: string;
  accent: string;
  accentBg: string;
  icon: typeof Wallet;
  label: string;
  rowStripe: string;
  badgeGradient: string;
}> = {
  ASSET: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    headerGradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    glow: 'shadow-emerald-500/25',
    accent: 'text-emerald-600 dark:text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    icon: Wallet,
    label: 'Asset',
    rowStripe: 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]',
    badgeGradient: 'from-emerald-500 to-teal-500',
  },
  LIABILITY: {
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
    headerGradient: 'from-rose-400 via-pink-500 to-fuchsia-500',
    glow: 'shadow-rose-500/25',
    accent: 'text-rose-600 dark:text-rose-400',
    accentBg: 'bg-rose-500/10',
    icon: TrendingDown,
    label: 'Liability',
    rowStripe: 'bg-rose-500/[0.03] dark:bg-rose-500/[0.05]',
    badgeGradient: 'from-rose-500 to-pink-500',
  },
  EQUITY: {
    gradient: 'from-violet-400 via-purple-500 to-indigo-500',
    headerGradient: 'from-violet-400 via-purple-500 to-indigo-500',
    glow: 'shadow-violet-500/25',
    accent: 'text-violet-600 dark:text-violet-400',
    accentBg: 'bg-violet-500/10',
    icon: PiggyBank,
    label: 'Equity',
    rowStripe: 'bg-violet-500/[0.03] dark:bg-violet-500/[0.05]',
    badgeGradient: 'from-violet-500 to-purple-500',
  },
  INCOME: {
    gradient: 'from-blue-400 via-indigo-500 to-cyan-500',
    headerGradient: 'from-blue-400 via-indigo-500 to-cyan-500',
    glow: 'shadow-blue-500/25',
    accent: 'text-blue-600 dark:text-blue-400',
    accentBg: 'bg-blue-500/10',
    icon: TrendingUp,
    label: 'Income',
    rowStripe: 'bg-blue-500/[0.03] dark:bg-blue-500/[0.05]',
    badgeGradient: 'from-blue-500 to-cyan-500',
  },
  EXPENSE: {
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    headerGradient: 'from-amber-400 via-orange-500 to-red-500',
    glow: 'shadow-amber-500/25',
    accent: 'text-amber-600 dark:text-amber-400',
    accentBg: 'bg-amber-500/10',
    icon: Building2,
    label: 'Expense',
    rowStripe: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]',
    badgeGradient: 'from-amber-500 to-orange-500',
  },
};

const LedgerViewPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const [ledgers] = useState<COALedger[]>(() => JSON.parse(localStorage.getItem('mkt_coa_ledgers') || '[]'));
  const [vouchers] = useState<VoucherHeader[]>(() => JSON.parse(localStorage.getItem('mkt_acc_vouchers') || '[]'));
  const [voucherLines] = useState<VoucherLine[]>(() => JSON.parse(localStorage.getItem('mkt_acc_voucher_lines') || '[]'));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const ledger = ledgers.find(l => l.ledger_id === ledgerId);

  // Build transaction list with running balance
  const transactions = useMemo((): LedgerTransaction[] => {
    if (!ledger) return [];
    const relatedLines = voucherLines.filter(l => l.ledger_id === ledgerId);
    const txns: LedgerTransaction[] = [];
    let runningBalance = ledger.opening_balance;

    relatedLines.forEach(line => {
      const voucher = vouchers.find(v => v.voucher_id === line.voucher_id);
      if (!voucher || voucher.status === 'REVERSED') return;
      if (dateFrom && voucher.voucher_date < dateFrom) return;
      if (dateTo && voucher.voucher_date > dateTo) return;

      runningBalance += line.debit - line.credit;
      txns.push({
        date: voucher.voucher_date,
        voucher_number: voucher.voucher_number,
        voucher_type: voucher.voucher_type,
        narration: voucher.narration,
        debit: line.debit,
        credit: line.credit,
        running_balance: runningBalance,
      });
    });

    return txns;
  }, [ledger, voucherLines, vouchers, ledgerId, dateFrom, dateTo]);

  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].running_balance : (ledger?.opening_balance || 0);

  // Contact consolidated view
  const contactLedgers = useMemo(() => {
    if (!ledger?.contact_id) return [];
    return ledgers.filter(l => l.contact_id === ledger.contact_id);
  }, [ledger, ledgers]);

  const receivableBalance = contactLedgers.filter(l => l.classification === 'RECEIVABLE').reduce((s, l) => s + l.current_balance, 0);
  const payableBalance = contactLedgers.filter(l => l.classification === 'PAYABLE').reduce((s, l) => s + l.current_balance, 0);
  const netExposure = receivableBalance - payableBalance;

  if (!ledger) return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Ledger not found</p>
    </div>
  );

  const theme = CLASS_THEME[ledger.accounting_class] || CLASS_THEME.ASSET;
  const ThemeIcon = theme.icon;
  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className={cn("relative overflow-hidden bg-gradient-to-br pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 px-5 rounded-b-[2.5rem]", theme.headerGradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
                style={{ left: `${15 + Math.random() * 70}%`, top: `${10 + Math.random() * 80}%` }}
                animate={{ y: [-8, 8], opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{ledger.ledger_name}</h1>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] text-white/90 font-semibold">{theme.label}</span>
                  <span className="text-white/60 text-xs">• {ledger.classification}</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/25">
                <ThemeIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 bg-white/15 backdrop-blur-md rounded-xl p-3 text-center border border-white/20">
                <p className="text-[9px] text-white/60 uppercase font-semibold tracking-wider">Opening</p>
                <p className="text-base font-black text-white">₹{ledger.opening_balance.toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-white/15 backdrop-blur-md rounded-xl p-3 text-center border border-white/20">
                <p className="text-[9px] text-white/60 uppercase font-semibold tracking-wider">Closing</p>
                <p className="text-base font-black text-white">₹{closingBalance.toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-md rounded-xl p-3 text-center border border-white/30 shadow-md">
                <p className="text-[9px] text-white/70 uppercase font-semibold tracking-wider">Current</p>
                <p className="text-base font-black text-white">₹{ledger.current_balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate(-1)} className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", theme.gradient, theme.glow)}>
              <ThemeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{ledger.ledger_name}</h2>
              <div className="flex items-center gap-2">
                <span className={cn("px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r", theme.badgeGradient)}>{theme.label}</span>
                <span className="text-sm text-muted-foreground">• {ledger.classification}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className={cn("glass-card rounded-2xl p-4 border-l-4", `border-l-${ledger.accounting_class === 'ASSET' ? 'emerald' : ledger.accounting_class === 'LIABILITY' ? 'rose' : ledger.accounting_class === 'EQUITY' ? 'violet' : ledger.accounting_class === 'INCOME' ? 'blue' : 'amber'}-500`)}>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Opening</p>
              <p className="text-lg font-black text-foreground">₹{ledger.opening_balance.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Debit</p>
              <p className="text-lg font-black text-foreground">₹{totalDebit.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-pink-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Credit</p>
              <p className="text-lg font-black text-foreground">₹{totalCredit.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-indigo-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Closing</p>
              <p className="text-lg font-black text-foreground">₹{closingBalance.toLocaleString()}</p>
            </div>
            <div className={cn("glass-card rounded-2xl p-4 bg-gradient-to-br from-transparent to-transparent border", ledger.current_balance >= 0 ? 'border-emerald-500/20' : 'border-destructive/20')}>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Current Balance</p>
              <p className={cn("text-lg font-black", ledger.current_balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>₹{ledger.current_balance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Summary Cards */}
      {!isDesktop && (
        <div className="px-4 -mt-4 relative z-10 mb-3">
          <div className="flex gap-2">
            <div className={cn("flex-1 glass-card rounded-2xl p-3 border", theme.accentBg)}>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Debit</p>
              </div>
              <p className="text-sm font-black text-foreground">₹{totalDebit.toLocaleString()}</p>
            </div>
            <div className={cn("flex-1 glass-card rounded-2xl p-3 border", theme.accentBg)}>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                <p className="text-[9px] text-muted-foreground uppercase font-semibold">Credit</p>
              </div>
              <p className="text-sm font-black text-foreground">₹{totalCredit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Net Exposure (if contact-linked) */}
      {ledger.contact_id && contactLedgers.length > 1 && (
        <div className="px-4 mb-4">
          <div className="glass-card rounded-2xl p-4 border border-primary/10">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Contact Net Exposure
            </p>
            <div className="flex gap-3">
              <div className="flex-1 text-center rounded-xl bg-emerald-500/10 p-2">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Receivable</p>
                <p className="text-sm font-bold text-foreground">₹{receivableBalance.toLocaleString()}</p>
              </div>
              <div className="flex-1 text-center rounded-xl bg-rose-500/10 p-2">
                <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold">Payable</p>
                <p className="text-sm font-bold text-foreground">₹{payableBalance.toLocaleString()}</p>
              </div>
              <div className="flex-1 text-center rounded-xl bg-primary/10 p-2">
                <p className="text-[10px] text-primary uppercase font-bold">Net</p>
                <p className={cn('text-sm font-bold', netExposure >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                  ₹{Math.abs(netExposure).toLocaleString()} {netExposure >= 0 ? 'Dr' : 'Cr'}
                </p>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 italic">AR and AP remain separate in books. No automatic netting.</p>
          </div>
        </div>
      )}

      {/* Date Filters */}
      <div className="px-4 mb-4">
        <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
          <Calendar className={cn("w-4 h-4 shrink-0", theme.accent)} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs border border-border outline-none focus:ring-2 focus:ring-primary/20" placeholder="From" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs border border-border outline-none focus:ring-2 focus:ring-primary/20" placeholder="To" />
        </div>
      </div>

      {/* Transaction Table */}
      <div className="px-4">
        <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-border/30">
          {/* Table Header */}
          <div className={cn("bg-gradient-to-r px-4 py-3 flex text-[10px] font-bold uppercase tracking-wider text-white", theme.gradient)}>
            <span className="w-16">Date</span>
            <span className="flex-1">Particulars</span>
            <span className="w-20 text-right">Debit</span>
            <span className="w-20 text-right">Credit</span>
            <span className="w-24 text-right">Balance</span>
          </div>

          {/* Opening Balance Row */}
          <div className={cn("px-4 py-3 flex items-center border-b border-border/20", theme.accentBg)}>
            <span className="w-16 text-[10px] text-muted-foreground font-medium">—</span>
            <span className={cn("flex-1 text-xs font-bold flex items-center gap-1.5", theme.accent)}>
              <div className={cn("w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center", theme.gradient)}>
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              Opening Balance
            </span>
            <span className="w-20"></span>
            <span className="w-20"></span>
            <span className="w-24 text-right text-xs font-black text-foreground">₹{ledger.opening_balance.toLocaleString()}</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br mx-auto mb-3 flex items-center justify-center opacity-30", theme.gradient)}>
                <ThemeIcon className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions in this period</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Try adjusting the date filters</p>
            </div>
          ) : (
            transactions.map((txn, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "px-4 py-3 flex items-center border-b border-border/10 hover:bg-muted/40 transition-all cursor-default group",
                  i % 2 === 0 ? theme.rowStripe : ''
                )}
              >
                <span className="w-16 text-[10px] text-muted-foreground font-medium">{txn.date.slice(5)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate font-medium group-hover:text-primary transition-colors">{txn.narration}</p>
                  <p className="text-[9px] text-muted-foreground/70 flex items-center gap-1">
                    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold", theme.accentBg, theme.accent)}>{txn.voucher_type.replace('_', ' ')}</span>
                    {txn.voucher_number}
                  </p>
                </div>
                <span className="w-20 text-right text-xs font-semibold">
                  {txn.debit > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">₹{txn.debit.toLocaleString()}</span>
                  )}
                </span>
                <span className="w-20 text-right text-xs font-semibold">
                  {txn.credit > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">₹{txn.credit.toLocaleString()}</span>
                  )}
                </span>
                <span className={cn('w-24 text-right text-xs font-black', txn.running_balance >= 0 ? 'text-foreground' : 'text-destructive')}>
                  ₹{Math.abs(txn.running_balance).toLocaleString()}
                </span>
              </motion.div>
            ))
          )}

          {/* Closing Balance */}
          <div className={cn("px-4 py-3 flex items-center", theme.accentBg, "border-t-2", `border-t-${ledger.accounting_class === 'ASSET' ? 'emerald' : ledger.accounting_class === 'LIABILITY' ? 'rose' : ledger.accounting_class === 'EQUITY' ? 'violet' : ledger.accounting_class === 'INCOME' ? 'blue' : 'amber'}-500/30`)}>
            <span className="w-16 text-[10px] text-muted-foreground font-medium">—</span>
            <span className={cn("flex-1 text-xs font-bold flex items-center gap-1.5", theme.accent)}>
              <div className={cn("w-5 h-5 rounded-md bg-gradient-to-br flex items-center justify-center", theme.gradient)}>
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              Closing Balance
            </span>
            <span className="w-20 text-right text-xs font-bold text-blue-600 dark:text-blue-400">₹{totalDebit.toLocaleString()}</span>
            <span className="w-20 text-right text-xs font-bold text-rose-600 dark:text-rose-400">₹{totalCredit.toLocaleString()}</span>
            <span className={cn("w-24 text-right text-sm font-black", closingBalance >= 0 ? theme.accent : 'text-destructive')}>₹{Math.abs(closingBalance).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {!isDesktop && <BottomNav />}
    </div>
  );
};

export default LedgerViewPage;
