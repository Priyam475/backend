import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bluetooth, BluetoothOff, Wifi, Scale, Plus, Trash2,
  Search, Hash, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  Lock, ArrowRightLeft, Sunset
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDesktopMode } from '@/hooks/use-desktop';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import { useAuctionResults } from '@/hooks/useAuctionResults';

// ── localStorage helpers ──────────────────────────────────
function getStore<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Types ─────────────────────────────────────────────────
interface ScaleDevice {
  id: string;
  name: string;
  connected: boolean;
  connectedBy: string | null;
}

interface BidCard {
  bidNumber: number;
  buyerMark: string;
  buyerName: string;
  totalQuantity: number;
  weighedQuantity: number;
  lotId: string;
  lotName: string;
  isComplete: boolean;
}

interface WeightLogEntry {
  id: string;
  bidNumber: number;
  buyerMark: string;
  weight: number;
  consideredWeight: number; // Rounded/considered weight
  timestamp: string;
  scaleId: string;
}

// ── Simulated scales (Req 1, 2) ─────────────────────────────
const SIMULATED_SCALES: ScaleDevice[] = [
  { id: 'NTC-1', name: 'NTC-1', connected: false, connectedBy: null },
  { id: 'NTC-2', name: 'NTC-2', connected: false, connectedBy: null },
  { id: 'NTC-3', name: 'NTC-3', connected: false, connectedBy: null },
  { id: 'NTC-4', name: 'NTC-4', connected: false, connectedBy: null },
];

// Round to considered weight
function consideredWt(w: number): number {
  return Math.round(w);
}

const WritersPadPage = () => {
  const navigate = useNavigate();
  const isDesktop = useDesktopMode();

  // Req 1, 2: Scale connection
  const [scales, setScales] = useState<ScaleDevice[]>(SIMULATED_SCALES);
  const [connectedScale, setConnectedScale] = useState<ScaleDevice | null>(null);
  const [showScaleSelector, setShowScaleSelector] = useState(true);

  // Req 3, 4: Dashboard with real-time weight
  const [currentWeight, setCurrentWeight] = useState(0);
  const [isLoadOnScale, setIsLoadOnScale] = useState(false);
  const [weightLocked, setWeightLocked] = useState(false);

  // Req 5, 6: Bid cards
  const [bidCards, setBidCards] = useState<BidCard[]>([]);
  const [bidNumberInput, setBidNumberInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Req 10: Retag dialog
  const [retagEntry, setRetagEntry] = useState<WeightLogEntry | null>(null);
  const [retagTarget, setRetagTarget] = useState('');

  // Req 13: Weight log
  const [weightLog, setWeightLog] = useState<WeightLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);

  // Req 4: Simulate real-time weight reading
  useEffect(() => {
    if (!connectedScale) return;
    const interval = setInterval(() => {
      if (!weightLocked) {
        if (isLoadOnScale) {
          setCurrentWeight(prev => {
            const base = prev || 48 + Math.random() * 5;
            return parseFloat((base + (Math.random() - 0.5) * 0.3).toFixed(1));
          });
        } else {
          setCurrentWeight(0);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [connectedScale, isLoadOnScale, weightLocked]);

  // Req 12: Check for end-of-day cleanup
  useEffect(() => {
    const lastCleanup = localStorage.getItem('mkt_writer_last_cleanup');
    const today = new Date().toISOString().split('T')[0];
    if (lastCleanup !== today) {
      // Clear cards and log from previous day
      setBidCards([]);
      setWeightLog([]);
      localStorage.setItem('mkt_writer_last_cleanup', today);
    }
  }, []);

  // Req 2: Connect to scale (no passkey)
  const connectScale = (scale: ScaleDevice) => {
    setScales(prev => prev.map(s =>
      s.id === scale.id ? { ...s, connected: true, connectedBy: 'Current User' } : s
    ));
    setConnectedScale({ ...scale, connected: true, connectedBy: 'Current User' });
    setShowScaleSelector(false);
    toast.success(`Connected to ${scale.name}`);
  };

  const { auctionResults: auctionData } = useAuctionResults();

  // Req 5: Add bid card by bid number
  const addBidCard = () => {
    const num = parseInt(bidNumberInput);
    if (!num || num <= 0) { toast.error('Enter a valid bid number'); return; }
    if (bidCards.some(c => c.bidNumber === num)) { toast.error('Bid card already added'); return; }

    let foundEntry: any = null;
    let foundAuction: any = null;

    auctionData.forEach((auction: any) => {
      (auction.entries || []).forEach((entry: any) => {
        if (entry.bidNumber === num) {
          foundEntry = entry;
          foundAuction = auction;
        }
      });
    });

    if (!foundEntry) { toast.error(`Bid #${num} not found`); return; }

    const card: BidCard = {
      bidNumber: num,
      buyerMark: foundEntry.buyerMark,
      buyerName: foundEntry.buyerName,
      totalQuantity: foundEntry.quantity,
      weighedQuantity: 0,
      lotId: String(foundAuction.lotId),
      lotName: foundAuction.lotName || '',
      isComplete: false,
    };
    setBidCards(prev => [...prev, card]);
    setBidNumberInput('');
    toast.success(`Bid #${num} added — ${foundEntry.buyerMark}`);
  };

  // Req 8: Tap card to attach weight
  const attachWeight = (card: BidCard) => {
    if (card.isComplete) { toast.error('All bags weighed for this bid'); return; }
    if (currentWeight <= 0) { toast.error('No load on scale'); return; }
    if (weightLocked) { toast.error('Weight recorded — remove load to reset'); return; }

    const cw = consideredWt(currentWeight);
    const logEntry: WeightLogEntry = {
      id: crypto.randomUUID(),
      bidNumber: card.bidNumber,
      buyerMark: card.buyerMark,
      weight: currentWeight,
      consideredWeight: cw,
      timestamp: new Date().toISOString(),
      scaleId: connectedScale?.id || '',
    };

    setWeightLog(prev => [logEntry, ...prev]);

    // Req 7: Update weighed quantity
    setBidCards(prev => prev.map(c => {
      if (c.bidNumber !== card.bidNumber) return c;
      const newWeighed = c.weighedQuantity + 1;
      return { ...c, weighedQuantity: newWeighed, isComplete: newWeighed >= c.totalQuantity };
    }));

    // Req 9: Lock until load removed
    setWeightLocked(true);

    // Persist
    const sessions = getStore<any>('mkt_writer_weights');
    sessions.push(logEntry);
    setStore('mkt_writer_weights', sessions);

    toast.success(`${currentWeight}kg (→${cw}kg) → #${card.bidNumber} (${card.buyerMark})`);
  };

  // Req 10: Retag weight
  const confirmRetag = () => {
    if (!retagEntry || !retagTarget) return;
    const newBidNum = parseInt(retagTarget);
    const targetCard = bidCards.find(c => c.bidNumber === newBidNum);
    if (!targetCard) { toast.error('Target bid not found'); return; }

    setWeightLog(prev => prev.map(l =>
      l.id === retagEntry.id ? { ...l, bidNumber: newBidNum, buyerMark: targetCard.buyerMark } : l
    ));

    setBidCards(prev => prev.map(c => {
      if (c.bidNumber === retagEntry.bidNumber) {
        const nw = Math.max(0, c.weighedQuantity - 1);
        return { ...c, weighedQuantity: nw, isComplete: nw >= c.totalQuantity };
      }
      if (c.bidNumber === newBidNum) {
        const nw = c.weighedQuantity + 1;
        return { ...c, weighedQuantity: nw, isComplete: nw >= c.totalQuantity };
      }
      return c;
    }));

    toast.info(`Retagged to Bid #${newBidNum}`);
    setRetagEntry(null);
    setRetagTarget('');
  };

  // Req 9: Load controls
  const removeLoad = () => { setIsLoadOnScale(false); setWeightLocked(false); setCurrentWeight(0); };
  const placeLoad = () => { setIsLoadOnScale(true); setWeightLocked(false); };

  // Req 12: End of day cleanup
  const endOfDayCleanup = () => {
    setBidCards([]);
    setWeightLog([]);
    localStorage.setItem('mkt_writer_last_cleanup', new Date().toISOString().split('T')[0]);
    toast.success('All bid cards cleared for end of day');
  };

  const filteredCards = useMemo(() => {
    if (!searchQuery) return bidCards;
    const q = searchQuery.toLowerCase();
    return bidCards.filter(c =>
      c.buyerMark.toLowerCase().includes(q) ||
      c.buyerName.toLowerCase().includes(q) ||
      String(c.bidNumber).includes(q)
    );
  }, [bidCards, searchQuery]);

  // ═══ SCALE SELECTOR (Req 1, 2) ═══
  if (showScaleSelector) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
        {!isDesktop && (
        <div className="bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 px-4 rounded-b-[2rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/home')} aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5" /> Writer's Pad
                </h1>
                <p className="text-white/70 text-xs">Connect to a Weighing Scale to Start a New Session</p>
              </div>
            </div>
          </div>
        </div>
        )}
        {isDesktop && (
          <div className="px-8 py-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-500" /> Writer's Pad — Scale Selection
                </h2>
                <p className="text-sm text-muted-foreground">Connect to a weighing scale to start a new session</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-cyan-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Available Scales</p>
                <p className="text-2xl font-black text-foreground">{scales.filter(s => !s.connectedBy).length}</p>
              </div>
              <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">In Use</p>
                <p className="text-2xl font-black text-foreground">{scales.filter(s => s.connectedBy).length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 mt-6 space-y-3">
          <p className="text-sm font-semibold text-foreground px-1">Available Weighing Scales</p>
          {scales.map((scale, i) => (
            <motion.div key={scale.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-md",
                  scale.connectedBy
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-to-br from-cyan-400 to-blue-500")}>
                  {scale.connectedBy
                    ? <Wifi className="w-6 h-6 text-white" />
                    : <Bluetooth className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">{scale.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {scale.connectedBy
                      ? `Connected to: ${scale.connectedBy}`
                      : 'Available to connect'}
                  </p>
                </div>
                <Button onClick={() => connectScale(scale)}
                  disabled={!!scale.connectedBy}
                  className={cn("rounded-xl text-sm font-bold px-5 h-10",
                    scale.connectedBy
                      ? "bg-muted/40 text-muted-foreground"
                      : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md")}>
                  {scale.connectedBy ? 'In Use' : 'Connect'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ═══ WRITER'S DASHBOARD (Req 3-14) ═══
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-blue-50/30 dark:to-blue-950/10 pb-28 lg:pb-6">
      {/* Header with real-time weight */}
      {!isDesktop ? (
      <div className="bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5 px-4 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowScaleSelector(true)}
              aria-label="Go back" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5" /> Writer's Pad
              </h1>
              <p className="text-white/70 text-xs">{connectedScale?.name} · Session Active</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/30 text-emerald-100 text-[9px] font-bold flex items-center gap-1">
              <Bluetooth className="w-3 h-3" /> {connectedScale?.name}
            </span>
          </div>

          {/* Req 4: Real-time weight display with Considered Wt */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-[9px] text-white/50 uppercase font-semibold">{connectedScale?.name}</p>
                <motion.p key={currentWeight}
                  initial={{ scale: 1.05 }} animate={{ scale: 1 }}
                  className={cn("text-4xl font-black tracking-tight",
                    currentWeight > 0 ? "text-white" : "text-white/30")}>
                  {currentWeight.toFixed(1)}
                  <span className="text-sm font-semibold ml-0.5">kg</span>
                </motion.p>
              </div>
              <div className="text-center border-l border-white/20">
                <p className="text-[9px] text-white/50 uppercase font-semibold">Considered Wt</p>
                <p className={cn("text-4xl font-black tracking-tight",
                  currentWeight > 0 ? "text-amber-200" : "text-white/30")}>
                  {consideredWt(currentWeight)}
                  <span className="text-sm font-semibold ml-0.5">kg</span>
                </p>
                <p className="text-[8px] text-white/40">Rounded OFF</p>
              </div>
            </div>
            <p className="text-[9px] text-white/50 mt-2 text-center">
              {currentWeight > 0
                ? (weightLocked ? '✓ Weight recorded — remove load to reset' : 'Tap a bid card below to attach this weight')
                : 'Place load on scale to read weight'}
            </p>
          </div>
        </div>
      </div>
      ) : (
        <div className="px-8 py-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-500" /> Writer's Pad
              </h2>
              <p className="text-sm text-muted-foreground">{connectedScale?.name} · Session Active</p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <Bluetooth className="w-3.5 h-3.5" /> {connectedScale?.name} Connected
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-cyan-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{connectedScale?.name} Reading</p>
              <motion.p key={currentWeight} initial={{ scale: 1.05 }} animate={{ scale: 1 }}
                className={cn("text-3xl font-black", currentWeight > 0 ? "text-foreground" : "text-muted-foreground/30")}>
                {currentWeight.toFixed(1)}<span className="text-sm ml-1">kg</span>
              </motion.p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-amber-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Considered Wt</p>
              <p className={cn("text-3xl font-black", currentWeight > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/30")}>
                {consideredWt(currentWeight)}<span className="text-sm ml-1">kg</span>
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-emerald-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Bid Cards</p>
              <p className="text-3xl font-black text-foreground">{bidCards.length}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 border-l-4 border-l-violet-500">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Weights Logged</p>
              <p className="text-3xl font-black text-foreground">{weightLog.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {/* Simulate load controls (for demo) */}
        <div className="flex gap-2">
          <Button onClick={placeLoad} disabled={isLoadOnScale}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold shadow-md">
            <Plus className="w-4 h-4 mr-1" /> Place Load
          </Button>
          <Button onClick={removeLoad} disabled={!isLoadOnScale}
            variant="outline" className="flex-1 h-11 rounded-xl text-sm font-bold border-destructive/30 text-destructive hover:bg-destructive/10">
            <RefreshCw className="w-4 h-4 mr-1" /> Remove Load
          </Button>
        </div>

        {/* Req 5: Add Bid Card */}
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add Bid Card</p>
          <div className="flex gap-2">
            <Input type="number" value={bidNumberInput} onChange={e => setBidNumberInput(e.target.value)}
              placeholder="Enter Bid Number" className="flex-1 h-11 rounded-xl text-center font-bold text-lg bg-muted/20"
              onKeyDown={e => e.key === 'Enter' && addBidCard()} />
            <Button onClick={addBidCard} className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold shadow-md">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search (show when >3 cards) */}
        {bidCards.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bid cards…"
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/20 border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
          </div>
        )}

        {/* Req 6, 7, 8, 11: Bid Cards */}
        <div className="space-y-2">
          {filteredCards.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Hash className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bid cards added</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Enter a bid number above</p>
            </div>
          ) : (
            filteredCards.map(card => (
              <motion.button
                key={card.bidNumber}
                onClick={() => attachWeight(card)}
                disabled={card.isComplete || !isLoadOnScale || weightLocked}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "w-full glass-card rounded-2xl p-3.5 text-left transition-all",
                  card.isComplete
                    ? "opacity-40 cursor-not-allowed" // Req 11: greyed out
                    : isLoadOnScale && !weightLocked
                      ? "ring-2 ring-primary/50 shadow-lg cursor-pointer hover:shadow-xl"
                      : "cursor-default"
                )}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shadow-md flex-shrink-0",
                    card.isComplete ? "bg-muted" : "bg-gradient-to-br from-primary to-accent")}>
                    <span className={cn("font-black text-base", card.isComplete ? "text-muted-foreground" : "text-white")}>
                      {card.buyerMark}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate">{card.buyerName}</p>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold">#{card.bidNumber}</span>
                      {card.isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{card.lotName}</span>
                      <span>Weighed: <span className="font-bold text-foreground">{card.weighedQuantity}/{card.totalQuantity}</span></span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="w-20 h-2.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        card.isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-accent")}
                        style={{ width: `${(card.weighedQuantity / card.totalQuantity) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                      {Math.round((card.weighedQuantity / card.totalQuantity) * 100)}%
                    </p>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Req 12: End of Day Cleanup */}
        {bidCards.length > 0 && (
          <button onClick={endOfDayCleanup}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-all">
            <Sunset className="w-3.5 h-3.5" /> End of Day — Clear All Cards (Req 12)
          </button>
        )}

        {/* Req 13: Weight Log with Mark, LotID, Weight columns */}
        <button onClick={() => setShowLog(!showLog)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/30 text-muted-foreground text-xs font-semibold hover:bg-muted/50 transition-all">
          <Clock className="w-3.5 h-3.5" />
          Weight Log ({weightLog.length} entries) · Showing Last 50
        </button>

        <AnimatePresence>
          {showLog && weightLog.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="glass-card rounded-2xl p-3">
                {/* Column headers matching SRS diagram */}
                <div className="grid grid-cols-6 gap-1 px-2 py-1.5 text-[8px] font-bold text-muted-foreground uppercase border-b border-border/30 mb-1">
                  <span>Bid#</span>
                  <span>Mark</span>
                  <span>Weight</span>
                  <span>Cons.Wt</span>
                  <span>Time</span>
                  <span>Action</span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {weightLog.slice(0, 50).map(entry => (
                    <div key={entry.id} className="grid grid-cols-6 gap-1 items-center px-2 py-2 rounded-xl bg-muted/15 text-xs">
                      <span className="font-bold text-primary">#{entry.bidNumber}</span>
                      <span className="font-bold text-foreground">{entry.buyerMark}</span>
                      <span className="font-semibold text-foreground">{entry.weight.toFixed(1)}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{entry.consideredWeight}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => { setRetagEntry(entry); setRetagTarget(''); }}
                        className="flex items-center gap-0.5 text-[9px] text-primary hover:text-primary/80 font-semibold">
                        <ArrowRightLeft className="w-3 h-3" /> Retag
                      </button>
                    </div>
                  ))}
                </div>
                {/* Req 14: Delete note */}
                <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <p className="text-[9px] text-amber-600 dark:text-amber-400">
                    Deleting weights requires admin permission (RBAC — Req 14)
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Req 10: Retag Dialog */}
      <AnimatePresence>
        {retagEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
            onClick={() => setRetagEntry(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-card rounded-2xl p-5 shadow-2xl border border-border/50" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-center text-foreground mb-1">Retag Weight</h3>
              <p className="text-sm text-center text-muted-foreground mb-4">
                Move {retagEntry.weight}kg from Bid #{retagEntry.bidNumber} ({retagEntry.buyerMark}) to another bid
              </p>
              <Input type="number" value={retagTarget} onChange={e => setRetagTarget(e.target.value)}
                placeholder="Target Bid Number"
                className="h-12 rounded-xl text-center font-bold text-lg mb-3" />
              <div className="flex gap-3">
                <Button onClick={() => setRetagEntry(null)} variant="outline" className="flex-1 h-11 rounded-xl">Cancel</Button>
                <Button onClick={confirmRetag} disabled={!retagTarget}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-white">
                  Retag
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default WritersPadPage;
