import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Map, Sparkles, Award, BookOpen, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Explore', path: '/', icon: Compass },
  { name: 'Map', path: '/map', icon: Map },
  { name: 'Quests', path: '/quests', icon: Sparkles },
  { name: 'Skill Tree', path: '/skills', icon: Award },
  { name: 'Memories', path: '/memories', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const DesktopSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 border-r border-parchment-200 dark:border-charcoal-800 bg-parchment-50/70 dark:bg-charcoal-900/70 p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <div className="space-y-1.5 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all group select-none',
                  isActive
                    ? 'bg-forest-800 text-parchment-50 shadow-field dark:bg-forest-700 font-semibold'
                    : 'text-forest-900/80 dark:text-parchment-200 hover:bg-forest-50 dark:hover:bg-charcoal-800'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform group-hover:scale-110 shrink-0',
                      isActive ? 'text-brass-400' : 'text-forest-700/70 dark:text-moss-400'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
        <div className="p-3.5 rounded-2xl bg-moss-50/80 dark:bg-charcoal-950 border border-moss-200/50 dark:border-charcoal-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-forest-900 dark:text-parchment-100 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-brass-500 animate-pulse" />
            Field Expedition
          </div>
          <p className="text-xs text-forest-800/70 dark:text-parchment-400 mt-1 leading-relaxed">
            Step outside, observe physical terrain, and reveal your world.
          </p>
        </div>
      </div>
    </aside>
  );
};

export const MobileBottomNav: React.FC = () => {
  // Mobile displays primary exploration destinations
  const mobileNavItems = navItems.filter((i) => i.name !== 'Settings');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-parchment-50/95 dark:bg-charcoal-900/95 backdrop-blur-lg border-t border-parchment-200 dark:border-charcoal-800 pb-[env(safe-area-inset-bottom)] shadow-lg transition-colors">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 transition-colors relative py-1',
                  isActive
                    ? 'text-forest-900 dark:text-brass-400 font-bold'
                    : 'text-forest-800/60 dark:text-parchment-400 hover:text-forest-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive ? 'scale-110 text-forest-800 dark:text-brass-400' : ''
                    )}
                  />
                  <span className="text-[10px] tracking-tight truncate max-w-[64px]">{item.name}</span>
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-forest-800 dark:bg-brass-400" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
