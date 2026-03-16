import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import InlineScribblePad from '@/components/InlineScribblePad';
import { cn } from '@/lib/utils';

interface BuyerEntry {
  mark: string;
  name: string;
  contactId?: string;
}

interface Preset {
  key: string;
  value: number;
}

interface BuyerMarkSectionProps {
  buyers: BuyerEntry[];
  presets: Preset[];
  onAddMark: (mark: string) => void;
  onSelectBuyer?: (buyer: BuyerEntry) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const BuyerMarkSection = ({ buyers, presets, onAddMark, onSelectBuyer, searchQuery = '', onSearchChange }: BuyerMarkSectionProps) => {
  const [showScribble, setShowScribble] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const search = onSearchChange ? searchQuery : localSearch;
  const setSearch = onSearchChange ?? (() => {});

  const filteredBuyers = useMemo(() => {
    if (!search) return buyers;
    const q = search.toLowerCase();
    return buyers.filter(b => b.mark.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
  }, [buyers, search]);

  const handleScribbleMark = (mark: string) => {
    onAddMark(mark);
    setShowScribble(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Buyer Marks</p>
        <button
          type="button"
          onClick={() => setShowScribble(!showScribble)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-semibold shadow-sm"
        >
          <Plus className="w-3 h-3" /> Add Mark
        </button>
      </div>

      {showScribble && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <InlineScribblePad onMarkDetected={handleScribbleMark} canvasHeight={100} className="mb-2" />
        </motion.div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search buyer mark…"
          value={onSearchChange ? searchQuery : localSearch}
          onChange={e => (onSearchChange ? onSearchChange(e.target.value) : setLocalSearch(e.target.value))}
          className="w-full h-8 pl-8 pr-3 rounded-lg text-xs bg-muted/30 border border-border/30 focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex gap-2 px-1 min-w-max">
          {filteredBuyers.map((buyer, i) => (
            <button
              key={`${buyer.mark}-${i}`}
              type="button"
              onClick={() => onSelectBuyer?.(buyer)}
              className="flex-shrink-0 px-3 py-2 rounded-xl border border-border/30 bg-card hover:bg-muted/50 transition-colors text-left"
            >
              <span className="text-xs font-bold text-foreground">[{buyer.mark}]</span>
              <p className="text-[9px] text-muted-foreground truncate max-w-[80px]">{buyer.name}</p>
            </button>
          ))}
          {filteredBuyers.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic py-2">No buyers found</p>
          )}
        </div>
      </div>

      {presets.length > 0 && (
        <div className="overflow-x-auto -mx-1 pb-1">
          <div className="flex gap-1.5 px-1 min-w-max">
            {presets.map((preset, i) => (
              <span
                key={`${preset.key}-${i}`}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold',
                  preset.value > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : preset.value < 0
                    ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                    : 'bg-muted/50 text-muted-foreground'
                )}
              >
                {preset.key}: {preset.value > 0 ? '+' : ''}{preset.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerMarkSection;
