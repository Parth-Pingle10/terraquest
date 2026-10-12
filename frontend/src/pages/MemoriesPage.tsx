import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { discoveriesApi } from '../services/discoveries-api';
import { idb } from '../lib/idb';
import { storage } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { 
  Discovery, 
  SkillCategory, 
  CreateDiscoveryRequest 
} from '../types';
import { 
  BookOpen, 
  Plus, 
  Image as ImageIcon, 
  Camera, 
  Calendar, 
  MapPin, 
  Trash2, 
  Edit3, 
  Filter, 
  Grid, 
  List, 
  ExternalLink,
  Lock,
  Globe,
  Eye,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const MemoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, guestProfile } = useAuth();

  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Photo Blob URL cache (id -> objectUrl)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Modals
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Discovery Form State
  const [newTitle, setNewTitle] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newReflection, setNewReflection] = useState('');
  const [newCategory, setNewCategory] = useState<SkillCategory>('visual_explorer');
  const [newVisibility, setNewVisibility] = useState<'private' | 'unlisted' | 'public'>('private');
  const [newLat, setNewLat] = useState<string>('');
  const [newLon, setNewLon] = useState<string>('');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [submittingMemory, setSubmittingMemory] = useState(false);

  // Fetch Discoveries
  const loadDiscoveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        const resp = await discoveriesApi.listDiscoveries({ limit: 100 });
        setDiscoveries(resp.items || []);

        // Load any cached IDB photos
        const urls: Record<string, string> = {};
        for (const item of resp.items || []) {
          if (item.photo_blob_id) {
            const blob = await idb.getPhoto(item.photo_blob_id);
            if (blob) {
              urls[item.photo_blob_id] = URL.createObjectURL(blob);
            }
          }
        }
        setPhotoUrls(urls);
      } else {
        // Guest mode - IndexedDB with localStorage fallback
        let localItems = await idb.getAllDiscoveries();
        const urls: Record<string, string> = {};

        if (!localItems || localItems.length === 0) {
          localItems = storage.getGuestDiscoveries();
        }

        const mapped: Discovery[] = await Promise.all(
          localItems.map(async (ld: any) => {
            if (ld.photo_blob_id) {
              const blob = await idb.getPhoto(ld.photo_blob_id);
              if (blob) {
                urls[ld.photo_blob_id] = URL.createObjectURL(blob);
              }
            }
            return {
              id: ld.id,
              user_id: 'guest',
              title: ld.title,
              category: ld.category,
              latitude: ld.latitude,
              longitude: ld.longitude,
              observation: ld.observation,
              personal_reflection: ld.personal_reflection,
              photo_blob_id: ld.photo_blob_id,
              created_at: ld.created_at,
              quest_id: ld.quest_id,
              visibility: 'private'
            };
          })
        );

        setDiscoveries(mapped);
        setPhotoUrls(urls);
      }
    } catch (err: any) {
      console.error('Failed to load memories:', err);
      setError(err.message || 'Unable to retrieve your field journal memories.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDiscoveries();
  }, [loadDiscoveries]);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPhotoFile(file);
      const url = URL.createObjectURL(file);
      setNewPhotoPreview(url);
    }
  };

  // Get current GPS for new memory
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewLat(pos.coords.latitude.toFixed(6));
          setNewLon(pos.coords.longitude.toFixed(6));
        },
        (err) => alert(`GPS unavailable: ${err.message}`)
      );
    }
  };

  // Save new Memory
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newObservation.trim()) return;

    setSubmittingMemory(true);
    try {
      let photoBlobId: string | undefined = undefined;
      if (newPhotoFile) {
        photoBlobId = `blob-${Date.now()}`;
        await idb.savePhoto(photoBlobId, newPhotoFile);
      }

      const lat = newLat ? parseFloat(newLat) : undefined;
      const lon = newLon ? parseFloat(newLon) : undefined;

      if (isAuthenticated) {
        const payload: CreateDiscoveryRequest = {
          title: newTitle,
          observation: newObservation,
          personal_reflection: newReflection || undefined,
          category: newCategory,
          latitude: lat,
          longitude: lon,
          photo_blob_id: photoBlobId,
          visibility: newVisibility
        };
        const created = await discoveriesApi.createDiscovery(payload);
        setDiscoveries(prev => [created, ...prev]);
      } else {
        // Guest mode
        const localId = `local-disc-${Date.now()}`;
        const localDisc = {
          id: localId,
          title: newTitle,
          category: newCategory,
          observation: newObservation,
          personal_reflection: newReflection,
          photo_blob_id: photoBlobId,
          latitude: lat,
          longitude: lon,
          created_at: new Date().toISOString(),
          synced: false
        };
        await idb.saveDiscovery(localDisc);
        storage.addGuestXP(30);

        const mapped: Discovery = {
          id: localId,
          user_id: 'guest',
          title: newTitle,
          category: newCategory,
          observation: newObservation,
          personal_reflection: newReflection,
          photo_blob_id: photoBlobId,
          latitude: lat,
          longitude: lon,
          created_at: localDisc.created_at,
          visibility: 'private'
        };
        storage.saveGuestDiscovery(mapped);
        setDiscoveries(prev => [mapped, ...prev]);
      }

      // Reset and close
      setShowCreateModal(false);
      setNewTitle('');
      setNewObservation('');
      setNewReflection('');
      setNewPhotoFile(null);
      setNewPhotoPreview(null);
      setNewLat('');
      setNewLon('');
      loadDiscoveries();
    } catch (err: any) {
      alert(err.message || 'Could not save discovery.');
    } finally {
      setSubmittingMemory(false);
    }
  };

  // Delete Discovery
  const handleDeleteDiscovery = async (discovery: Discovery) => {
    if (!confirm(`Are you sure you want to remove "${discovery.title}" from your journal?`)) return;

    try {
      if (isAuthenticated) {
        await discoveriesApi.deleteDiscovery(discovery.id);
      } else {
        await idb.deleteDiscovery(discovery.id);
        storage.deleteGuestDiscovery(discovery.id);
      }
      if (discovery.photo_blob_id) {
        await idb.deletePhoto(discovery.photo_blob_id);
      }
      setDiscoveries(prev => prev.filter(d => d.id !== discovery.id));
      setSelectedDiscovery(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete discovery.');
    }
  };

  // Filtered discoveries
  const filteredDiscoveries = discoveries.filter(d => {
    if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.observation.toLowerCase().includes(q) ||
        (d.personal_reflection && d.personal_reflection.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-200 dark:border-charcoal-800 pb-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-forest-700 dark:text-moss-400 font-bold">
            Field Archive
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-charcoal-900 dark:text-parchment-50 mt-1">
            Memory Atlas
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 dark:text-parchment-300 mt-1 max-w-xl">
            A permanent field journal of your observations, captured specimens, and mindful reflections from the natural and urban world.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreateModal(true)}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Memory
          </Button>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="bg-white/80 dark:bg-charcoal-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-parchment-200 dark:border-charcoal-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          {/* Search */}
          <input
            type="text"
            placeholder="Search observations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-parchment-100 dark:bg-charcoal-800 border border-parchment-200 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100 placeholder-charcoal-400"
          />

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-parchment-100 dark:bg-charcoal-800 border border-parchment-200 dark:border-charcoal-700 text-charcoal-800 dark:text-parchment-100"
          >
            <option value="all">All Categories</option>
            <option value="visual_explorer">Visual Explorer</option>
            <option value="nature_tracker">Nature Tracker</option>
            <option value="sound_hunter">Sound Hunter</option>
            <option value="urban_explorer">Urban Explorer</option>
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 border border-parchment-200 dark:border-charcoal-700 rounded-xl p-0.5 bg-parchment-100 dark:bg-charcoal-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-charcoal-700 text-forest-700 dark:text-moss-400 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-700'
            }`}
            title="Grid Gallery"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-charcoal-700 text-forest-700 dark:text-moss-400 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-700'
            }`}
            title="List Journal"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Discoveries Area */}
      {loading ? (
        <LoadingState message="Cataloging preserved field observations..." />
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredDiscoveries.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-charcoal-900 rounded-2xl border border-dashed border-parchment-300 dark:border-charcoal-800 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-charcoal-400" />
          <h3 className="font-serif font-bold text-lg text-charcoal-800 dark:text-parchment-200">
            No Memories Recorded Yet
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Take a walk outside, slow down, and notice something subtle. Record your first field memory or complete a quest!
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            Record First Memory
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredDiscoveries.map((disc) => {
            const photoUrl = disc.photo_blob_id ? photoUrls[disc.photo_blob_id] : disc.photo_url;
            return (
              <Card
                key={disc.id}
                onClick={() => setSelectedDiscovery(disc)}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow border border-parchment-200 dark:border-charcoal-800 flex flex-col justify-between group"
              >
                <div>
                  {photoUrl ? (
                    <div className="h-44 w-full bg-charcoal-950 overflow-hidden relative">
                      <img
                        src={photoUrl}
                        alt={disc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" size="sm" className="bg-black/60 text-white border-none backdrop-blur-sm">
                          {(disc.category || disc.skill_category || 'visual_explorer').replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-parchment-200/50 dark:bg-charcoal-800 flex items-center justify-center text-charcoal-400">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-charcoal-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(disc.created_at).toLocaleDateString()}
                      </span>
                      {disc.visibility === 'public' ? (
                        <span title="Public"><Globe className="w-3 h-3 text-emerald-500" /></span>
                      ) : (
                        <span title="Private"><Lock className="w-3 h-3 text-charcoal-400" /></span>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-base text-charcoal-900 dark:text-parchment-100 group-hover:text-forest-700 dark:group-hover:text-moss-400 transition-colors">
                      {disc.title}
                    </h3>

                    <p className="text-xs text-charcoal-600 dark:text-parchment-300 line-clamp-2 italic">
                      "{disc.observation}"
                    </p>
                  </div>
                </div>

                {disc.latitude && disc.longitude && (
                  <div className="px-4 pb-4 pt-1 flex items-center gap-1 text-[10px] text-forest-700 dark:text-moss-400">
                    <MapPin className="w-3 h-3" />
                    <span>Geo-tagged</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-3">
          {filteredDiscoveries.map((disc) => {
            const photoUrl = disc.photo_blob_id ? photoUrls[disc.photo_blob_id] : disc.photo_url;
            return (
              <div
                key={disc.id}
                onClick={() => setSelectedDiscovery(disc)}
                className="p-4 bg-white dark:bg-charcoal-900 border border-parchment-200 dark:border-charcoal-800 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:border-parchment-300 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={disc.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-parchment-100 dark:bg-charcoal-800 flex items-center justify-center shrink-0 text-charcoal-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="moss" size="sm">{(disc.category || disc.skill_category || 'visual_explorer').replace('_', ' ')}</Badge>
                      <span className="text-[11px] text-charcoal-400">
                        {new Date(disc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100 truncate">
                      {disc.title}
                    </h3>
                    <p className="text-xs text-charcoal-500 dark:text-parchment-300 truncate">
                      {disc.observation}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {disc.latitude && disc.longitude && (
                    <MapPin className="w-4 h-4 text-forest-600 dark:text-moss-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Modal
        isOpen={selectedDiscovery !== null}
        onClose={() => setSelectedDiscovery(null)}
        title={selectedDiscovery?.title || 'Journal Entry'}
      >
        {selectedDiscovery && (
          <div className="space-y-4">
            {selectedDiscovery.photo_blob_id && photoUrls[selectedDiscovery.photo_blob_id] && (
              <div className="rounded-xl overflow-hidden max-h-64 bg-charcoal-950 flex items-center justify-center">
                <img
                  src={photoUrls[selectedDiscovery.photo_blob_id]}
                  alt={selectedDiscovery.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-2">
              <Badge variant="moss" size="sm">
                {(selectedDiscovery.category || selectedDiscovery.skill_category || 'visual_explorer').replace('_', ' ')}
              </Badge>
              <span className="text-xs text-charcoal-400">
                {new Date(selectedDiscovery.created_at).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 block mb-1">
                Observation Note
              </span>
              <p className="text-xs text-charcoal-800 dark:text-parchment-200 italic leading-relaxed">
                "{selectedDiscovery.observation}"
              </p>
            </div>

            {selectedDiscovery.personal_reflection && (
              <div className="p-3 bg-moss-50/70 dark:bg-forest-950/40 rounded-xl border border-moss-200/50 dark:border-forest-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 dark:text-moss-400 block mb-1">
                  Personal Reflection
                </span>
                <p className="text-xs text-charcoal-700 dark:text-parchment-200 leading-relaxed">
                  {selectedDiscovery.personal_reflection}
                </p>
              </div>
            )}

            {selectedDiscovery.latitude && selectedDiscovery.longitude && (
              <div className="flex items-center justify-between text-xs text-charcoal-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-forest-600" />
                  {selectedDiscovery.latitude.toFixed(5)}, {selectedDiscovery.longitude.toFixed(5)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate('/map');
                  }}
                >
                  Locate on Map
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-parchment-200 dark:border-charcoal-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteDiscovery(selectedDiscovery)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDiscovery(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE MEMORY MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Record New Field Memory"
      >
        <form onSubmit={handleSaveMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Title / Subject
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spiral Lichen on Sandstone"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Discipline Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as SkillCategory)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            >
              <option value="visual_explorer">Visual Explorer</option>
              <option value="nature_tracker">Nature Tracker</option>
              <option value="sound_hunter">Sound Hunter</option>
              <option value="urban_explorer">Urban Explorer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Observation (What did you notice?)
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Tiny concentric rings growing only on the north face..."
              value={newObservation}
              onChange={(e) => setNewObservation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Personal Reflection (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Walking past this stone for three months without noticing..."
              value={newReflection}
              onChange={(e) => setNewReflection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>

          {/* Photo attachment */}
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Capture or Attach Photo (Stored locally in IndexedDB)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="text-xs text-charcoal-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-parchment-200 file:text-charcoal-800 hover:file:bg-parchment-300"
            />
            {newPhotoPreview && (
              <div className="mt-2 h-28 w-28 rounded-xl overflow-hidden border border-parchment-300">
                <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Location coordinates */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-charcoal-700 dark:text-parchment-300">
                Coordinates (Optional)
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="text-[11px] text-forest-700 dark:text-moss-400 hover:underline flex items-center gap-0.5"
              >
                <MapPin className="w-3 h-3" /> Get Current Location
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Latitude"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700"
              />
              <input
                type="text"
                placeholder="Longitude"
                value={newLon}
                onChange={(e) => setNewLon(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submittingMemory}
            >
              Preserve Memory
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
