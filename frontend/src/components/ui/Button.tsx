import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'brass' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isSpinner = isLoading || loading;
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-forest-800 hover:bg-forest-900 text-parchment-50 shadow-field hover:shadow-elevated focus:ring-forest-700 dark:bg-forest-700 dark:hover:bg-forest-600',
      secondary:
        'bg-moss-100 hover:bg-moss-200 text-forest-950 border border-moss-200 dark:bg-charcoal-800 dark:text-parchment-100 dark:border-charcoal-800 dark:hover:bg-charcoal-800/80',
      outline:
        'border-2 border-forest-800/20 hover:border-forest-800/50 text-forest-900 hover:bg-forest-50/50 dark:border-forest-600/40 dark:text-parchment-100 dark:hover:bg-forest-950/40',
      brass:
        'bg-gradient-to-r from-brass-500 to-brass-600 hover:from-brass-400 hover:to-brass-500 text-charcoal-950 font-semibold shadow-field focus:ring-brass-500',
      ghost:
        'hover:bg-forest-50/80 text-forest-900 dark:text-parchment-100 dark:hover:bg-charcoal-800',
      danger:
        'bg-red-700 hover:bg-red-800 text-white shadow-field focus:ring-red-600',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3.5 gap-2.5',
      icon: 'p-2.5 aspect-square',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinner}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isSpinner ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
