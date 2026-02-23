import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Box, Search, Plus, Trash2, Save, Package, User, DollarSign, TrendingUp, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useDesktopMode } from '@/hooks/use-desktop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { contactApi } from '@/services/api';
import type { Contact } from '@/types/models';
import { toast } from 'sonner';

function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

interface PurchaseLineItem {
  id: string;
  commodity: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface PurchaseCharge {
  id: string;
  name: string;
  amount: number;
}

interface StockPurchaseRecord {
  id: string;
  vendor_name: string;
  vendor_id: string | null;
  items: PurchaseLineItem[];
  charges: PurchaseCharge[];
  subtotal: number;
  total_charges: number;
  grand_total: number;
  lot_numbers: string[];
  created_at: string;
}

const StockPurchasePage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [records, setRecords] = useState<StockPurchaseRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [selectedVendor, setSelectedVendor] = useState<Contact | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [items, setItems] = useState<PurchaseLineItem[]>([{ id: crypto.randomUUID(), commodity: '', quantity: 0, rate: 0, amount: 0 }]);
  const [charges, setCharges] = useState<PurchaseCharge[]>([]);

  useEffect(() => {
    contactApi.list().then(c => setVendors(c.filter(v => v.type === 'SELLER')));
    setRecords(getStore<StockPurchaseRecord>('mkt_stock_purchases'));
  }, []);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const q = vendorSearch.toLowerCase();
    return vendors.filter(v => v.name?.toLowerCase().includes(q) || v.phone?.includes(q));
  }, [vendors, vendorSearch]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);
  const totalCharges = useMemo(() => charges.reduce((s, c) => s + c.amount, 0), [charges]);
  const grandTotal = subtotal + totalCharges;
  const totalSpent = useMemo(() => records.reduce((s, r) => s + r.grand_total, 0), [records]);

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      updated.amount = updated.quantity * updated.rate;
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), commodity: '', quantity: 0, rate: 0, amount: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const addCharge = () => setCharges(prev => [...prev, { id: crypto.randomUUID(), name: '', amount: 0 }]);
  const removeCharge = (id: string) => setCharges(prev => prev.filter(c => c.id !== id));

  const handleSave = () => {
    if (!selectedVendor || items.every(i => i.amount === 0)) {
      toast.error('Select vendor and add at least one item');
      return;
    }

    const validItems = items.filter(i => i.amount > 0);
    const lotNumbers = validItems.map((item, idx) => {
      const allocated = subtotal > 0 ? (item.amount / subtotal) * totalCharges : 0;
      const effectiveRate = item.quantity > 0 ? (item.amount + allocated) / item.quantity : 0;
      return `SP-${Date.now()}-${idx + 1} {₹${effectiveRate.toFixed(0)}}`;
    });

    const record: StockPurchaseRecord = {
      id: crypto.randomUUID(),
      vendor_name: selectedVendor.name,
      vendor_id: selectedVendor.contact_id,
      items: validItems,
      charges,
      subtotal,
      total_charges: totalCharges,
      grand_total: grandTotal,
      lot_numbers: lotNumbers,
      created_at: new Date().toISOString(),
    };

    const updated = [...records, record];
    setStore('mkt_stock_purchases', updated);
    setRecords(updated);
    setShowForm(false);
    resetForm();
    toast.success('Stock purchase recorded & inventory updated');
  };

  const resetForm = () => {
    setSelectedVendor(null);
    setVendorSearch('');
    setItems([{ id: crypto.randomUUID(), commodity: '', quantity: 0, rate: 0, amount: 0 }]);
    setCharges([]);
  };

  const filteredRecords = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r => r.vendor_name.toLowerCase().includes(q));
  }, [records, search]);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 lg:pb-6">
      {!isDesktop && (
        <div className="bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="absolute top-2 right-2 opacity-10">
            <ShoppingCart className="w-28 h-28 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Box className="w-5 h-5" /> Stock Purchase
                </h1>
                <p className="text-white/80 text-xs font-medium">Record vendor stock purchases</p>
              </div>
              <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform">
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Purchases</p>
                <p className="text-white text-lg font-bold">{records.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-2">
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Total Spent</p>
                <p className="text-white text-lg font-bold">₹{totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDesktop && (
        <div className="px-8 pt-6 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search purchases by vendor…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11" />
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-semibold">{records.length} purchases</span>
            </div>
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold">₹{totalSpent.toLocaleString()}</span>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold h-11">
            <Plus className="w-4 h-4 mr-1.5" /> New Purchase
          </Button>
        </div>
      )}

      <div className={cn("px-4", isDesktop ? "lg:px-8" : "mt-4")}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Purchase History</h2>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4 flex items-center justify-center">
              <Box className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No Stock Purchases Yet</p>
            <p className="text-xs text-muted-foreground">Tap + to record your first vendor purchase</p>
          </div>
        ) : isDesktop ? (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/10 dark:to-emerald-900/10 border-b border-border/50">
                  <th className="text-left p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Vendor</th>
                  <th className="text-right p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Items</th>
                  <th className="text-right p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Subtotal</th>
                  <th className="text-right p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Charges</th>
                  <th className="text-right p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Grand Total</th>
                  <th className="text-left p-3 text-teal-800 dark:text-teal-300 font-semibold text-xs uppercase tracking-wide">Lot #</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-teal-50/30 dark:hover:bg-teal-900/5 transition-colors">
                    <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-semibold">{r.vendor_name}</td>
                    <td className="p-3 text-right">{r.items.length}</td>
                    <td className="p-3 text-right">₹{r.subtotal.toLocaleString()}</td>
                    <td className="p-3 text-right text-amber-600 dark:text-amber-400">₹{r.total_charges.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">₹{r.grand_total.toLocaleString()}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{r.lot_numbers.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-4 border-l-4 border-l-teal-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{r.vendor_name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.items.length} items · {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">₹{r.grand_total.toLocaleString()}</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {r.lot_numbers.map((ln, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-[10px] font-bold">{ln}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className={cn("sm:max-w-2xl max-h-[85vh] overflow-y-auto", isDesktop && "glass-card")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              New Stock Purchase
            </DialogTitle>
            <DialogDescription>Record purchase from vendor with cost allocation</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Vendor Selection */}
            <div>
              <label className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-1.5 block uppercase tracking-wide">Vendor</label>
              {selectedVendor ? (
                <div className="rounded-xl p-3 flex items-center justify-between bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-sm">{selectedVendor.name}</span>
                    <span className="text-xs text-muted-foreground">{selectedVendor.phone}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedVendor(null)}>Change</Button>
                </div>
              ) : (
                <div>
                  <Input placeholder="Search vendor by name or phone…" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} className="h-11" />
                  {vendorSearch && (
                    <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-xl bg-background">
                      {filteredVendors.map(v => (
                        <button key={v.contact_id} onClick={() => { setSelectedVendor(v); setVendorSearch(''); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/10 text-sm font-medium transition-colors">{v.name} · {v.phone}</button>
                      ))}
                      {filteredVendors.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No vendors found</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Line Items</label>
                <Button variant="ghost" size="sm" onClick={addItem} className="text-teal-600"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl p-3 bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-1 mb-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <span className="text-xs text-muted-foreground font-medium flex-1">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(item.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input placeholder="Commodity name" value={item.commodity} onChange={e => updateItem(item.id, 'commodity', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="text-xs h-9" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Rate ₹" value={item.rate || ''} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="text-xs h-9" />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{item.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Overhead Charges</label>
                <Button variant="ghost" size="sm" onClick={addCharge} className="text-amber-600"><Plus className="w-3 h-3 mr-1" /> Add Charge</Button>
              </div>
              {charges.length === 0 && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">No charges added. Freight, labour etc. will be allocated proportionally to items.</p>
              )}
              {charges.map(ch => (
                <div key={ch.id} className="flex gap-2 mb-2 items-center">
                  <Input placeholder="e.g. Freight, Labour" value={ch.name} onChange={e => setCharges(prev => prev.map(c => c.id === ch.id ? { ...c, name: e.target.value } : c))} className="flex-1 h-9 text-xs" />
                  <Input type="number" placeholder="₹ Amount" value={ch.amount || ''} onChange={e => setCharges(prev => prev.map(c => c.id === ch.id ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))} className="w-28 h-9 text-xs" />
                  <button onClick={() => removeCharge(ch.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800/50 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground font-medium">Subtotal</span><span className="font-semibold">₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-amber-600 dark:text-amber-400 font-medium">+ Charges</span><span className="font-semibold text-amber-600 dark:text-amber-400">₹{totalCharges.toLocaleString()}</span></div>
              <div className="flex justify-between text-base font-black border-t border-teal-200 dark:border-teal-800/50 pt-2 mt-1">
                <span>Grand Total</span><span className="text-emerald-600 dark:text-emerald-400 text-xl">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 h-11">Cancel</Button>
            <Button onClick={handleSave} className="flex-1 h-11 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold shadow-lg">
              <Save className="w-4 h-4 mr-1.5" /> Save Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default StockPurchasePage;
