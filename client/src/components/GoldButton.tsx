import React from 'react';
import { cn } from '@/lib/utils';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const GoldButton = React.forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
      primary: 'primary-button',
      outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl transition-all duration-300',
      ghost: 'text-muted-foreground hover:text-foreground rounded-2xl transition-all duration-300',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'font-semibold inline-flex items-center justify-center gap-2',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GoldButton.displayName = 'GoldButton';
export default GoldButton;
