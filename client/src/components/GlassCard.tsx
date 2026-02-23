import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'glass-panel rounded-3xl p-6 transition-all duration-300',
        hover && 'hover:scale-[1.02] hover:primary-glow cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = 'GlassCard';
export default GlassCard;
