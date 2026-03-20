import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Wallet,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { COALedger, VoucherLine } from '@/types/accounting';
import { contactApi } from '@/services/api';
import { dtoToCOALedger } from '@/services/api/chartOfAccounts';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';

function defaultDateFrom(): string {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const ContactLedgerViewPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const { contactId } = useParams<{ contactId: string }>();
  const [contactName, setContactName] = useState<string>('');
  const [ledgers, setLedgers] = useState<COALedger[]>([]);
  const [transactions, setTransactions] = useState<VoucherLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [linesLoading, setLinesLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [contactResult, ledgersResult] = await Promise.allSettled([
          contactApi.getById(contactId),
          contactApi.getContactLedgers(contactId),
        ]);
        if (!cancelled) {
          const contact = contactResult.status === 'fulfilled' ? contactResult.value : null;
          const ledgersData = ledgersResult.status === 'fulfilled' ? ledgersResult.value : [];
          setContactName(contact?.name ?? 'Contact');
          setLedgers(Array.isArray(ledgersData) ? ledgersData.map(dto => dtoToCOALedger(dto)) : []);
        }
      } catch {
        if (!cancelled) setLedgers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [contactId]);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    const effectiveFrom = dateFrom.trim() || defaultDateFrom();
    const effectiveTo = dateTo.trim() || defaultDateTo();

    const load = async () => {
      setLinesLoading(true);
      try {
        const lines = await contactApi.getContactLedgerTransactions(
          contactId,
          effectiveFrom,
          effectiveTo
        );
        if (!cancelled) {
          setTransactions(
            lines.map(l => ({
              line_id: String(l.lineId ?? ''),
              voucher_id: String(l.voucherId ?? ''),
              ledger_id: String(l.ledgerId ?? ''),
              ledger_name: l.ledgerName,
              debit: Number(l.debit ?? 0),
              credit: Number(l.credit ?? 0),
              voucher_date: l.voucherDate,
              voucher_number: l.voucherNumber,
              voucher_type: (l.voucherType ?? 'JOURNAL') as VoucherLine['voucher_type'],
              narration: l.narration,
              status: (l.status ?? 'POSTED') as VoucherLine['status'],
            }))
          );
        }
      } catch {
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setLinesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [contactId, dateFrom, dateTo]);

  const filteredLines = transactions.filter(l => l.status !== 'REVERSED');

  const receivableBalance = ledgers
    .filter(l => l.classification === 'RECEIVABLE')
    .reduce((s, l) => s + l.current_balance, 0);
  const payableBalance = ledgers
    .filter(l => l.classification === 'PAYABLE')
    .reduce((s, l) => s + l.current_balance, 0);
  const netExposure = receivableBalance - payableBalance;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 px-5 rounded-b-[2.5rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => navigate('/contacts')}
                className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{contactName}</h1>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/20 text-[10px] text-white/90 font-semibold">
                    Ledger Statement
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/contacts')}
              className="h-9 px-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium flex items-center gap-1.5 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{contactName}</h2>
              <p className="text-sm text-muted-foreground">Contact Ledger Statement</p>
            </div>
          </div>
        </div>
      )}

      {/* Ledgers Section */}
      <div className={cn('mb-4', isDesktop ? 'px-8' : 'px-4')}>
        <div className="glass-card rounded-2xl p-4 border border-border/30">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Ledgers
          </p>
          {ledgers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledgers for this contact</p>
          ) : (
            <div className="space-y-2">
              {ledgers.map(l => (
                <motion.div
                  key={l.ledger_id}
                  onClick={() => navigate(`/ledger-view/${l.ledger_id}`)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md',
                    l.current_balance >= 0
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        l.current_balance >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                      )}
                    >
                      <BookOpen className={cn('w-4 h-4', l.current_balance >= 0 ? 'text-emerald-600' : 'text-rose-600')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{l.ledger_name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.classification}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        l.current_balance >= 0 ? 'text-emerald-600' : 'text-destructive'
                      )}
                    >
                      ₹{Math.abs(l.current_balance).toLocaleString()} {l.current_balance >= 0 ? 'Dr' : 'Cr'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Net Exposure */}
      {ledgers.length > 0 && (
        <div className={cn('mb-4', isDesktop ? 'px-8' : 'px-4')}>
          <div className="glass-card rounded-2xl p-4 border border-primary/10">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Net Exposure (informational)
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
                <p
                  className={cn(
                    'text-sm font-bold',
                    netExposure >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  )}
                >
                  ₹{Math.abs(netExposure).toLocaleString()} {netExposure >= 0 ? 'Dr' : 'Cr'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Filters */}
      <div className={cn('mb-4', isDesktop ? 'px-8' : 'px-4')}>
        <div className="glass-card rounded-2xl p-3 flex items-center gap-3">
          <Calendar className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs border border-border outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs border border-border outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="To"
          />
        </div>
      </div>

      {/* Transaction Table */}
      <div className={cn(isDesktop ? 'px-8' : 'px-4')}>
        <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-border/30">
          <div className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 px-4 py-3 flex text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="w-16">Date</span>
            <span className="flex-1 min-w-0">Ledger</span>
            <span className="w-16 hidden sm:block">Voucher #</span>
            <span className="w-20 hidden sm:block">Type</span>
            <span className="flex-1 min-w-0 truncate">Narration</span>
            <span className="w-20 text-right">Debit</span>
            <span className="w-20 text-right">Credit</span>
          </div>

          {linesLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading transactions…</p>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mx-auto mb-3 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions in this period</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Try adjusting the date filters</p>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredLines.map((line, i) => (
                <motion.div
                  key={line.line_id || i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="px-4 py-3 flex items-center border-b border-border/10 hover:bg-muted/40 transition-all text-sm"
                >
                  <span className="w-16 text-[10px] text-muted-foreground font-medium shrink-0">
                    {line.voucher_date?.slice(5) ?? '—'}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-xs font-medium" title={line.ledger_name}>
                    {line.ledger_name ?? '—'}
                  </span>
                  <span className="w-16 hidden sm:block text-[10px] text-muted-foreground truncate">
                    {line.voucher_number ?? '—'}
                  </span>
                  <span className="w-20 hidden sm:block">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {(line.voucher_type ?? 'JOURNAL').replace('_', ' ')}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0 truncate text-xs text-muted-foreground" title={line.narration}>
                    {line.narration ?? '—'}
                  </span>
                  <span className="w-20 text-right text-xs font-semibold shrink-0">
                    {line.debit > 0 && (
                      <span className="text-blue-600 dark:text-blue-400">₹{line.debit.toLocaleString()}</span>
                    )}
                  </span>
                  <span className="w-20 text-right text-xs font-semibold shrink-0">
                    {line.credit > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">₹{line.credit.toLocaleString()}</span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isDesktop && <BottomNav />}
    </div>
  );
};

export default ContactLedgerViewPage;
