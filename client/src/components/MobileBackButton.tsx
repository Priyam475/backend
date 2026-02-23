import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBackButtonProps {
  onClick: () => void;
  className?: string;
}

const MobileBackButton = ({ onClick, className }: MobileBackButtonProps) => (
  <button
    onClick={onClick}
    aria-label="Go back"
    className={cn(
      "w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-white/20 backdrop-blur flex items-center justify-center",
      className
    )}
  >
    <ArrowLeft className="w-5 h-5 text-white" />
  </button>
);

export default MobileBackButton;