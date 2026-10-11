import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Moon, Sun, Cpu, Wifi, WifiOff, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, isAuthenticated, backendOnline, aiStatus, theme, toggleTheme } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-parchment-50/90 dark:bg-charcoal-900/90 backdrop-blur-md border-b border-parchment-200 dark:border-charcoal-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-forest-800 dark:bg-forest-700 flex items-center justify-center text-parchment-50 shadow-field group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-forest-950 dark:text-parchment-50 block leading-tight">
              TerraQuest
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-forest-700/70 dark:text-moss-400 block -mt-0.5">
              Field Atlas
            </span>
          </div>
        </Link>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* AI Status Chip */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-parchment-300 dark:border-charcoal-800 bg-parchment-100/60 dark:bg-charcoal-800 text-forest-900 dark:text-parchment-300"
            title={aiStatus?.ollama_reachable ? `Local Model: ${aiStatus.configured_model}` : 'Offline Deterministic Rules'}
          >
            <Cpu className="w-3.5 h-3.5 text-moss-600 dark:text-moss-400" />
            <span className="truncate max-w-[120px]">
              {aiStatus?.active_provider === 'ollama' ? 'Ollama: Qwen' : 'Local AI'}
            </span>
          </div>

          {/* Connection Status */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono text-forest-800 dark:text-parchment-300"
            title={backendOnline ? 'Connected to local FastAPI backend' : 'Backend offline - Local mode active'}
          >
            {backendOnline ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden md:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Offline</span>
              </span>
            )}
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl text-forest-800 dark:text-parchment-300"
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-brass-400" />}
          </Button>

          {/* Account / Login */}
          {isAuthenticated && user ? (
            <Link to="/settings">
              <Button variant="secondary" size="sm" className="gap-2 font-medium">
                <UserIcon className="w-3.5 h-3.5 text-forest-700 dark:text-moss-400" />
                <span className="max-w-[100px] truncate">{user.display_name || user.username}</span>
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="primary" size="sm" className="shadow-none">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
