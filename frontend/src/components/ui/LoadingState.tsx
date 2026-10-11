import React from 'react';
import { Compass } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Consulting field map & survey notes...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center min-h-[220px]', className)}>
      <div className="relative mb-4">
        <Compass className="w-10 h-10 text-forest-700 dark:text-moss-400 animate-spin" style={{ animationDuration: '6s' }} />
        <div className="absolute inset-0 rounded-full border-2 border-forest-600/20 dark:border-moss-400/20 animate-ping" />
      </div>
      <p className="font-serif italic text-base text-forest-900/80 dark:text-parchment-200">
        {message}
      </p>
    </div>
  );
};
