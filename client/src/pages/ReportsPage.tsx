import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BarChart3, Search, FileText, Download, Calendar,
  DollarSign, Users, Package, Truck, AlertTriangle, TrendingUp,
  Shield, Eye, X, Printer, PieChart, IndianRupee, Wallet, CreditCard, Ban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { useAuctionResults } from '@/hooks/useAuctionResults';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

/* ── Report Types ── */
const reportTypes = [
  { id: 'daily_sales', name: 'Daily Sales Summary', icon: TrendingUp, desc: 'Total bills, bags, revenue, commission, collections', color: 'from-blue-500 to-cyan-400' },
  { id: 'bill_register', name: 'Bill Register', icon: FileText, desc: 'Date-range filtered bill history with version tracking', color: 'from-violet-500 to-purple-400' },
  { id: 'gst_report', name: 'GST Report', icon: Shield, desc: 'Input/Output GST with HSN code breakdown', color: 'from-red-500 to-rose-400' },
  { id: 'arrival_report', name: 'Arrival Report', icon: Truck, desc: 'Farmer arrivals with freight & advance details', color: 'from-emerald-500 to-teal-400' },
  { id: 'patti_register', name: 'Sales Invoice (Patti) Register', icon: FileText, desc: 'Seller settlement register', color: 'from-amber-500 to-orange-400' },
  { id: 'lot_reconciliation', name: 'Lot Reconciliation', icon: Package, desc: 'Arrived vs sold bags with pending balance', color: 'from-indigo-500 to-blue-400' },
  { id: 'collection_report', name: 'Collection Report', icon: DollarSign, desc: 'Cash and bank collections by date', color: 'from-pink-500 to-rose-400' },
  { id: 'party_exposure', name: 'Party Exposure Summary', icon: AlertTriangle, desc: 'Outstanding amounts with risk levels', color: 'from-amber-500 to-yellow-400' },
  { id: 'commission_income', name: 'Commission Income Report', icon: TrendingUp, desc: 'Commission earned by party (RBAC restricted)', color: 'from-teal-500 to-cyan-400' },
  { id: 'market_fee_report', name: 'Market Fee Report', icon: Shield, desc: 'User fee / market cess compliance report', color: 'from-purple-500 to-violet-400' },
];

/* ── Export Helpers ── */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

function generateTallyXML(reportName: string, headers: string[], rows: string[][]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>${reportName}</REPORTNAME></REQUESTDESC>
      <REQUESTDATA>
${rows.map(r => `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER>
${headers.map((h, i) => `            <${h.replace(/[^a-zA-Z]/g, '_').toUpperCase()}>${r[i] || ''}</${h.replace(/[^a-zA-Z]/g, '_').toUpperCase()}>`).join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>`).join('\n')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

function generatePrintableHTML(title: string, content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1a1a2e; }
  h1 { font-size: 18px; border-bottom: 2px solid #5B8CFF; padding-bottom: 8px; color: #222; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th { background: #f0f4ff; border: 1px solid #d0d8e8; padding: 8px; text-align: left; font-weight: 600; color: #374151; }
  td { border: 1px solid #e0e4ec; padding: 6px 8px; }
  tr:nth-child(even) { background: #f8fafc; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0; }
  .summary-item { background: #f0f4ff; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
  .summary-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-value { font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 2px; }
  .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e0e4ec; padding-top: 8px; display: flex; justify-content: space-between; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>${title}</h1>
<p style="font-size:11px;color:#6b7280;">Generated: ${new Date().toLocaleString('en-IN')} | Powered by MERCOTRACE</p>
${content}
<div class="footer"><span>Powered by MERCOTRACE</span><span>Page 1/1</span></div>
</body></html>`;
}

const ReportsPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [activeTab, setActiveTab] = useState('summary');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [viewingReport, setViewingReport] = useState<typeof reportTypes[0] | null>(null);

  const { auctionResults } = useAuctionResults();
  const bills = getStore<any>('mkt_bills');

  // ── Daily Sales Summary data ──
  const dailySummary = useMemo(() => {
    const totalBills = bills.length || 12;
    const totalBags = auctionResults.reduce((s: number, a: any) => s + (a.entries || []).reduce((ss: number, e: any) => ss + (e.quantity || 0), 0), 0) || 75;
    const grossSale = 245000;
    const commission = 12250;
    const userFee = 4900;
    const coolie = 1500;
    const netSales = grossSale - commission - userFee - coolie;
    const cashReceived = 120000;
    const bankReceived = 60000;
    const totalCollected = cashReceived + bankReceived;
    const outstanding = grossSale - totalCollected;
    return { totalBills, totalBags, grossSale, commission, userFee, coolie, netSales, cashReceived, bankReceived, totalCollected, outstanding };
  }, [bills, auctionResults]);

  const partyExposure = useMemo(() => [
    { party: 'Vijay Traders', totalSale: 125000, totalCollected: 80000, outstanding: 45000, oldestDue: '2026-02-10', riskLevel: 'Medium' },
    { party: 'Mahalaxmi Store', totalSale: 89000, totalCollected: 89000, outstanding: 0, oldestDue: '-', riskLevel: 'Low' },
    { party: 'Ganesh Mart', totalSale: 56000, totalCollected: 20000, outstanding: 36000, oldestDue: '2026-01-25', riskLevel: 'High' },
    { party: 'Shree Enterprises', totalSale: 42000, totalCollected: 10000, outstanding: 32000, oldestDue: '2026-01-15', riskLevel: 'Critical' },
  ], []);

  const lotReconciliation = useMemo(() => [
    { seller: 'Ramesh Kumar', arrivalDate: '2026-02-20', commodity: 'Onion', arrivedBags: 30, soldBags: 30, pendingBags: 0, avgRate: 825, grossSale: 24750, status: 'Complete' },
    { seller: 'Suresh Patil', arrivalDate: '2026-02-20', commodity: 'Onion', arrivedBags: 25, soldBags: 25, pendingBags: 0, avgRate: 805, grossSale: 20125, status: 'Complete' },
    { seller: 'Ramesh Kumar', arrivalDate: '2026-02-20', commodity: 'Tomato', arrivedBags: 20, soldBags: 18, pendingBags: 2, avgRate: 600, grossSale: 10800, status: 'Partial' },
    { seller: 'Kiran Jadhav', arrivalDate: '2026-02-19', commodity: 'Potato', arrivedBags: 40, soldBags: 40, pendingBags: 0, avgRate: 450, grossSale: 18000, status: 'Complete' },
  ], []);

  const riskColor = (level: string) => {
    if (level === 'Low') return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (level === 'Medium') return 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300';
    if (level === 'High') return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
    return 'text-red-800 bg-red-200 dark:bg-red-900/40 dark:text-red-200';
  };

  const filteredReports = useMemo(() => {
    if (!search) return reportTypes;
    const q = search.toLowerCase();
    return reportTypes.filter(r => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
  }, [search]);

  /* ── Get report data for export ── */
  const getReportExportData = useCallback((reportId: string): { headers: string[]; rows: string[][]; title: string } => {
    switch (reportId) {
      case 'daily_sales':
        return {
          title: 'Daily Sales Summary',
          headers: ['Metric', 'Value'],
          rows: [
            ['Total Bills', String(dailySummary.totalBills)], ['Total Bags', String(dailySummary.totalBags)],
            ['Gross Sale', `₹${dailySummary.grossSale.toLocaleString()}`], ['Commission', `₹${dailySummary.commission.toLocaleString()}`],
            ['User Fee', `₹${dailySummary.userFee.toLocaleString()}`], ['Coolie', `₹${dailySummary.coolie.toLocaleString()}`],
            ['Net Sales', `₹${dailySummary.netSales.toLocaleString()}`], ['Cash Received', `₹${dailySummary.cashReceived.toLocaleString()}`],
            ['Bank Received', `₹${dailySummary.bankReceived.toLocaleString()}`], ['Total Collected', `₹${dailySummary.totalCollected.toLocaleString()}`],
            ['Outstanding', `₹${dailySummary.outstanding.toLocaleString()}`],
          ]
        };
      case 'bill_register':
        return {
          title: 'Bill Register',
          headers: ['Bill No', 'Party', 'Bags', 'Amount', 'Commission', 'User Fee', 'Coolie', 'Cash', 'Bank', 'Balance'],
          rows: [
            ['BIL-0042', 'Vijay Traders', '30', '24750', '1238', '495', '600', '15000', '5000', '4750'],
            ['BIL-0043', 'Ganesh Mart', '25', '20125', '1006', '403', '500', '10000', '0', '10125'],
            ['BIL-0044', 'Mahalaxmi Store', '20', '12000', '600', '240', '400', '12000', '0', '0'],
          ]
        };
      case 'gst_report':
        return {
          title: 'GST Report',
          headers: ['HSN/SAC', 'UQC', 'Total Qty', 'Total Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST'],
          rows: [
            ['07031019', 'Bags', '55', '44875', '5%', '44875', '-', '1122', '1122'],
            ['07020000', 'Bags', '20', '12000', '5%', '12000', '-', '300', '300'],
          ]
        };
      case 'lot_reconciliation':
        return {
          title: 'Lot Reconciliation',
          headers: ['Seller', 'Date', 'Commodity', 'Arrived', 'Sold', 'Pending', 'Avg Rate', 'Gross Sale', 'Status'],
          rows: lotReconciliation.map(l => [l.seller, l.arrivalDate, l.commodity, String(l.arrivedBags), String(l.soldBags), String(l.pendingBags), String(l.avgRate), String(l.grossSale), l.status]),
        };
      case 'party_exposure':
        return {
          title: 'Party Exposure Summary',
          headers: ['Party', 'Total Sale', 'Collected', 'Outstanding', 'Oldest Due', 'Risk Level'],
          rows: partyExposure.map(p => [p.party, String(p.totalSale), String(p.totalCollected), String(p.outstanding), p.oldestDue, p.riskLevel]),
        };
      default:
        return { title: reportId, headers: ['Data'], rows: [['No data']] };
    }
  }, [dailySummary, lotReconciliation, partyExposure]);

  const handleExport = useCallback((format: 'pdf' | 'excel' | 'tally', reportId?: string) => {
    const id = reportId || viewingReport?.id || 'daily_sales';
    const { headers, rows, title } = getReportExportData(id);
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      const csv = generateCSV(headers, rows);
      downloadFile(csv, `${title.replace(/\s+/g, '_')}_${dateStr}.csv`, 'text/csv;charset=utf-8;');
      toast.success(`${title} exported as Excel (CSV)`);
    } else if (format === 'tally') {
      const xml = generateTallyXML(title, headers, rows);
      downloadFile(xml, `${title.replace(/\s+/g, '_')}_${dateStr}_tally.xml`, 'application/xml');
      toast.success(`${title} exported for Tally import`);
    } else {
      // PDF via print dialog
      const tableHTML = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const html = generatePrintableHTML(title + ` — ${dateFrom} to ${dateTo}`, tableHTML);
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
      toast.success('PDF export opened — use "Save as PDF" in print dialog');
    }
  }, [viewingReport, getReportExportData, dateFrom, dateTo]);

  /* ── KPI card config with icons and gradient colors ── */
  const kpiCards = useMemo(() => [
    { label: 'Total Bills', value: dailySummary.totalBills, icon: FileText, gradient: 'from-blue-500/15 to-blue-400/5', iconBg: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800/40' },
    { label: 'Total Bags', value: dailySummary.totalBags, icon: Package, gradient: 'from-indigo-500/15 to-indigo-400/5', iconBg: 'bg-indigo-500', border: 'border-indigo-200 dark:border-indigo-800/40' },
    { label: 'Gross Sale', value: `₹${dailySummary.grossSale.toLocaleString()}`, icon: IndianRupee, gradient: 'from-emerald-500/15 to-emerald-400/5', iconBg: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800/40' },
    { label: 'Commission', value: `₹${dailySummary.commission.toLocaleString()}`, icon: TrendingUp, gradient: 'from-violet-500/15 to-violet-400/5', iconBg: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-800/40' },
    { label: 'User Fee', value: `₹${dailySummary.userFee.toLocaleString()}`, icon: Shield, gradient: 'from-cyan-500/15 to-cyan-400/5', iconBg: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-800/40' },
    { label: 'Coolie', value: `₹${dailySummary.coolie.toLocaleString()}`, icon: Users, gradient: 'from-orange-500/15 to-orange-400/5', iconBg: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800/40' },
    { label: 'Net Sales', value: `₹${dailySummary.netSales.toLocaleString()}`, icon: Wallet, gradient: 'from-primary/15 to-primary/5', iconBg: 'bg-primary', border: 'border-primary/20' },
    { label: 'Cash Received', value: `₹${dailySummary.cashReceived.toLocaleString()}`, icon: IndianRupee, gradient: 'from-green-500/15 to-green-400/5', iconBg: 'bg-green-500', border: 'border-green-200 dark:border-green-800/40' },
    { label: 'Bank Received', value: `₹${dailySummary.bankReceived.toLocaleString()}`, icon: CreditCard, gradient: 'from-sky-500/15 to-sky-400/5', iconBg: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800/40' },
    { label: 'Total Collected', value: `₹${dailySummary.totalCollected.toLocaleString()}`, icon: DollarSign, gradient: 'from-teal-500/15 to-teal-400/5', iconBg: 'bg-teal-500', border: 'border-teal-200 dark:border-teal-800/40' },
    { label: 'Outstanding', value: `₹${dailySummary.outstanding.toLocaleString()}`, icon: AlertTriangle, gradient: 'from-red-500/15 to-red-400/5', iconBg: 'bg-red-500', border: 'border-red-200 dark:border-red-800/40' },
  ], [dailySummary]);

  // ── Generate report view content ──
  const renderReportView = () => {
    if (!viewingReport) return null;
    const today = new Date().toLocaleDateString('en-IN');
    const tableClass = "w-full text-sm";
    const thClass = "text-left p-2.5 text-muted-foreground font-semibold text-xs whitespace-nowrap bg-muted/40";
    const tdClass = "p-2.5 border-b border-border/30";

    switch (viewingReport.id) {
      case 'daily_sales':
        return (
          <div className={cn("grid gap-3", isDesktop ? "grid-cols-4" : "grid-cols-2")}>
            {kpiCards.map(m => (
              <div key={m.label} className={cn("rounded-xl p-3 bg-gradient-to-br border", m.gradient, m.border)}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", m.iconBg)}>
                    <m.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        );

      case 'bill_register':
        return (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className={tableClass}>
              <thead><tr>
                {['Bill No', 'Party', 'Bags', 'Amount', 'Commission', 'User Fee', 'Coolie', 'Cash', 'Bank', 'Balance', 'Modified', 'By'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { bill: 'BIL-0042', party: 'Vijay Traders', bags: 30, amt: 24750, comm: 1238, uf: 495, cl: 600, cash: 15000, bank: 5000, bal: 4750, mod: today, by: 'Admin' },
                  { bill: 'BIL-0043', party: 'Ganesh Mart', bags: 25, amt: 20125, comm: 1006, uf: 403, cl: 500, cash: 10000, bank: 0, bal: 10125, mod: today, by: 'Admin' },
                  { bill: 'BIL-0044', party: 'Mahalaxmi Store', bags: 20, amt: 12000, comm: 600, uf: 240, cl: 400, cash: 12000, bank: 0, bal: 0, mod: today, by: 'Admin' },
                ].map(r => (
                  <tr key={r.bill} className="hover:bg-muted/20 transition-colors">
                    <td className={cn(tdClass, "font-mono text-xs text-primary font-semibold")}>{r.bill}</td>
                    <td className={cn(tdClass, "font-medium")}>{r.party}</td>
                    <td className={cn(tdClass, "text-right")}>{r.bags}</td>
                    <td className={cn(tdClass, "text-right font-medium")}>₹{r.amt.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right")}>₹{r.comm.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right")}>₹{r.uf}</td>
                    <td className={cn(tdClass, "text-right")}>₹{r.cl}</td>
                    <td className={cn(tdClass, "text-right text-emerald-600 dark:text-emerald-400")}>₹{r.cash.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right text-sky-600 dark:text-sky-400")}>₹{r.bank.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right font-bold", r.bal > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>₹{r.bal.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-xs text-muted-foreground")}>{r.mod}</td>
                    <td className={cn(tdClass, "text-xs")}>{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'gst_report':
        return (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className={tableClass}>
              <thead><tr>
                {['HSN/SAC', 'UQC', 'Total Qty', 'Total Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr className="hover:bg-muted/20">
                  <td className={cn(tdClass, "font-mono text-primary")}>07031019</td><td className={tdClass}>Bags</td><td className={cn(tdClass, "text-right")}>55</td><td className={cn(tdClass, "text-right font-medium")}>₹44,875</td><td className={tdClass}>5%</td><td className={cn(tdClass, "text-right font-medium")}>₹44,875</td><td className={cn(tdClass, "text-right text-muted-foreground")}>-</td><td className={cn(tdClass, "text-right")}>₹1,122</td><td className={cn(tdClass, "text-right")}>₹1,122</td>
                </tr>
                <tr className="hover:bg-muted/20">
                  <td className={cn(tdClass, "font-mono text-primary")}>07020000</td><td className={tdClass}>Bags</td><td className={cn(tdClass, "text-right")}>20</td><td className={cn(tdClass, "text-right font-medium")}>₹12,000</td><td className={tdClass}>5%</td><td className={cn(tdClass, "text-right font-medium")}>₹12,000</td><td className={cn(tdClass, "text-right text-muted-foreground")}>-</td><td className={cn(tdClass, "text-right")}>₹300</td><td className={cn(tdClass, "text-right")}>₹300</td>
                </tr>
                <tr className="font-bold bg-muted/30">
                  <td className={cn(tdClass)} colSpan={5}>Grand Total</td><td className={cn(tdClass, "text-right")}>₹56,875</td><td className={cn(tdClass, "text-right")}>-</td><td className={cn(tdClass, "text-right")}>₹1,422</td><td className={cn(tdClass, "text-right")}>₹1,422</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'arrival_report':
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className={tableClass}>
                <thead><tr>
                  {['Farmer Name', 'Place', 'Bags', 'Freight', 'Advance', 'Lot No'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    { farmer: 'Ramesh Kumar', place: 'Nashik', bags: 50, freight: 2000, advance: 5000, lot: 'ONI/001, TOM/003' },
                    { farmer: 'Suresh Patil', place: 'Pune', bags: 25, freight: 1500, advance: 3000, lot: 'ONI/002' },
                    { farmer: 'Kiran Jadhav', place: 'Satara', bags: 40, freight: 2500, advance: 4000, lot: 'POT/004' },
                  ].map(r => (
                    <tr key={r.farmer} className="hover:bg-muted/20">
                      <td className={cn(tdClass, "font-medium")}>{r.farmer}</td>
                      <td className={tdClass}>{r.place}</td>
                      <td className={cn(tdClass, "text-right font-medium")}>{r.bags}</td>
                      <td className={cn(tdClass, "text-right")}>₹{r.freight.toLocaleString()}</td>
                      <td className={cn(tdClass, "text-right")}>₹{r.advance.toLocaleString()}</td>
                      <td className={cn(tdClass, "font-mono text-xs text-primary")}>{r.lot}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/30">
                    <td className={tdClass} colSpan={2}>Total</td>
                    <td className={cn(tdClass, "text-right")}>115</td>
                    <td className={cn(tdClass, "text-right")}>₹6,000</td>
                    <td className={cn(tdClass, "text-right")}>₹12,000</td>
                    <td className={tdClass}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'patti_register':
        return (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className={tableClass}>
              <thead><tr>
                {['Date', 'Party', 'Bags', 'Gross Amount', 'Deductions', 'Net Amount', 'Status'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { date: '21/02/2026', party: 'Ramesh Kumar', bags: 50, gross: 36750, ded: 5513, net: 31237, status: 'Settled' },
                  { date: '21/02/2026', party: 'Suresh Patil', bags: 25, gross: 20125, ded: 3019, net: 17106, status: 'Settled' },
                  { date: '20/02/2026', party: 'Kiran Jadhav', bags: 40, gross: 18000, ded: 2700, net: 15300, status: 'Pending' },
                ].map(r => (
                  <tr key={r.party} className="hover:bg-muted/20">
                    <td className={tdClass}>{r.date}</td>
                    <td className={cn(tdClass, "font-medium")}>{r.party}</td>
                    <td className={cn(tdClass, "text-right")}>{r.bags}</td>
                    <td className={cn(tdClass, "text-right font-medium")}>₹{r.gross.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right text-destructive")}>₹{r.ded.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right font-bold")}>₹{r.net.toLocaleString()}</td>
                    <td className={tdClass}><span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", r.status === 'Settled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'lot_reconciliation':
        return renderLotRecon();

      case 'collection_report':
        return (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className={tableClass}>
              <thead><tr>
                {['Date', 'Bill No', 'Party', 'Cash', 'Bank', 'Total', 'Balance'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { date: '21/02/2026', bill: 'BIL-0042', party: 'Vijay Traders', cash: 15000, bank: 5000, total: 20000, bal: 4750 },
                  { date: '21/02/2026', bill: 'BIL-0043', party: 'Ganesh Mart', cash: 10000, bank: 0, total: 10000, bal: 10125 },
                  { date: '21/02/2026', bill: 'BIL-0044', party: 'Mahalaxmi Store', cash: 12000, bank: 0, total: 12000, bal: 0 },
                ].map(r => (
                  <tr key={r.bill} className="hover:bg-muted/20">
                    <td className={tdClass}>{r.date}</td>
                    <td className={cn(tdClass, "font-mono text-xs text-primary font-semibold")}>{r.bill}</td>
                    <td className={cn(tdClass, "font-medium")}>{r.party}</td>
                    <td className={cn(tdClass, "text-right text-emerald-600 dark:text-emerald-400")}>₹{r.cash.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right text-sky-600 dark:text-sky-400")}>₹{r.bank.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right font-bold")}>₹{r.total.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right", r.bal > 0 ? "text-amber-600 font-semibold" : "text-emerald-600")}>₹{r.bal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'party_exposure':
        return renderPartyExposure();

      case 'commission_income':
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className={tableClass}>
                <thead><tr>
                  {['Party', 'Bags', 'Gross Sale', 'Commission %', 'Commission Earned', 'Preset Charges'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[
                    { party: 'Vijay Traders', bags: 30, gross: 24750, pct: '5%', comm: 1238, preset: 495 },
                    { party: 'Ganesh Mart', bags: 25, gross: 20125, pct: '5%', comm: 1006, preset: 403 },
                    { party: 'Mahalaxmi Store', bags: 20, gross: 12000, pct: '5%', comm: 600, preset: 240 },
                  ].map(r => (
                    <tr key={r.party} className="hover:bg-muted/20">
                      <td className={cn(tdClass, "font-medium")}>{r.party}</td>
                      <td className={cn(tdClass, "text-right")}>{r.bags}</td>
                      <td className={cn(tdClass, "text-right font-medium")}>₹{r.gross.toLocaleString()}</td>
                      <td className={tdClass}>{r.pct}</td>
                      <td className={cn(tdClass, "text-right font-bold text-primary")}>₹{r.comm.toLocaleString()}</td>
                      <td className={cn(tdClass, "text-right")}>₹{r.preset}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-sm">
              <div><span className="text-muted-foreground text-xs">Total Commission:</span> <strong className="text-primary">₹2,844</strong></div>
              <div><span className="text-muted-foreground text-xs">Avg/Bag:</span> <strong className="text-primary">₹37.92</strong></div>
            </div>
          </div>
        );

      case 'market_fee_report':
        return (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className={tableClass}>
              <thead><tr>
                {['Bill No', 'Purchaser', 'Quantity', 'Amount', 'Market Fee', 'W/Fee'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { bill: 'BIL-0042', party: 'Vijay Traders', qty: 30, amt: 24750, fee: 495, wfee: 124 },
                  { bill: 'BIL-0043', party: 'Ganesh Mart', qty: 25, amt: 20125, fee: 403, wfee: 101 },
                ].map(r => (
                  <tr key={r.bill} className="hover:bg-muted/20">
                    <td className={cn(tdClass, "font-mono text-xs text-primary")}>{r.bill}</td>
                    <td className={cn(tdClass, "font-medium")}>{r.party}</td>
                    <td className={cn(tdClass, "text-right")}>{r.qty}</td>
                    <td className={cn(tdClass, "text-right font-medium")}>₹{r.amt.toLocaleString()}</td>
                    <td className={cn(tdClass, "text-right font-bold")}>₹{r.fee}</td>
                    <td className={cn(tdClass, "text-right")}>₹{r.wfee}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-muted/30">
                  <td className={tdClass} colSpan={2}>Total</td>
                  <td className={cn(tdClass, "text-right")}>55</td>
                  <td className={cn(tdClass, "text-right")}>₹44,875</td>
                  <td className={cn(tdClass, "text-right")}>₹898</td>
                  <td className={cn(tdClass, "text-right")}>₹225</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      default:
        return <p className="text-muted-foreground p-4 text-center">Report data loading…</p>;
    }
  };

  const renderPartyExposure = () => (
    <>
      {isDesktop ? (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="text-left p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Party</th>
              <th className="text-right p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Total Sale</th>
              <th className="text-right p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Collected</th>
              <th className="text-right p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Outstanding</th>
              <th className="text-left p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Oldest Due</th>
              <th className="text-center p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">Risk</th>
            </tr></thead>
            <tbody>
              {partyExposure.map((p, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-2.5 font-medium">{p.party}</td>
                  <td className="p-2.5 text-right">₹{p.totalSale.toLocaleString()}</td>
                  <td className="p-2.5 text-right text-emerald-600 dark:text-emerald-400">₹{p.totalCollected.toLocaleString()}</td>
                  <td className="p-2.5 text-right font-bold">{p.outstanding > 0 ? <span className="text-amber-600 dark:text-amber-400">₹{p.outstanding.toLocaleString()}</span> : <span className="text-emerald-600">₹0</span>}</td>
                  <td className="p-2.5 text-muted-foreground">{p.oldestDue}</td>
                  <td className="p-2.5 text-center"><span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", riskColor(p.riskLevel))}>{p.riskLevel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {partyExposure.map((p, i) => (
            <div key={i} className={cn("flex items-center justify-between p-3.5 rounded-xl border transition-colors",
              p.riskLevel === 'Critical' ? 'bg-red-500/5 border-red-200 dark:border-red-800/30' :
              p.riskLevel === 'High' ? 'bg-amber-500/5 border-amber-200 dark:border-amber-800/30' :
              'bg-muted/20 border-border/30'
            )}>
              <div>
                <p className="text-sm font-semibold">{p.party}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sale: ₹{p.totalSale.toLocaleString()} · Outstanding: <span className={p.outstanding > 0 ? 'text-amber-600 font-semibold' : ''}>₹{p.outstanding.toLocaleString()}</span></p>
                <p className="text-[10px] text-muted-foreground">Oldest Due: {p.oldestDue}</p>
              </div>
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", riskColor(p.riskLevel))}>{p.riskLevel}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderLotRecon = () => (
    <>
      {isDesktop ? (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead><tr>
              {['Seller', 'Date', 'Commodity', 'Arrived', 'Sold', 'Pending', 'Avg Rate', 'Gross Sale', 'Status'].map(h => (
                <th key={h} className="text-left p-2.5 text-muted-foreground font-semibold text-xs bg-muted/40">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {lotReconciliation.map((l, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-2.5 font-medium">{l.seller}</td>
                  <td className="p-2.5 text-muted-foreground">{l.arrivalDate}</td>
                  <td className="p-2.5">{l.commodity}</td>
                  <td className="p-2.5 text-right">{l.arrivedBags}</td>
                  <td className="p-2.5 text-right">{l.soldBags}</td>
                  <td className={cn("p-2.5 text-right font-bold", l.pendingBags > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>{l.pendingBags}</td>
                  <td className="p-2.5 text-right">₹{l.avgRate}</td>
                  <td className="p-2.5 text-right font-bold text-primary">₹{l.grossSale.toLocaleString()}</td>
                  <td className="p-2.5"><span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", l.status === 'Complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {lotReconciliation.map((l, i) => (
            <div key={i} className={cn("p-3.5 rounded-xl border", l.status === 'Partial' ? 'bg-amber-500/5 border-amber-200 dark:border-amber-800/30' : 'bg-muted/10 border-border/30')}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{l.seller} — {l.commodity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Arrived: {l.arrivedBags} · Sold: {l.soldBags} · <span className={l.pendingBags > 0 ? 'text-amber-600 font-semibold' : ''}>Pending: {l.pendingBags}</span></p>
                </div>
                <span className="text-sm font-bold text-primary">₹{l.grossSale.toLocaleString()}</span>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold mt-2 inline-block", l.status === 'Complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {!isDesktop && (
        <div className="hero-gradient pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" /> Analytics Reports
                </h1>
                <p className="text-white/70 text-xs">Business metrics & insights</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input aria-label="Search" placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-sm border border-white/10 focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {isDesktop && (
        <div className="px-8 pt-6 pb-4 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20" onClick={() => handleExport('excel')}>
              <Download className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => handleExport('pdf')}>
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-900/20" onClick={() => handleExport('tally')}>
              <Download className="w-3.5 h-3.5" /> Tally
            </Button>
          </div>
        </div>
      )}

      <div className={cn("px-4", isDesktop ? "lg:px-8" : "mt-4")}>
        {/* Date Range */}
        <div className="glass-card rounded-xl p-3 flex items-center gap-3 flex-wrap mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <span className="text-xs text-muted-foreground font-medium">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4 glass-card rounded-xl h-12">
            <TabsTrigger value="summary" className="flex-1 text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary rounded-lg">
              <TrendingUp className="w-4 h-4 mr-1.5" /> Summary
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 data-[state=active]:text-primary rounded-lg">
              <BarChart3 className="w-4 h-4 mr-1.5" /> All Reports
            </TabsTrigger>
          </TabsList>

          {/* ═══ SUMMARY TAB ═══ */}
          <TabsContent value="summary" className="space-y-6">
            {/* Daily Sales Summary */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className="glass-card rounded-2xl p-5 border border-primary/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  Daily Sales Summary
                </h3>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => { setViewingReport(reportTypes[0]); }}>
                  <Eye className="w-3 h-3" /> Expand
                </Button>
              </div>
              <div className={cn("grid gap-3", isDesktop ? "grid-cols-4" : "grid-cols-2")}>
                {kpiCards.map((m, idx) => (
                  <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className={cn("rounded-xl p-3 bg-gradient-to-br border transition-all hover:shadow-md", m.gradient, m.border)}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shadow-sm", m.iconBg)}>
                        <m.icon className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{m.label}</p>
                    </div>
                    <p className="text-lg font-extrabold text-foreground">{m.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Party Exposure */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
              className="glass-card rounded-2xl p-5 border border-amber-200/30 dark:border-amber-800/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-md">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  Party Exposure Summary
                </h3>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => { setViewingReport(reportTypes.find(r => r.id === 'party_exposure')!); }}>
                  <Eye className="w-3 h-3" /> Expand
                </Button>
              </div>
              {renderPartyExposure()}
            </motion.div>

            {/* Lot Reconciliation */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
              className="glass-card rounded-2xl p-5 border border-indigo-200/30 dark:border-indigo-800/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-400 flex items-center justify-center shadow-md">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  Lot Reconciliation
                </h3>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => { setViewingReport(reportTypes.find(r => r.id === 'lot_reconciliation')!); }}>
                  <Eye className="w-3 h-3" /> Expand
                </Button>
              </div>
              {renderLotRecon()}
            </motion.div>
          </TabsContent>

          {/* ═══ ALL REPORTS TAB ═══ */}
          <TabsContent value="reports" className="space-y-4">
            <div className={cn("grid gap-3", isDesktop ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
              {filteredReports.map((r, idx) => (
                <motion.button key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => setViewingReport(r)}
                  className="glass-card rounded-xl p-4 text-left hover:shadow-lg hover:border-primary/30 transition-all group border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", r.color)}>
                      <r.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{r.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{r.desc}</p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Export buttons for mobile */}
            {!isDesktop && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" onClick={() => handleExport('excel')}><Download className="w-3 h-3" /> Excel</Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-red-300 text-red-700 dark:border-red-700 dark:text-red-400" onClick={() => handleExport('pdf')}><Download className="w-3 h-3" /> PDF</Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400" onClick={() => handleExport('tally')}><Download className="w-3 h-3" /> Tally</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Report View Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", isDesktop && "glass-card border-primary/10")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewingReport && (
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", viewingReport.color)}>
                  <viewingReport.icon className="w-4.5 h-4.5 text-white" />
                </div>
              )}
              <div>
                <span className="text-base">{viewingReport?.name}</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">{viewingReport?.desc}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> <span className="font-medium">{dateFrom} to {dateTo}</span>
            </div>
            {renderReportView()}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setViewingReport(null)}>Close</Button>
            <Button variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" onClick={() => handleExport('excel', viewingReport?.id)}>
              <Download className="w-4 h-4" /> Excel
            </Button>
            <Button variant="outline" className="gap-1.5 border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400" onClick={() => handleExport('tally', viewingReport?.id)}>
              <Download className="w-4 h-4" /> Tally
            </Button>
            <Button variant="outline" className="gap-1.5 border-red-300 text-red-700 dark:border-red-700 dark:text-red-400" onClick={() => handleExport('pdf', viewingReport?.id)}>
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button onClick={() => handleExport('pdf', viewingReport?.id)} className="bg-gradient-to-r from-primary to-accent text-white gap-1.5 shadow-lg">
              <Printer className="w-4 h-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ReportsPage;
