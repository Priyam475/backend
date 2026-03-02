/**
 * Financial Reports — backend APIs only.
 * Data: chartOfAccountsApi, voucherHeadersApi, voucherLinesApi, arapDocumentsApi.
 * No localStorage, no Mkt keys, no mock data.
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, FileSpreadsheet, Receipt, Clock, Sparkles, PieChart, Scale, Landmark, HandCoins, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RPieChart, Pie, Legend } from 'recharts';
import type { COALedger, VoucherHeader, VoucherLine, ARAPDocument, TrialBalanceRow, PLRow, BalanceSheetRow, AgingBucket, CommodityProfitRow } from '@/types/accounting';
import { chartOfAccountsApi, dtoToCOALedger } from '@/services/api/chartOfAccounts';
import { voucherHeadersApi } from '@/services/api/voucherHeaders';
import { voucherLinesApi } from '@/services/api/voucherLines';
import { arapDocumentsApi } from '@/services/api/arapDocuments';
import { reportsApi } from '@/services/api/reports';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { toast } from 'sonner';

type ReportTab = 'TRIAL_BALANCE' | 'PL' | 'BALANCE_SHEET' | 'AR_AGING' | 'AP_AGING' | 'COMMODITY' | 'GST' | 'MARKET_FEE' | 'BROKER';

const TABS: { key: ReportTab; label: string; icon: typeof BarChart3; gradient: string; activeGradient: string }[] = [
  { key: 'TRIAL_BALANCE', label: 'Trial Balance', icon: Scale, gradient: 'from-blue-500/10 to-cyan-500/5', activeGradient: 'from-blue-500 to-cyan-500' },
  { key: 'PL', label: 'P & L', icon: TrendingUp, gradient: 'from-emerald-500/10 to-green-500/5', activeGradient: 'from-emerald-500 to-green-500' },
  { key: 'BALANCE_SHEET', label: 'Balance Sheet', icon: FileSpreadsheet, gradient: 'from-violet-500/10 to-purple-500/5', activeGradient: 'from-violet-500 to-purple-500' },
  { key: 'AR_AGING', label: 'AR Aging', icon: Clock, gradient: 'from-amber-500/10 to-orange-500/5', activeGradient: 'from-amber-500 to-orange-500' },
  { key: 'AP_AGING', label: 'AP Aging', icon: Clock, gradient: 'from-rose-500/10 to-pink-500/5', activeGradient: 'from-rose-500 to-pink-500' },
  { key: 'COMMODITY', label: 'Commodity P&L', icon: PieChart, gradient: 'from-teal-500/10 to-cyan-500/5', activeGradient: 'from-teal-500 to-cyan-500' },
  { key: 'GST', label: 'GST Report', icon: Receipt, gradient: 'from-indigo-500/10 to-blue-500/5', activeGradient: 'from-indigo-500 to-blue-500' },
  { key: 'MARKET_FEE', label: 'Market Fee', icon: Landmark, gradient: 'from-amber-500/10 to-yellow-500/5', activeGradient: 'from-amber-500 to-yellow-500' },
  { key: 'BROKER', label: 'Broker Settlement', icon: HandCoins, gradient: 'from-fuchsia-500/10 to-pink-500/5', activeGradient: 'from-fuchsia-500 to-pink-500' },
];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const FinancialReportsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [activeTab, setActiveTab] = useState<ReportTab>('TRIAL_BALANCE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const [ledgers, setLedgers] = useState<COALedger[]>([]);
  const [vouchers, setVouchers] = useState<VoucherHeader[]>([]);
  const [voucherLines, setVoucherLines] = useState<VoucherLine[]>([]);
  const [arapDocs, setArapDocs] = useState<ARAPDocument[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [plRows, setPlRows] = useState<PLRow[]>([]);
  const [bsRows, setBsRows] = useState<BalanceSheetRow[]>([]);
  const [arAging, setArAging] = useState<AgingBucket[]>([]);
  const [apAging, setApAging] = useState<AgingBucket[]>([]);
  const [commodityProfit, setCommodityProfit] = useState<CommodityProfitRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const all: COALedger[] = [];
        let page = 0;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const res = await chartOfAccountsApi.getPage({ page, size: 100, sort: 'ledgerName,asc' });
          res.content.forEach(dto => all.push(dtoToCOALedger(dto)));
          hasMore = page + 1 < res.totalPages;
          page += 1;
        }
        if (!cancelled) setLedgers(all);
      } catch {
        if (!cancelled) setLedgers([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const all: ARAPDocument[] = [];
        let page = 0;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const res = await arapDocumentsApi.getPage({ page, size: 100 });
          res.content.forEach(d => all.push(d));
          hasMore = page + 1 < res.totalPages;
          page += 1;
        }
        if (!cancelled) setArapDocs(all);
      } catch {
        if (!cancelled) setArapDocs([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dateFrom || !dateTo) {
      setVouchers([]);
      setVoucherLines([]);
      setTrialBalance([]);
      setCommodityProfit([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const allVouchers: VoucherHeader[] = [];
        let page = 0;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const res = await voucherHeadersApi.getPage({
            page,
            size: 100,
            sort: 'voucherDate,asc',
            dateFrom,
            dateTo,
          });
          res.content.forEach(v => allVouchers.push(v));
          hasMore = page + 1 < res.totalPages;
          page += 1;
        }
        if (cancelled) return;
        setVouchers(allVouchers);
        const [lines, tb, cp] = await Promise.all([
          voucherLinesApi.getByDateRange(dateFrom, dateTo),
          reportsApi.getTrialBalance(dateFrom, dateTo),
          reportsApi.getCommodityProfit(dateFrom, dateTo),
        ]);
        if (!cancelled) {
          setVoucherLines(lines);
          setTrialBalance(tb);
          setCommodityProfit(cp);
        }
      } catch (err) {
        if (!cancelled) {
          setVouchers([]);
          setVoucherLines([]);
          setTrialBalance([]);
          setCommodityProfit([]);
          toast.error((err as Error)?.message ?? 'Failed to load financial reports');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const filteredVoucherLines = useMemo(() => {
    if (!dateFrom && !dateTo) return voucherLines;
    return voucherLines;
  }, [voucherLines, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [pl, bs, ar, ap] = await Promise.all([
          reportsApi.getProfitAndLoss(),
          reportsApi.getBalanceSheet(),
          reportsApi.getAging('AR'),
          reportsApi.getAging('AP'),
        ]);
        if (!cancelled) {
          setPlRows(pl);
          setBsRows(bs);
          setArAging(ar);
          setApAging(ap);
        }
      } catch (err) {
        if (!cancelled) {
          setPlRows([]);
          setBsRows([]);
          setArAging([]);
          setApAging([]);
          toast.error((err as Error)?.message ?? 'Failed to load analytics');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const tbTotalDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const tbTotalCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

  const totalIncome = plRows.filter(r => r.category === 'INCOME').reduce((s, r) => s + r.amount, 0);
  const totalExpenses = plRows.filter(r => r.category === 'EXPENSE').reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const totalAssets = bsRows.filter(r => r.category === 'ASSET').reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = bsRows.filter(r => r.category === 'LIABILITY').reduce((s, r) => s + r.amount, 0);
  const totalEquity = bsRows.filter(r => r.category === 'EQUITY').reduce((s, r) => s + r.amount, 0);

  const gstInput = ledgers.find(l => l.ledger_id === 'ledger-gst-input')?.current_balance || 0;
  const gstOutput = ledgers.find(l => l.ledger_id === 'ledger-gst-output')?.current_balance || 0;
  const gstPayable = gstOutput - gstInput;
  const marketFee = ledgers.find(l => l.ledger_id === 'ledger-market-fee')?.current_balance || 0;
  const brokeragePayable = ledgers.find(l => l.ledger_id === 'ledger-brokerage-payable')?.current_balance || 0;

  const tbChartData = trialBalance.slice(0, 8).map(r => ({
    name: r.ledger_name.length > 12 ? r.ledger_name.slice(0, 12) + '…' : r.ledger_name,
    debit: r.debit, credit: r.credit,
  }));

  const plPieData = [
    ...(totalIncome > 0 ? [{ name: 'Income', value: totalIncome, fill: '#10b981' }] : []),
    ...(totalExpenses > 0 ? [{ name: 'Expenses', value: totalExpenses, fill: '#ef4444' }] : []),
  ];

  const bsPieData = [
    ...(totalAssets > 0 ? [{ name: 'Assets', value: totalAssets, fill: '#3b82f6' }] : []),
    ...(totalLiabilities > 0 ? [{ name: 'Liabilities', value: totalLiabilities, fill: '#ef4444' }] : []),
    ...(totalEquity > 0 ? [{ name: 'Equity', value: totalEquity, fill: '#8b5cf6' }] : []),
  ];

  const commodityChartData = commodityProfit.map(r => ({
    name: r.commodity_name.length > 10 ? r.commodity_name.slice(0, 10) + '…' : r.commodity_name,
    income: r.income, expenses: r.expenses, profit: r.profit,
  }));

  const scrollTabs = (dir: 'left' | 'right') => {
    tabScrollRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  const activeTabConfig = TABS.find(t => t.key === activeTab)!;

  const renderAgingTable = (data: AgingBucket[]) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="glass-card rounded-2xl py-8 text-center">
          <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No outstanding documents</p>
        </div>
      ) : (
        data.map(b => (
          <div key={b.contact_name} className="glass-card rounded-2xl p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold">{b.contact_name.charAt(0)}</span>
              </div>
              <p className="text-sm font-bold text-foreground">{b.contact_name}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Current', value: b.current, color: 'from-emerald-500/15 to-emerald-400/5 border-emerald-300/30', text: 'text-emerald-600 dark:text-emerald-400' },
                { label: '1-30 days', value: b.days_30, color: 'from-blue-500/15 to-blue-400/5 border-blue-300/30', text: 'text-blue-600 dark:text-blue-400' },
                { label: '31-60 days', value: b.days_60, color: 'from-amber-500/15 to-amber-400/5 border-amber-300/30', text: 'text-amber-600 dark:text-amber-400' },
                { label: '61-90 days', value: b.days_90, color: 'from-orange-500/15 to-orange-400/5 border-orange-300/30', text: 'text-orange-600 dark:text-orange-400' },
                { label: '90+ days', value: b.over_90, color: 'from-red-500/15 to-red-400/5 border-red-300/30', text: 'text-red-600 dark:text-red-400' },
                { label: 'Total', value: b.total, color: 'from-primary/15 to-primary/5 border-primary/30', text: 'text-foreground' },
              ].map(item => (
                <div key={item.label} className={cn("text-center p-2 rounded-xl bg-gradient-to-br border", item.color)}>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">{item.label}</p>
                  <p className={cn('text-sm font-bold', item.text)}>
                    {item.value > 0 ? `₹${(item.value / 1000).toFixed(1)}K` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-400 via-rose-500 to-red-500 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 px-5 rounded-b-[2.5rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
                style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
                animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
              />
            ))}
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Financial Reports
                </h1>
                <p className="text-white/70 text-xs">GAAP Compliant Reporting Engine</p>
              </div>
            </div>
            {/* Quick stats strip */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <p className="text-[9px] text-white/60 uppercase font-bold">Ledgers</p>
                <p className="text-base font-black text-white">{ledgers.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <p className="text-[9px] text-white/60 uppercase font-bold">Vouchers</p>
                <p className="text-base font-black text-white">{vouchers.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-2 text-center">
                <p className="text-[9px] text-white/60 uppercase font-bold">Net P&L</p>
                <p className={cn("text-base font-black", netProfit >= 0 ? 'text-emerald-200' : 'text-red-200')}>
                  {netProfit >= 0 ? '+' : ''}₹{Math.abs(netProfit).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <label className="text-[9px] text-white/60 uppercase font-bold absolute -top-3 left-3">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white text-xs border border-white/20 outline-none" />
              </div>
              <div className="flex-1 relative">
                <label className="text-[9px] text-white/60 uppercase font-bold absolute -top-3 left-3">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur text-white text-xs border border-white/20 outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">GAAP Compliant Reporting Engine</p>
              <p className="text-xs text-muted-foreground">{ledgers.length} ledgers · {vouchers.length} vouchers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 px-3 rounded-xl bg-muted/50 text-foreground text-xs border border-border focus:outline-none" placeholder="From" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 px-3 rounded-xl bg-muted/50 text-foreground text-xs border border-border focus:outline-none" placeholder="To" />
            </div>
          </div>
        </div>
      )}

      {/* Report Tabs — colorful with gradients */}
      <div className="px-2 -mt-4 relative z-10 mb-4">
        <div className="glass-card rounded-2xl p-2 flex items-center gap-1">
          <button onClick={() => scrollTabs('left')} className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 active:scale-90 transition-transform">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div ref={tabScrollRef} className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 scroll-smooth">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-[11px] font-semibold shrink-0 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95',
                    isActive
                      ? cn('bg-gradient-to-r text-white shadow-lg', t.activeGradient)
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => scrollTabs('right')} className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 active:scale-90 transition-transform">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

            {/* Trial Balance */}
            {activeTab === 'TRIAL_BALANCE' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-card rounded-2xl p-3 text-center bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-200/30 dark:border-blue-800/20">
                    <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-bold">Total Debit</p>
                    <p className="text-lg font-black text-foreground">₹{tbTotalDebit.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-200/30 dark:border-emerald-800/20">
                    <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-md">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Total Credit</p>
                    <p className="text-lg font-black text-foreground">₹{tbTotalCredit.toLocaleString()}</p>
                  </div>
                  <div className={cn("glass-card rounded-2xl p-3 text-center border",
                    tbTotalDebit === tbTotalCredit
                      ? "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-300/30"
                      : "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-300/30")}>
                    <div className={cn("w-8 h-8 mx-auto mb-1.5 rounded-lg flex items-center justify-center shadow-md",
                      tbTotalDebit === tbTotalCredit ? "bg-gradient-to-br from-emerald-500 to-green-500" : "bg-gradient-to-br from-red-500 to-rose-500")}>
                      <Scale className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Status</p>
                    <p className={cn('text-lg font-black', tbTotalDebit === tbTotalCredit ? 'text-emerald-500' : 'text-destructive')}>
                      {tbTotalDebit === tbTotalCredit ? '✓ OK' : '⚠ Off'}
                    </p>
                  </div>
                </div>

                {tbChartData.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-blue-200/20 dark:border-blue-800/10">
                    <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                        <BarChart3 className="w-3 h-3 text-white" />
                      </div>
                      Ledger Balances
                    </p>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tbChartData} barGap={2}>
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={45} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} width={50} />
                          <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                          <Bar dataKey="debit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Debit" />
                          <Bar dataKey="credit" fill="#10b981" radius={[4, 4, 0, 0]} name="Credit" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-2xl overflow-hidden border border-border/30">
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/5 px-4 py-2.5 flex text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex-1">Ledger</span>
                    <span className="w-20 text-right">Debit</span>
                    <span className="w-20 text-right">Credit</span>
                  </div>
                  {trialBalance.map((r, i) => (
                    <motion.div key={r.ledger_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="px-4 py-3 flex items-center border-t border-border/30 hover:bg-muted/20 active:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/ledger-view/${r.ledger_id}`)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate font-medium">{r.ledger_name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.accounting_class}</p>
                      </div>
                      <span className={cn("w-20 text-right text-sm font-semibold", r.debit > 0 && "text-blue-600 dark:text-blue-400")}>{r.debit > 0 ? `₹${r.debit.toLocaleString()}` : '—'}</span>
                      <span className={cn("w-20 text-right text-sm font-semibold", r.credit > 0 && "text-emerald-600 dark:text-emerald-400")}>{r.credit > 0 ? `₹${r.credit.toLocaleString()}` : '—'}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Profit & Loss */}
            {activeTab === 'PL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-card rounded-2xl p-3 text-center bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-200/30 dark:border-emerald-800/20">
                    <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-md">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-emerald-500 uppercase font-bold">Income</p>
                    <p className="text-lg font-black text-foreground">₹{totalIncome.toLocaleString()}</p>
                  </div>
                  <div className="glass-card rounded-2xl p-3 text-center bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-200/30 dark:border-rose-800/20">
                    <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md">
                      <TrendingDown className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-rose-500 uppercase font-bold">Expenses</p>
                    <p className="text-lg font-black text-foreground">₹{totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className={cn("glass-card rounded-2xl p-3 text-center border",
                    netProfit >= 0 ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-300/30" : "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-300/30")}>
                    <div className={cn("w-8 h-8 mx-auto mb-1.5 rounded-lg flex items-center justify-center shadow-md",
                      netProfit >= 0 ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-red-500 to-rose-500")}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-[9px] text-primary uppercase font-bold">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                    <p className={cn('text-lg font-black', netProfit >= 0 ? 'text-emerald-500' : 'text-destructive')}>₹{Math.abs(netProfit).toLocaleString()}</p>
                  </div>
                </div>

                {plPieData.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-emerald-200/20 dark:border-emerald-800/10">
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                        <PieChart className="w-3 h-3 text-white" />
                      </div>
                      Income vs Expenses
                    </p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie data={plPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {plPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-200/20 dark:border-emerald-800/10">
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/15 to-green-500/5 font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-3.5 h-3.5 text-white" />
                    </div>
                    Income
                  </div>
                  {plRows.filter(r => r.category === 'INCOME').map(r => (
                    <div key={r.ledger_name} className="px-4 py-3 flex justify-between border-t border-border/30">
                      <span className="text-sm text-foreground">{r.ledger_name}</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">₹{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {plRows.filter(r => r.category === 'INCOME').length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground">No income recorded</div>
                  )}
                </div>
                <div className="glass-card rounded-2xl overflow-hidden border border-rose-200/20 dark:border-rose-800/10">
                  <div className="px-4 py-3 bg-gradient-to-r from-rose-500/15 to-pink-500/5 font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-sm">
                      <TrendingDown className="w-3.5 h-3.5 text-white" />
                    </div>
                    Expenses
                  </div>
                  {plRows.filter(r => r.category === 'EXPENSE').map(r => (
                    <div key={r.ledger_name} className="px-4 py-3 flex justify-between border-t border-border/30">
                      <span className="text-sm text-foreground">{r.ledger_name}</span>
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">₹{r.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {plRows.filter(r => r.category === 'EXPENSE').length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground">No expenses recorded</div>
                  )}
                </div>
              </div>
            )}

            {/* Balance Sheet */}
            {activeTab === 'BALANCE_SHEET' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Assets', value: totalAssets, icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-500/10 to-cyan-500/5 border-blue-200/30 dark:border-blue-800/20', text: 'text-blue-500' },
                    { label: 'Liabilities', value: totalLiabilities, icon: TrendingDown, gradient: 'from-rose-500 to-pink-500', bg: 'from-rose-500/10 to-pink-500/5 border-rose-200/30 dark:border-rose-800/20', text: 'text-rose-500' },
                    { label: 'Equity', value: totalEquity, icon: Sparkles, gradient: 'from-violet-500 to-purple-500', bg: 'from-violet-500/10 to-purple-500/5 border-violet-200/30 dark:border-violet-800/20', text: 'text-violet-500' },
                  ].map(c => (
                    <div key={c.label} className={cn("glass-card rounded-2xl p-3 text-center bg-gradient-to-br border", c.bg)}>
                      <div className={cn("w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md", c.gradient)}>
                        <c.icon className="w-4 h-4 text-white" />
                      </div>
                      <p className={cn("text-[9px] uppercase font-bold", c.text)}>{c.label}</p>
                      <p className="text-lg font-black text-foreground">₹{c.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {bsPieData.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-violet-200/20 dark:border-violet-800/10">
                    <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                        <PieChart className="w-3 h-3 text-white" />
                      </div>
                      Balance Sheet Breakdown
                    </p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <RPieChart>
                          <Pie data={bsPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {bsPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                        </RPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {(['ASSET', 'LIABILITY', 'EQUITY'] as const).map(cat => {
                  const rows = bsRows.filter(r => r.category === cat);
                  const config = cat === 'ASSET'
                    ? { label: 'Assets', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-500/15 to-cyan-500/5', border: 'border-blue-200/20 dark:border-blue-800/10', text: 'text-blue-600 dark:text-blue-400' }
                    : cat === 'LIABILITY'
                    ? { label: 'Liabilities', icon: TrendingDown, gradient: 'from-rose-500 to-pink-500', bg: 'from-rose-500/15 to-pink-500/5', border: 'border-rose-200/20 dark:border-rose-800/10', text: 'text-rose-600 dark:text-rose-400' }
                    : { label: 'Equity', icon: Sparkles, gradient: 'from-violet-500 to-purple-500', bg: 'from-violet-500/15 to-purple-500/5', border: 'border-violet-200/20 dark:border-violet-800/10', text: 'text-violet-600 dark:text-violet-400' };
                  return (
                    <div key={cat} className={cn("glass-card rounded-2xl overflow-hidden border", config.border)}>
                      <div className={cn('px-4 py-3 font-bold text-sm flex items-center gap-2 bg-gradient-to-r', config.bg, config.text)}>
                        <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm", config.gradient)}>
                          <config.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        {config.label}
                      </div>
                      {rows.length === 0 ? (
                        <div className="px-4 py-4 text-center text-sm text-muted-foreground">No {config.label.toLowerCase()}</div>
                      ) : rows.map(r => (
                        <div key={r.ledger_name} className="px-4 py-3 flex justify-between border-t border-border/30">
                          <span className="text-sm text-foreground">{r.ledger_name}</span>
                          <span className={cn("text-sm font-semibold", config.text)}>₹{r.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* AR Aging */}
            {activeTab === 'AR_AGING' && (
              <div className="space-y-3">
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-200/30 dark:border-amber-800/20">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total AR Outstanding</p>
                    <p className="text-xl font-black text-foreground">₹{arAging.reduce((s, a) => s + a.total, 0).toLocaleString()}</p>
                  </div>
                </div>
                {renderAgingTable(arAging)}
              </div>
            )}

            {/* AP Aging */}
            {activeTab === 'AP_AGING' && (
              <div className="space-y-3">
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br from-rose-500/10 to-pink-500/5 border border-rose-200/30 dark:border-rose-800/20">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total AP Outstanding</p>
                    <p className="text-xl font-black text-foreground">₹{apAging.reduce((s, a) => s + a.total, 0).toLocaleString()}</p>
                  </div>
                </div>
                {renderAgingTable(apAging)}
              </div>
            )}

            {/* Commodity Profitability */}
            {activeTab === 'COMMODITY' && (
              <div className="space-y-4">
                {commodityChartData.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-teal-200/20 dark:border-teal-800/10">
                    <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm">
                        <BarChart3 className="w-3 h-3 text-white" />
                      </div>
                      Commodity Performance
                    </p>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={commodityChartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} width={50} />
                          <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {commodityProfit.length === 0 ? (
                  <div className="glass-card rounded-2xl py-8 text-center">
                    <PieChart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No commodity data</p>
                  </div>
                ) : (
                  commodityProfit.map((r, i) => (
                    <motion.div key={r.commodity_name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass-card rounded-2xl p-4 border border-teal-200/20 dark:border-teal-800/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">{r.commodity_name.charAt(0)}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">{r.commodity_name}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 border border-emerald-300/20">
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Income</p>
                          <p className="text-sm font-bold text-foreground">₹{r.income.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-400/5 border border-rose-300/20">
                          <p className="text-[9px] text-rose-600 dark:text-rose-400 uppercase font-bold">Expense</p>
                          <p className="text-sm font-bold text-foreground">₹{r.expenses.toLocaleString()}</p>
                        </div>
                        <div className={cn("text-center p-2 rounded-xl border",
                          r.profit >= 0 ? "bg-gradient-to-br from-emerald-500/15 to-emerald-400/5 border-emerald-300/20" : "bg-gradient-to-br from-red-500/15 to-red-400/5 border-red-300/20")}>
                          <p className="text-[9px] text-primary uppercase font-bold">Profit</p>
                          <p className={cn('text-sm font-bold', r.profit >= 0 ? 'text-emerald-500' : 'text-destructive')}>₹{Math.abs(r.profit).toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* GST Report */}
            {activeTab === 'GST' && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5 border border-indigo-200/20 dark:border-indigo-800/10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-lg">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">GST Summary</p>
                      <p className="text-xs text-muted-foreground">Input vs Output Tax</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-300/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                          <TrendingDown className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm text-foreground font-medium">GST Input Credit</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{gstInput.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/5 border border-rose-300/20">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-sm">
                          <TrendingUp className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm text-foreground font-medium">GST Output Liability</span>
                      </div>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">₹{gstOutput.toLocaleString()}</span>
                    </div>
                    <div className={cn("flex justify-between items-center p-4 rounded-xl border",
                      gstPayable >= 0 ? "bg-gradient-to-r from-red-500/10 to-rose-500/5 border-red-300/20" : "bg-gradient-to-r from-emerald-500/10 to-green-500/5 border-emerald-300/20")}>
                      <span className="text-sm font-bold text-foreground">Net GST {gstPayable >= 0 ? 'Payable' : 'Refundable'}</span>
                      <span className={cn('text-xl font-black', gstPayable >= 0 ? 'text-destructive' : 'text-emerald-500')}>₹{Math.abs(gstPayable).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Market Fee Report */}
            {activeTab === 'MARKET_FEE' && (
              <div className="glass-card rounded-2xl p-5 border border-amber-200/20 dark:border-amber-800/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Market Fee</p>
                    <p className="text-xs text-muted-foreground">Payable to market committee</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-400/20 text-center">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold mb-1">Total Payable</p>
                  <p className="text-3xl font-black text-foreground">₹{marketFee.toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Accumulated market fee liability from all posted sales bills.</p>
              </div>
            )}

            {/* Broker Settlement */}
            {activeTab === 'BROKER' && (
              <div className="glass-card rounded-2xl p-5 border border-fuchsia-200/20 dark:border-fuchsia-800/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-pink-500 flex items-center justify-center shadow-lg">
                    <HandCoins className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Broker Settlement</p>
                    <p className="text-xs text-muted-foreground">Brokerage payable (Master)</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-fuchsia-500/15 to-pink-500/5 border border-fuchsia-400/20 text-center">
                  <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 uppercase font-bold mb-1">Total Brokerage Payable</p>
                  <p className="text-3xl font-black text-foreground">₹{brokeragePayable.toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Total accumulated brokerage from all posted transactions. Settable per broker via allocation engine.</p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default FinancialReportsPage;
