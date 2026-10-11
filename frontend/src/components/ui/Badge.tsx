import React from 'react';
import { cn } from '../../lib/utils';
import { SkillCategory } from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'skill' | 'difficulty' | 'brass' | 'outline' | 'subtle' | 'success' | 'moss' | 'secondary';
  category?: SkillCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  category,
  difficulty,
  size = 'md',
  children,
  ...props
}) => {
  const getCategoryStyles = (cat?: SkillCategory) => {
    switch (cat) {
      case 'visual_explorer':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'nature_tracker':
        return 'bg-moss-100 text-forest-900 border-moss-300 dark:bg-forest-950/60 dark:text-moss-300 dark:border-moss-800';
      case 'sound_hunter':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'urban_explorer':
        return 'bg-stone-200 text-stone-900 border-stone-300 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700';
      default:
        return 'bg-moss-100 text-forest-900 border-moss-300 dark:bg-charcoal-800 dark:text-parchment-200';
    }
  };

  const getDifficultyStyles = (diff?: string) => {
    switch (diff) {
      case 'beginner':
      case 'easy':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'intermediate':
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'advanced':
      case 'hard':
        return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-parchment-100 text-forest-900 border-parchment-200';
    }
  };

  let specificStyle = '';
  if (category) specificStyle = getCategoryStyles(category);
  else if (difficulty) specificStyle = getDifficultyStyles(difficulty);

  const baseStyles = 'inline-flex items-center rounded-full font-medium border select-none transition-colors';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const variants = {
    default: 'bg-moss-100 text-forest-900 border-moss-200 dark:bg-charcoal-800 dark:text-parchment-200 dark:border-charcoal-800',
    skill: specificStyle,
    difficulty: specificStyle,
    brass: 'bg-brass-500/15 text-brass-700 dark:text-brass-400 border-brass-500/30 font-semibold',
    outline: 'bg-transparent text-forest-900 dark:text-parchment-200 border-forest-800/30 dark:border-forest-400/30',
    subtle: 'bg-parchment-100 dark:bg-charcoal-800 text-charcoal-800 dark:text-parchment-300 border-transparent',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    moss: 'bg-moss-100 text-forest-900 border-moss-300 dark:bg-forest-950/60 dark:text-moss-300 dark:border-forest-800',
    secondary: 'bg-parchment-200 text-charcoal-800 border-parchment-300 dark:bg-charcoal-800 dark:text-parchment-200 dark:border-charcoal-700'
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], variants[variant], specificStyle, className)} {...props}>
      {children}
    </span>
  );
};
