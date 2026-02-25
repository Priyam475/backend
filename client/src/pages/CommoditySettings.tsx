import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, Save, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { commodityApi, type FullCommodityConfigDto } from '@/services/api';
import type { Commodity, CommodityConfiguration, ChargeType, AppliesTo } from '@/types/models';
import { useDesktopMode } from '@/hooks/use-desktop';
import { toast } from 'sonner';

import onionImg from '@/assets/commodities/onion.jpg';
import potatoImg from '@/assets/commodities/potato.jpg';
import dryChiliImg from '@/assets/commodities/dry-chili.jpg';
import tomatoImg from '@/assets/commodities/tomato.jpg';

const commodityImages: Record<string, string> = { 'Onion': onionImg, 'Potato': potatoImg, 'Dry Chili': dryChiliImg, 'Tomato': tomatoImg };

interface LocalCommodityConfig {
  commodity: Commodity;
  config: CommodityConfiguration;
  charges: Array<{ charge_name: string; charge_type: ChargeType; value: string; applies_to: AppliesTo; percent_basis?: string; fixed_basis?: string }>;
  deductionRules: Array<{ min_weight: string; max_weight: string; deduction_value: string }>;
  hamaliSlabs: Array<{ threshold_weight: string; fixed_rate: string; per_kg_rate: string }>;
  hamaliEnabled: boolean;
  billPrefix: string;
}

const CommoditySettings = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();
  const [items, setItems] = useState<LocalCommodityConfig[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCommodityName, setNewCommodityName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const commodities = await commodityApi.list();
        const result: LocalCommodityConfig[] = await Promise.all(
          commodities.map(async (c) => {
            const full = await commodityApi.getFullConfig(c.commodity_id);
            const cfg = full.config
              ? {
                  config_id: String(full.config.id ?? crypto.randomUUID()),
                  commodity_id: c.commodity_id,
                  rate_per_unit: full.config.ratePerUnit ?? 0,
                  min_weight: full.config.minWeight ?? 0,
                  max_weight: full.config.maxWeight ?? 0,
                  govt_deduction_enabled: full.config.govtDeductionEnabled ?? false,
                  roundoff_enabled: full.config.roundoffEnabled ?? false,
                  commission_percent: full.config.commissionPercent ?? 0,
                  user_fee_percent: full.config.userFeePercent ?? 0,
                  hsn_code: full.config.hsnCode ?? '',
                  weighing_charge: full.config.weighingCharge,
                  created_at: full.config.createdDate ?? new Date().toISOString(),
                }
              : {
                  config_id: crypto.randomUUID(),
                  commodity_id: c.commodity_id,
                  rate_per_unit: 0,
                  min_weight: 0,
                  max_weight: 0,
                  govt_deduction_enabled: false,
                  roundoff_enabled: false,
                  commission_percent: 0,
                  user_fee_percent: 0,
                  hsn_code: '',
                  created_at: new Date().toISOString(),
                };
            const cCharges = (full.dynamicCharges ?? []).map((ch) => ({
              charge_name: ch.chargeName,
              charge_type: ch.chargeType as ChargeType,
              value: String(ch.valueAmount),
              applies_to: (ch.appliesTo as AppliesTo) || ('BUYER' as AppliesTo),
              percent_basis: ch.percentBasis,
              fixed_basis: ch.fixedBasis,
            }));
            const cDeductions = (full.deductionRules ?? []).map((d) => ({
              min_weight: String(d.minWeight),
              max_weight: String(d.maxWeight),
              deduction_value: String(d.deductionValue),
            }));
            const cHamalis = (full.hamaliSlabs ?? []).map((h) => ({
              threshold_weight: String(h.thresholdWeight),
              fixed_rate: String(h.fixedRate),
              per_kg_rate: String(h.perKgRate ?? 0),
            }));
            const billPrefix = full.config?.billPrefix ?? '';
            const hamaliEnabled = full.config?.hamaliEnabled ?? false;
            return {
              commodity: c,
              config: { ...cfg, weighing_charge: full.config?.weighingCharge } as CommodityConfiguration & { weighing_charge?: number },
              charges: cCharges,
              deductionRules: cDeductions,
              hamaliSlabs: cHamalis,
              hamaliEnabled,
              billPrefix,
            };
          })
        );
        setItems(result);
      } catch (error) {
        console.error('Failed to load commodities', error);
        toast.error('Failed to load commodities');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateConfig = (index: number, updates: Partial<CommodityConfiguration>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newConfig = { ...item.config, ...updates };
      if (updates.govt_deduction_enabled === true) newConfig.roundoff_enabled = false;
      if (updates.roundoff_enabled === true) newConfig.govt_deduction_enabled = false;
      return { ...item, config: newConfig };
    }));
  };

  const updateItem = (index: number, updates: Partial<LocalCommodityConfig>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const addCharge = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, charges: [...item.charges, { charge_name: '', charge_type: 'FIXED' as ChargeType, value: '', applies_to: 'BUYER' as AppliesTo }] } : item
    ));
  };

  const removeCharge = (cIndex: number, chargeIndex: number) => {
    setItems(prev => prev.map((item, i) =>
      i === cIndex ? { ...item, charges: item.charges.filter((_, ci) => ci !== chargeIndex) } : item
    ));
  };

  const addDeductionRule = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, deductionRules: [...item.deductionRules, { min_weight: '', max_weight: '', deduction_value: '' }] } : item
    ));
  };

  const removeDeductionRule = (cIndex: number, ruleIndex: number) => {
    setItems(prev => prev.map((item, i) =>
      i === cIndex ? { ...item, deductionRules: item.deductionRules.filter((_, ri) => ri !== ruleIndex) } : item
    ));
  };

  const addHamaliSlab = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, hamaliSlabs: [...item.hamaliSlabs, { threshold_weight: '', fixed_rate: '', per_kg_rate: '' }] } : item
    ));
  };

  const removeHamaliSlab = (cIndex: number, slabIndex: number) => {
    setItems(prev => prev.map((item, i) =>
      i === cIndex ? { ...item, hamaliSlabs: item.hamaliSlabs.filter((_, si) => si !== slabIndex) } : item
    ));
  };

  const handleAddCommodity = async () => {
    const name = newCommodityName.trim();
    if (!name) { toast.error('Please enter a commodity name'); return; }
    // Check duplicate
    if (items.some(it => it.commodity.commodity_name?.toLowerCase() === name.toLowerCase())) {
      toast.error(`"${name}" already exists`);
      return;
    }
    const created = await commodityApi.create({ commodity_name: name, trader_id: '' });
    const newItem: LocalCommodityConfig = {
      commodity: created,
      config: {
        config_id: crypto.randomUUID(), commodity_id: created.commodity_id,
        rate_per_unit: 0, min_weight: 0, max_weight: 0,
        govt_deduction_enabled: false, roundoff_enabled: false,
        commission_percent: 0, user_fee_percent: 0, hsn_code: '',
        created_at: new Date().toISOString(),
      },
      charges: [], deductionRules: [], hamaliSlabs: [],
      hamaliEnabled: false, billPrefix: '',
    };
    setItems(prev => [...prev, newItem]);
    setNewCommodityName('');
    setShowAddForm(false);
    setExpanded(items.length); // expand the newly added
    toast.success(`"${name}" added successfully`);
  };

  const handleDeleteCommodity = async (index: number) => {
    const item = items[index];
    const name = item.commodity.commodity_name || 'this commodity';
    await commodityApi.remove(item.commodity.commodity_id);
    setItems(prev => prev.filter((_, i) => i !== index));
    if (expanded === index) setExpanded(null);
    toast.success(`"${name}" removed`);
  };

  const saveSettings = async (index: number) => {
    const item = items[index];
    const cfg = item.config;
    const commodityName = item.commodity.commodity_name || 'Commodity';
    const commodityId = Number(item.commodity.commodity_id);

    // Validation
    if (cfg.rate_per_unit <= 0) { toast.error(`${commodityName}: Rate Per Unit must be greater than 0`); return; }
    if (cfg.min_weight < 0 || cfg.max_weight < 0) { toast.error(`${commodityName}: Weights cannot be negative`); return; }
    if (cfg.min_weight > 0 && cfg.max_weight > 0 && cfg.min_weight > cfg.max_weight) { toast.error(`${commodityName}: Min weight cannot exceed Max weight`); return; }
    if (cfg.commission_percent < 0 || cfg.commission_percent > 100) { toast.error(`${commodityName}: Commission must be between 0% and 100%`); return; }
    if (cfg.user_fee_percent < 0 || cfg.user_fee_percent > 100) { toast.error(`${commodityName}: User fee must be between 0% and 100%`); return; }

    for (let ri = 0; ri < item.deductionRules.length; ri++) {
      const rule = item.deductionRules[ri];
      const min = Number(rule.min_weight), max = Number(rule.max_weight), ded = Number(rule.deduction_value);
      if (!rule.min_weight || !rule.max_weight || !rule.deduction_value) { toast.error(`${commodityName}: All deduction rule fields are required`); return; }
      if (min < 0 || max < 0 || ded < 0) { toast.error(`${commodityName}: Deduction values cannot be negative`); return; }
      if (min > max) { toast.error(`${commodityName}: Deduction min weight cannot exceed max`); return; }
      for (let rj = ri + 1; rj < item.deductionRules.length; rj++) {
        const other = item.deductionRules[rj];
        const oMin = Number(other.min_weight), oMax = Number(other.max_weight);
        if (min <= oMax && oMin <= max) {
          toast.error(`${commodityName}: Deduction rules #${ri + 1} and #${rj + 1} have overlapping weight ranges (${min}-${max} vs ${oMin}-${oMax})`);
          return;
        }
      }
    }

    if (item.hamaliEnabled) {
      for (const slab of item.hamaliSlabs) {
        if (!slab.threshold_weight || !slab.fixed_rate) { toast.error(`${commodityName}: Hamali threshold and fixed rate are required`); return; }
        if (Number(slab.threshold_weight) <= 0) { toast.error(`${commodityName}: Hamali threshold must be greater than 0`); return; }
        if (Number(slab.fixed_rate) < 0) { toast.error(`${commodityName}: Hamali fixed rate cannot be negative`); return; }
      }
    }

    for (const charge of item.charges) {
      if (!charge.charge_name.trim()) { toast.error(`${commodityName}: Charge name is required`); return; }
      if (!charge.value || Number(charge.value) <= 0) { toast.error(`${commodityName}: "${charge.charge_name}" value must be greater than 0`); return; }
      if (charge.charge_type === 'PERCENT' && Number(charge.value) > 100) { toast.error(`${commodityName}: "${charge.charge_name}" percent cannot exceed 100`); return; }
    }

    const payload: FullCommodityConfigDto = {
      commodityId,
      config: {
        commodityId,
        ratePerUnit: cfg.rate_per_unit,
        minWeight: cfg.min_weight,
        maxWeight: cfg.max_weight,
        govtDeductionEnabled: cfg.govt_deduction_enabled,
        roundoffEnabled: cfg.roundoff_enabled,
        commissionPercent: cfg.commission_percent,
        userFeePercent: cfg.user_fee_percent,
        hsnCode: cfg.hsn_code ?? '',
        weighingCharge: (cfg as { weighing_charge?: number }).weighing_charge,
        billPrefix: item.billPrefix ?? '',
        hamaliEnabled: item.hamaliEnabled,
      },
      deductionRules: item.deductionRules.map((r) => ({
        commodityId,
        minWeight: Number(r.min_weight),
        maxWeight: Number(r.max_weight),
        deductionValue: Number(r.deduction_value),
      })),
      hamaliSlabs: item.hamaliEnabled
        ? item.hamaliSlabs.map((s) => ({
            commodityId,
            thresholdWeight: Number(s.threshold_weight),
            fixedRate: Number(s.fixed_rate),
            perKgRate: Number(s.per_kg_rate || 0),
          }))
        : [],
      dynamicCharges: item.charges.map((c) => ({
        commodityId,
        traderId: item.commodity.trader_id ? Number(item.commodity.trader_id) : undefined,
        chargeName: c.charge_name,
        chargeType: c.charge_type,
        valueAmount: Number(c.value),
        appliesTo: c.applies_to,
        percentBasis: c.percent_basis,
        fixedBasis: c.fixed_basis,
      })),
    };

    try {
      await commodityApi.saveFullConfig(item.commodity.commodity_id, payload);
      toast.success(`✅ ${commodityName} settings saved successfully!`);
    } catch (err) {
      console.error('Failed to save commodity config', err);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <motion.div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Mobile Header */}
      {!isDesktop && (
      <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-violet-500 pt-[max(2rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-3xl mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(123,97,255,0.2)_0%,transparent_40%)]" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} className="absolute w-1.5 h-1.5 bg-white/40 rounded-full"
              style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%` }}
              animate={{ y: [-10, 10], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
          ))}
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Commodity Settings</h1>
            <p className="text-xs text-white/70">{items.length} commodities configured</p>
          </div>
        </div>
      </div>
      )}

      {/* Desktop Toolbar */}
      {isDesktop && (
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" /> Commodity Settings
              </h2>
              <p className="text-sm text-muted-foreground">{items.length} commodities configured · Rates, deductions & charges</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-blue-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Commodities</p>
              <p className="text-2xl font-black text-foreground">{items.length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">With HSN</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{items.filter(i => i.config.hsn_code).length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Govt Deduction</p>
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{items.filter(i => i.config.govt_deduction_enabled).length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Hamali Enabled</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{items.filter(i => i.hamaliEnabled).length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {/* Add Commodity Button */}
        <AnimatePresence>
          {showAddForm ? (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-2xl p-4 border-2 border-dashed border-blue-400/50">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 block">New Commodity Name</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  autoFocus
                  placeholder="e.g., Onion, Potato, Dry Chili…"
                  value={newCommodityName}
                  onChange={e => setNewCommodityName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCommodity()}
                  className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-blue-200 dark:border-blue-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base font-medium flex-1"
                />
                <Button onClick={handleAddCommodity} className="h-12 px-5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold shadow-lg shadow-blue-500/25">
                  Add
                </Button>
                <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewCommodityName(''); }} className="h-12 px-3 rounded-xl">
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button onClick={() => setShowAddForm(true)}
                className="w-full h-14 rounded-2xl font-bold text-base bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 hover:from-blue-600 hover:via-violet-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:scale-[1.01] gap-2">
                <Plus className="w-5 h-5" /> Add Commodity
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Commodity Cards */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No commodities yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Tap "Add Commodity" to get started</p>
          </div>
        )}

        {items.map((item, index) => {
          const cName = item.commodity.commodity_name || 'Unnamed Commodity';
          const cImage = commodityImages[cName];
          return (
          <motion.div key={item.commodity.commodity_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
            <div className="glass-card rounded-2xl p-0 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === index ? null : index)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border-2 border-white/50 dark:border-white/20 flex-shrink-0">
                    {cImage ? (
                      <img src={cImage} alt={cName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{cName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground text-sm">{cName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Rate: {item.config.rate_per_unit > 0 ? `per ${item.config.rate_per_unit}kg` : 'Not set'} · Prefix: {item.billPrefix || 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCommodity(index); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Remove commodity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expanded === index ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </div>
              </button>

              <AnimatePresence>
                {expanded === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex flex-col gap-5 border-t border-border/50 pt-4">
                      {/* Rate Per Unit */}
                      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 border border-blue-200/50 dark:border-blue-800/30">
                        <label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> Rate Per Unit (kg)
                        </label>
                        <Input
                          type="number"
                          value={item.config.rate_per_unit || ''}
                          onChange={e => updateConfig(index, { rate_per_unit: Number(e.target.value) })}
                          placeholder="e.g., 90 for Rate per 90kg"
                          className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-blue-200 dark:border-blue-700/50 text-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base font-medium"
                          min={1}
                        />
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-1.5">All financial calculations use this as denominator: Final Price = (Weight ÷ Unit) × Rate</p>
                      </div>

                      {/* Weight Alarm Range */}
                      <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-200/50 dark:border-amber-800/30">
                        <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Weight Alarm Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mb-1 block">Min Weight (kg)</label>
                            <Input type="number" value={item.config.min_weight || ''} onChange={e => updateConfig(index, { min_weight: Number(e.target.value) })} placeholder="e.g., 10" className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-amber-200 dark:border-amber-700/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-base font-medium" min={0} />
                          </div>
                          <div>
                            <label className="text-[10px] text-amber-600/80 dark:text-amber-400/60 mb-1 block">Max Weight (kg)</label>
                            <Input type="number" value={item.config.max_weight || ''} onChange={e => updateConfig(index, { max_weight: Number(e.target.value) })} placeholder="e.g., 500" className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-amber-200 dark:border-amber-700/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-base font-medium" min={0} />
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg bg-amber-100/80 dark:bg-amber-900/20 px-3 py-2 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">Weight outside this range raises an outlier alert. Does <strong>not</strong> block the transaction.</p>
                        </div>
                      </div>

                      {/* Price formula preview */}
                      <div className="rounded-xl bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800/50 dark:to-gray-800/50 px-4 py-3 border border-slate-200/50 dark:border-slate-700/30">
                        <p className="text-xs text-muted-foreground mb-1 font-semibold">📐 Price Formula</p>
                        <p className="text-sm font-mono text-foreground">Final Price = (Actual Weight ÷ {item.config.rate_per_unit || '?'}) × Rate</p>
                      </div>

                      {/* Commission & User Fee */}
                      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 border border-green-200/50 dark:border-green-800/30">
                        <label className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" /> Commission & User Fee
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-green-600/80 dark:text-green-400/60 mb-1 block">Commission %</label>
                            <Input type="number" value={item.config.commission_percent || ''} onChange={e => updateConfig(index, { commission_percent: Number(e.target.value) })} placeholder="e.g., 2.5" className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-green-200 dark:border-green-700/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-base font-medium" min={0} max={100} step={0.1} />
                          </div>
                          <div>
                            <label className="text-[10px] text-green-600/80 dark:text-green-400/60 mb-1 block">User Fee %</label>
                            <Input type="number" value={item.config.user_fee_percent || ''} onChange={e => updateConfig(index, { user_fee_percent: Number(e.target.value) })} placeholder="e.g., 1.0" className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-green-200 dark:border-green-700/50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-base font-medium" min={0} max={100} step={0.1} />
                          </div>
                        </div>
                      </div>

                      {/* HSN Code */}
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" /> HSN Code
                        </label>
                        <Input type="text" value={item.config.hsn_code} onChange={e => updateConfig(index, { hsn_code: e.target.value })} placeholder="e.g., 0703" className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-slate-200 dark:border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-base" />
                      </div>

                      {/* Bill Prefix */}
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400" /> Bill Prefix
                        </label>
                        <Input
                          type="text"
                          value={item.billPrefix}
                          onChange={e => updateItem(index, { billPrefix: e.target.value.toUpperCase().slice(0, 5) })}
                          placeholder="e.g., ON, DC, PK"
                          className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-indigo-200 dark:border-indigo-700/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-base font-medium"
                          maxLength={5}
                        />
                        <p className="text-xs text-muted-foreground mt-1.5">Bill format: Prefix + Serial (e.g., PK 123456)</p>
                      </div>

                      {/* Deduction & Round-off Toggles */}
                      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4 border border-violet-200/50 dark:border-violet-800/30">
                        <label className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-violet-500" /> Deduction & Round-off
                        </label>

                        <div className="flex items-center justify-between py-3 border-b border-violet-200/30 dark:border-violet-700/30">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">Government Stipulated Deduction</span>
                            <p className="text-xs text-violet-600/70 dark:text-violet-400/60 mt-0.5">If ON → Round-off auto OFF</p>
                          </div>
                          <button
                            onClick={() => updateConfig(index, { govt_deduction_enabled: !item.config.govt_deduction_enabled })}
                            className={cn("w-14 h-8 rounded-full transition-all relative shadow-inner", item.config.govt_deduction_enabled ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/30' : 'bg-slate-300 dark:bg-slate-600')}
                          >
                            <motion.div className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1" animate={{ x: item.config.govt_deduction_enabled ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">Round-off</span>
                            <p className="text-xs text-violet-600/70 dark:text-violet-400/60 mt-0.5">Rounds Amount & Weight decimals</p>
                          </div>
                          <button
                            onClick={() => updateConfig(index, { roundoff_enabled: !item.config.roundoff_enabled })}
                            className={cn("w-14 h-8 rounded-full transition-all relative shadow-inner", item.config.roundoff_enabled ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/30' : 'bg-slate-300 dark:bg-slate-600')}
                          >
                            <motion.div className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1" animate={{ x: item.config.roundoff_enabled ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                          </button>
                        </div>
                      </div>

                      {/* Government Deduction Rules */}
                      {item.config.govt_deduction_enabled && (
                        <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Deduction Rules
                              </label>
                              <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5">e.g., If 1≤W≤35 → Net Weight = W − 1.5kg</p>
                            </div>
                            <button onClick={() => addDeductionRule(index)} className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform">
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          {item.deductionRules.map((rule, ri) => (
                            <div key={ri} className="flex items-center gap-2 mb-2">
                              <Input type="number" placeholder="Min kg" value={rule.min_weight} onChange={e => {
                                const rules = [...item.deductionRules]; rules[ri] = { ...rules[ri], min_weight: e.target.value };
                                updateItem(index, { deductionRules: rules });
                              }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-amber-200 dark:border-amber-700/50 text-sm flex-1 focus:border-amber-500" min={0} />
                              <span className="text-sm font-bold text-amber-500">–</span>
                              <Input type="number" placeholder="Max kg" value={rule.max_weight} onChange={e => {
                                const rules = [...item.deductionRules]; rules[ri] = { ...rules[ri], max_weight: e.target.value };
                                updateItem(index, { deductionRules: rules });
                              }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-amber-200 dark:border-amber-700/50 text-sm flex-1 focus:border-amber-500" min={0} />
                              <span className="text-sm font-bold text-amber-500">→</span>
                              <Input type="number" placeholder="Deduct kg" value={rule.deduction_value} onChange={e => {
                                const rules = [...item.deductionRules]; rules[ri] = { ...rules[ri], deduction_value: e.target.value };
                                updateItem(index, { deductionRules: rules });
                              }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-amber-200 dark:border-amber-700/50 text-sm flex-1 focus:border-amber-500" min={0} step={0.1} />
                              <button onClick={() => removeDeductionRule(index, ri)} className="text-red-500 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                          {item.deductionRules.length === 0 && <p className="text-xs text-amber-600/60 text-center py-3 italic">No deduction rules yet. Tap + to add one.</p>}
                          {item.deductionRules.length > 0 && (
                            <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 px-3 py-2 mt-2">
                              <p className="text-xs font-mono text-amber-700 dark:text-amber-400">Formula: If {item.deductionRules[0]?.min_weight || '?'} ≤ W ≤ {item.deductionRules[0]?.max_weight || '?'} → Net = W − {item.deductionRules[0]?.deduction_value || '?'}kg</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coolie / Unloading Charges */}
                      <div className="rounded-xl border border-pink-300/40 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-950/30 dark:to-fuchsia-950/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-pink-500" /> Coolie / Unloading (Auto-calculated)
                            </label>
                            <p className="text-xs text-pink-600/70 dark:text-pink-400/60 mt-0.5">{item.hamaliEnabled ? '✅ Slab-based logic active — Fixed Rate if W ≤ Threshold, proportional beyond' : 'Disabled — set Fixed price instead'}</p>
                          </div>
                          <button
                            onClick={() => updateItem(index, { hamaliEnabled: !item.hamaliEnabled })}
                            className={cn("w-14 h-8 rounded-full transition-all relative shadow-inner", item.hamaliEnabled ? 'bg-gradient-to-r from-pink-500 to-fuchsia-500 shadow-pink-500/30' : 'bg-slate-300 dark:bg-slate-600')}
                          >
                            <motion.div className="w-6 h-6 rounded-full bg-white shadow-md absolute top-1" animate={{ x: item.hamaliEnabled ? 28 : 4 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                          </button>
                        </div>

                        {item.hamaliEnabled && (
                          <>
                            <div className="rounded-lg bg-pink-100/60 dark:bg-pink-900/20 px-3 py-2 mb-3">
                              <p className="text-xs font-mono text-pink-700 dark:text-pink-400">If W ≤ Threshold → Unloading = Fixed Rate</p>
                              <p className="text-xs font-mono text-pink-700 dark:text-pink-400">If W &gt; Threshold → Unloading = Fixed + ((W − Threshold) × Per-kg Rate)</p>
                            </div>
                            <p className="text-[10px] text-pink-600/80 dark:text-pink-400/60 mb-2 font-semibold uppercase tracking-wider">Unloading Charge Slabs</p>
                            <div className="flex items-center justify-end mb-2">
                              <button onClick={() => addHamaliSlab(index)} className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-pink-500/30 hover:scale-105 transition-transform">
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            {item.hamaliSlabs.map((slab, si) => (
                              <div key={si} className="flex items-center gap-2 mb-2">
                                <Input type="number" placeholder="Threshold kg" value={slab.threshold_weight} onChange={e => {
                                  const slabs = [...item.hamaliSlabs]; slabs[si] = { ...slabs[si], threshold_weight: e.target.value };
                                  updateItem(index, { hamaliSlabs: slabs });
                                }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-pink-200 dark:border-pink-700/50 text-sm flex-1 focus:border-pink-500" min={1} />
                                <Input type="number" placeholder="Fixed ₹" value={slab.fixed_rate} onChange={e => {
                                  const slabs = [...item.hamaliSlabs]; slabs[si] = { ...slabs[si], fixed_rate: e.target.value };
                                  updateItem(index, { hamaliSlabs: slabs });
                                }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-pink-200 dark:border-pink-700/50 text-sm flex-1 focus:border-pink-500" min={0} />
                                <Input type="number" placeholder="Per-kg ₹" value={slab.per_kg_rate} onChange={e => {
                                  const slabs = [...item.hamaliSlabs]; slabs[si] = { ...slabs[si], per_kg_rate: e.target.value };
                                  updateItem(index, { hamaliSlabs: slabs });
                                }} className="h-11 rounded-xl bg-white dark:bg-white/10 border-2 border-pink-200 dark:border-pink-700/50 text-sm flex-1 focus:border-pink-500" min={0} step={0.1} />
                                <button onClick={() => removeHamaliSlab(index, si)} className="text-red-500 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                            {item.hamaliSlabs.length === 0 && <p className="text-xs text-pink-600/60 text-center py-3 italic">No unloading slabs yet. Tap + to add one.</p>}
                          </>
                        )}
                      </div>

                      {/* Weighing Charges (separate from unloading) */}
                      <div className="rounded-xl border border-indigo-300/40 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-4">
                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" /> Weighing Charges
                        </label>
                        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mb-2">Separate from Coolie/Unloading. Charged per weighment session.</p>
                        <Input
                          type="number"
                          value={(item.config as any).weighing_charge ?? ''}
                          onChange={e => updateConfig(index, { weighing_charge: Number(e.target.value) } as any)}
                          placeholder="e.g., 50 (Fixed ₹ per weighment)"
                          className="h-12 rounded-xl bg-white dark:bg-white/10 border-2 border-indigo-200 dark:border-indigo-700/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-base font-medium"
                          min={0}
                        />
                      </div>

                      {/* Dynamic Charges */}
                      <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 p-4 border border-cyan-200/50 dark:border-cyan-800/30">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <label className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-500" /> Dynamic Charges
                            </label>
                            <p className="text-xs text-cyan-600/70 dark:text-cyan-400/60 mt-0.5">e.g., Association Fee, Weighment Fee</p>
                          </div>
                          <button onClick={() => addCharge(index)} className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 transition-transform">
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        {item.charges.map((charge, ci) => (
                          <motion.div key={ci} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl bg-white/80 dark:bg-white/5 border-2 border-cyan-200/50 dark:border-cyan-700/30 p-3 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-[10px] text-cyan-600/80 dark:text-cyan-400/60 font-semibold uppercase tracking-wider shrink-0 self-center">Charge name</label>
                              <Input
                                type="text"
                                placeholder="e.g., Association Fee, Weighment Fee…"
                                value={charge.charge_name}
                                onChange={e => {
                                  const nc = [...item.charges]; nc[ci] = { ...nc[ci], charge_name: e.target.value };
                                  updateItem(index, { charges: nc });
                                }}
                                className="h-10 rounded-xl bg-white dark:bg-white/10 border-2 border-cyan-200 dark:border-cyan-700/50 text-sm flex-1 focus:border-cyan-500 placeholder:text-cyan-400/60"
                              />
                              <button type="button" onClick={() => removeCharge(index, ci)} className="text-red-500 hover:text-red-600 shrink-0 p-1" title="Remove charge"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                type="number"
                                placeholder={charge.charge_type === 'PERCENT' ? 'Enter percentage…' : 'Enter amount (₹)…'}
                                value={charge.value}
                                onChange={e => {
                                  const nc = [...item.charges]; nc[ci] = { ...nc[ci], value: e.target.value };
                                  updateItem(index, { charges: nc });
                                }}
                                className="h-10 rounded-xl bg-white dark:bg-white/10 border-2 border-cyan-200 dark:border-cyan-700/50 text-sm flex-1 focus:border-cyan-500"
                                min={0}
                              />
                            </div>
                            {/* Type: Percent or Fixed */}
                            <div className="flex gap-2 flex-wrap mb-2">
                              {(['PERCENT', 'FIXED'] as const).map(t => (
                                <button key={t} type="button" onClick={() => {
                                  const nc = [...item.charges]; nc[ci] = { ...nc[ci], charge_type: t };
                                  updateItem(index, { charges: nc });
                                }} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', charge.charge_type === t ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200')}>
                                  {t === 'PERCENT' ? '% Percent' : '₹ Fixed'}
                                </button>
                              ))}
                            </div>
                            {/* Basis options based on charge type */}
                            {charge.charge_type === 'PERCENT' && (
                              <div className="mb-2">
                                <p className="text-[10px] text-cyan-600/80 dark:text-cyan-400/60 mb-1 font-semibold uppercase tracking-wider">% Calculated On</p>
                                <div className="flex gap-2 flex-wrap">
                                  {(['BUYER_GROSS', 'SELLER_GROSS', 'TAXABLE_AMOUNT'] as const).map(basis => (
                                    <button key={basis} type="button" onClick={() => {
                                      const nc = [...item.charges]; nc[ci] = { ...nc[ci], percent_basis: basis } as any;
                                      updateItem(index, { charges: nc });
                                    }} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', (charge as any).percent_basis === basis ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200')}>
                                      {basis === 'BUYER_GROSS' ? 'Buyer Gross' : basis === 'SELLER_GROSS' ? 'Seller Gross' : 'Taxable Amount'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {charge.charge_type === 'FIXED' && (
                              <div className="mb-2">
                                <p className="text-[10px] text-cyan-600/80 dark:text-cyan-400/60 mb-1 font-semibold uppercase tracking-wider">Fixed Rate Basis</p>
                                <div className="flex gap-2 flex-wrap">
                                  {(['PER_COUNT', 'PER_50KG'] as const).map(basis => (
                                    <button key={basis} type="button" onClick={() => {
                                      const nc = [...item.charges]; nc[ci] = { ...nc[ci], fixed_basis: basis } as any;
                                      updateItem(index, { charges: nc });
                                    }} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', (charge as any).fixed_basis === basis ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200')}>
                                      {basis === 'PER_COUNT' ? 'Per Count' : 'Per 50 kg'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Applies to: Buyer or Seller */}
                            <div className="flex gap-2 flex-wrap">
                              {(['BUYER', 'SELLER'] as const).map(a => (
                                <button key={a} type="button" onClick={() => {
                                  const nc = [...item.charges]; nc[ci] = { ...nc[ci], applies_to: a };
                                  updateItem(index, { charges: nc });
                                }} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', charge.applies_to === a ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-500/20' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200')}>
                                  {a}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                        {item.charges.length === 0 && <p className="text-xs text-cyan-600/60 text-center py-3 italic">No charges added yet. Tap + to add one.</p>}
                      </div>

                      <Button onClick={() => saveSettings(index)} className="w-full h-13 rounded-xl font-bold text-base bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600 hover:from-blue-600 hover:via-violet-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:scale-[1.01]">
                        <Save className="w-5 h-5 mr-2" /> Save {cName} Settings
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default CommoditySettings;
