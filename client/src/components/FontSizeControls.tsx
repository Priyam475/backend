import { useFontSize } from '@/context/FontSizeContext';
import { cn } from '@/lib/utils';

interface FontSizeControlsProps {
  className?: string;
  variant?: 'light' | 'default';
}

const FontSizeControls = ({ className, variant = 'default' }: FontSizeControlsProps) => {
  const { level, setLevel } = useFontSize();

  const btnBase = cn(
    'flex items-center justify-center rounded-xl transition-all duration-200 font-bold select-none',
    variant === 'light'
      ? 'text-white/80 hover:text-white hover:bg-white/15'
      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60 glass-panel'
  );

  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label="Font size controls">
      <button
        onClick={() => setLevel(0)}
        disabled={level === 0}
        aria-label="Small font size"
        className={cn(btnBase, 'w-9 h-9 text-xs', level === 0 ? 'opacity-40 pointer-events-none ring-1 ring-primary/40' : '')}
      >
        A
      </button>
      <button
        onClick={() => setLevel(1)}
        disabled={level === 1}
        aria-label="Medium font size"
        className={cn(btnBase, 'w-9 h-9 text-sm', level === 1 ? 'opacity-40 pointer-events-none ring-1 ring-primary/40' : '')}
      >
        A
      </button>
      <button
        disabled={level === 2}
        onClick={() => setLevel(2)}
        aria-label="Large font size"
        className={cn(btnBase, 'w-9 h-9 text-lg', level === 2 ? 'opacity-40 pointer-events-none ring-1 ring-primary/40' : '')}
      >
        A
      </button>
    </div>
  );
};

export default FontSizeControls;
