import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative w-full max-w-lg bg-parchment-50 dark:bg-charcoal-900 border border-parchment-300 dark:border-charcoal-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 transition-all transform scale-100 animate-in fade-in zoom-in-95',
          className
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h2 className="font-serif text-2xl font-bold text-forest-950 dark:text-parchment-50">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-forest-800/80 dark:text-parchment-300 mt-1">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full -mr-2 -mt-2 text-forest-700 hover:text-forest-950 dark:text-parchment-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
