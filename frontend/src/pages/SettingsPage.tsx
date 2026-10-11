import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { idb } from '../lib/idb';
import { storage } from '../lib/storage';
import { syncApi } from '../services/sync-api';
import { explorationApi } from '../services/exploration-api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { 
  Settings as SettingsIcon, 
  User, 
  Moon, 
  Sun, 
  Sparkles, 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  LogOut, 
  Check, 
  AlertCircle,
  BarChart3,
  Compass,
  Award
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { 
    user, 
    isAuthenticated, 
    guestProfile, 
    updateGuestProfile, 
    logout, 
    theme, 
    toggleTheme,
    aiStatus,
    refreshAIStatus
  } = useAuth();

  // Local storage metrics
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Profile edit
  const [displayName, setDisplayName] = useState(
    isAuthenticated ? user?.display_name || '' : guestProfile.displayName
  );
  const [prefDuration, setPrefDuration] = useState(guestProfile.preferredDuration);
  const [prefDifficulty, setPrefDifficulty] = useState(guestProfile.preferredDifficulty);
  const [savedNotice, setSavedNotice] = useState(false);

  // Stats
  const [stats, setStats] = useState<{
    cellsExplored: number;
    discoveriesRecorded: number;
    totalXP: number;
    level: number;
  }>({
    cellsExplored: 0,
    discoveriesRecorded: 0,
    totalXP: 0,
    level: 1
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const photos = await idb.getAllPhotos();
        setPhotoCount(photos.length);

        const memories = await idb.getAllDiscoveries();
        setMemoryCount(memories.length);

        if (isAuthenticated) {
          const statsData = await explorationApi.getExplorationStats();
          setStats({
            cellsExplored: statsData.unique_cells_visited,
            discoveriesRecorded: statsData.total_discoveries,
            totalXP: user?.xp || 0,
            level: user?.level || 1
          });
        } else {
          setStats({
            cellsExplored: Math.max(1, memories.length),
            discoveriesRecorded: memories.length,
            totalXP: storage.getGuestXP(),
            level: storage.getGuestLevel()
          });
        }
      } catch (err) {
        console.error('Failed to load metrics:', err);
      }
    };

    loadMetrics();
  }, [isAuthenticated, user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateGuestProfile({
      displayName: (displayName || '').trim(),
      preferredDuration: prefDuration,
      preferredDifficulty: prefDifficulty
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Export local field journal as JSON
  const handleExportData = async () => {
    try {
      const memories = await idb.getAllDiscoveries();
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: isAuthenticated ? user : guestProfile,
        xp: stats.totalXP,
        level: stats.level,
        memories
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terraquest-journal-backup-${Date.now()}.json`;
      a.click();
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Clear local device data
  const handleClearLocalData = async () => {
    if (!confirm('Warning: This will delete all local photos and unsynchronized memories from this browser. Proceed?')) {
      return;
    }
    try {
      await idb.clearAllData();
      storage.clear();
      alert('Local storage data cleared.');
      window.location.reload();
    } catch (err: any) {
      alert(`Clear failed: ${err.message}`);
    }
  };

  // Sync to Cloud
  const handleSyncToCloud = async () => {
    if (!isAuthenticated) {
      alert('Please log in first to synchronize your local records.');
      return;
    }

    setSyncing(true);
    setSyncSuccess(null);
    try {
      const unsyncedMemories = await idb.getAllDiscoveries();
      if (unsyncedMemories.length === 0) {
        setSyncSuccess('All local discoveries are already up to date!');
        setSyncing(false);
        return;
      }

      const syncResult = await syncApi.syncBatch({
        discoveries: unsyncedMemories.map((m: any) => ({
          title: m.title,
          category: m.category,
          observation: m.observation,
          personal_reflection: m.personal_reflection,
          latitude: m.latitude,
          longitude: m.longitude,
          created_at: m.created_at
        }))
      });

      setSyncSuccess(`Successfully synchronized ${syncResult.synced_discoveries_count} discoveries to your cloud atlas!`);
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner */}
      <div className="border-b border-parchment-200 dark:border-charcoal-800 pb-5">
        <span className="text-xs font-mono uppercase tracking-widest text-forest-700 dark:text-moss-400 font-bold">
          Field Configuration
        </span>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900 dark:text-parchment-50 mt-1">
          Settings & Atlas Records
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1">
          Manage your explorer identity, local device storage, AI engine connection, and telemetry preferences.
        </p>
      </div>

      {/* Exploration Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border border-parchment-200 dark:border-charcoal-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-100 dark:bg-forest-900/50 text-forest-700 dark:text-moss-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 block">Cells</span>
            <span className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-100">{stats.cellsExplored}</span>
          </div>
        </Card>

        <Card className="p-4 border border-parchment-200 dark:border-charcoal-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brass-100 dark:bg-brass-900/50 text-brass-700 dark:text-brass-300 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 block">Total XP</span>
            <span className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-100">{stats.totalXP}</span>
          </div>
        </Card>

        <Card className="p-4 border border-parchment-200 dark:border-charcoal-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 block">Memories</span>
            <span className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-100">{stats.discoveriesRecorded}</span>
          </div>
        </Card>

        <Card className="p-4 border border-parchment-200 dark:border-charcoal-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-parchment-300 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-charcoal-500 block">Level</span>
            <span className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-100">{stats.level}</span>
          </div>
        </Card>
      </div>

      {/* SECTION 1: Profile & Preferences */}
      <Card className="p-6 border border-parchment-200 dark:border-charcoal-800 space-y-4">
        <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-forest-700 dark:text-moss-400" />
            <h2 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100">
              Explorer Identity & Preferences
            </h2>
          </div>
          <Badge variant={isAuthenticated ? 'success' : 'outline'} size="sm">
            {isAuthenticated ? 'Authenticated Account' : 'Guest Mode'}
          </Badge>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Explorer Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Preferred Quest Duration
              </label>
              <select
                value={prefDuration}
                onChange={(e) => setPrefDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Preferred Difficulty
              </label>
              <select
                value={prefDifficulty}
                onChange={(e) => setPrefDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              >
                <option value="easy">Easy (Mindful Stroll)</option>
                <option value="medium">Medium (Detailed Observation)</option>
                <option value="hard">Hard (Rare Tracking)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" size="sm">
              Save Preferences
            </Button>
            {savedNotice && (
              <span className="text-xs text-moss-600 dark:text-moss-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* SECTION 2: AI Status & Engine */}
      <Card className="p-6 border border-parchment-200 dark:border-charcoal-800 space-y-4">
        <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brass-500" />
            <h2 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100">
              Local AI Engine Status
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAIStatus}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Re-check
          </Button>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-parchment-100/60 dark:bg-charcoal-800/60 rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100">
                Ollama Local LLM
              </span>
              <Badge variant={aiStatus?.available ? 'success' : 'outline'} size="sm">
                {aiStatus?.available ? 'Online & Ready' : 'Deterministic Fallback Active'}
              </Badge>
            </div>
            <p className="text-xs text-charcoal-500 dark:text-parchment-400 mt-1">
              Model: {aiStatus?.model || 'Fallback Catalog'} • Provider: {aiStatus?.provider || 'offline'}
            </p>
          </div>
        </div>
      </Card>

      {/* SECTION 3: Storage & Local-First Records */}
      <Card className="p-6 border border-parchment-200 dark:border-charcoal-800 space-y-4">
        <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-forest-700 dark:text-moss-400" />
            <h2 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100">
              Local Device Storage & Privacy
            </h2>
          </div>
          <Badge variant="outline" size="sm">IndexedDB + LocalStorage</Badge>
        </div>

        <p className="text-xs text-charcoal-600 dark:text-parchment-300">
          Your photos are stored strictly inside your browser's local IndexedDB database. They are never transmitted over the internet unless you choose to synchronize or publish them.
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-parchment-100 dark:bg-charcoal-800 rounded-xl">
            <span className="text-charcoal-500 block">Local Photo Blobs</span>
            <span className="font-bold text-base text-charcoal-900 dark:text-parchment-100">{photoCount}</span>
          </div>
          <div className="p-3 bg-parchment-100 dark:bg-charcoal-800 rounded-xl">
            <span className="text-charcoal-500 block">Local Journal Entries</span>
            <span className="font-bold text-base text-charcoal-900 dark:text-parchment-100">{memoryCount}</span>
          </div>
        </div>

        {syncSuccess && (
          <div className="p-3 bg-moss-50 dark:bg-forest-950/40 text-forest-800 dark:text-moss-300 rounded-xl text-xs border border-moss-200">
            {syncSuccess}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              onClick={handleSyncToCloud}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync to Cloud Atlas
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export Field Journal (JSON)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLocalData}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Local Data
          </Button>
        </div>
      </Card>

      {/* SECTION 4: Account Actions */}
      {isAuthenticated && (
        <Card className="p-6 border border-parchment-200 dark:border-charcoal-800 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100">
              Account Session
            </h3>
            <p className="text-xs text-charcoal-500">
              Logged in as {user?.username} ({user?.display_name})
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Log Out
          </Button>
        </Card>
      )}
    </div>
  );
};
