import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'light' | 'default';
}

const MobileSearchInput = ({ value, onChange, placeholder = 'Search…', className, variant = 'light' }: MobileSearchInputProps) => (
  <div className={cn("relative", className)}>
    <Search className={cn(
      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
      variant === 'light' ? 'text-white/50' : 'text-muted-foreground'
    )} aria-hidden="true" />
    <input
      type="search"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "w-full h-10 pl-10 pr-4 rounded-xl text-sm focus:outline-none",
        variant === 'light'
          ? 'bg-white/20 backdrop-blur text-white placeholder:text-white/50 border border-white/10 focus:border-white/30'
          : 'bg-muted/50 text-foreground border border-border focus:border-primary/50'
      )}
    />
  </div>
);

export default MobileSearchInput;