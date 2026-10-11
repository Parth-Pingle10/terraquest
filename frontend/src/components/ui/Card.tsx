import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'journal' | 'elevated' | 'sunken' | 'brass';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'bg-parchment-50/90 dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800 rounded-2xl shadow-field',
      journal:
        'bg-[#fdfcf9] dark:bg-[#161b17] border border-[#ebe4d2] dark:border-[#232b24] rounded-2xl shadow-field relative overflow-hidden',
      elevated:
        'bg-parchment-50 dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800 rounded-2xl shadow-elevated',
      sunken:
        'bg-moss-50/50 dark:bg-charcoal-950/60 border border-moss-200/50 dark:border-charcoal-800 rounded-2xl',
      brass:
        'bg-gradient-to-br from-parchment-50 to-moss-50/30 dark:from-charcoal-900 dark:to-charcoal-950 border-2 border-brass-500/40 rounded-2xl shadow-field',
    };

    return (
      <div ref={ref} className={cn(variants[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
