import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mapsApi } from '../services/maps-api';
import { discoveriesApi } from '../services/discoveries-api';
import { questsApi } from '../services/quests-api';
import { sharingApi } from '../services/sharing-api';
import { idb } from '../lib/idb';
import { storage } from '../lib/storage';
import { LeafletMap } from '../components/map/LeafletMap';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { 
  useGeolocation, 
  calculateDistanceMeters, 
  formatDistance, 
  Coordinates 
} from '../hooks/useGeolocation';
import { 
  ExplorationMap, 
  ExplorationCell, 
  Discovery, 
  Quest,
  ShareLink, 
  CreateShareLinkRequest,
  CheckInResponse
} from '../types';
import { 
  Compass, 
  MapPin, 
  Share2, 
  Plus, 
  Layers, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink,
  LocateFixed,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Navigation,
  Navigation2,
  Footprints,
  Sparkles,
  Info
} from 'lucide-react';

export const MapPage: React.FC = () => {
  const { isAuthenticated, guestProfile } = useAuth();

  const [maps, setMaps] = useState<ExplorationMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<ExplorationMap | null>(null);
  const [cells, setCells] = useState<ExplorationCell[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map viewport center override
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);

  // Movement auto-discovery toast
  const [movementToast, setMovementToast] = useState<string | null>(null);

  // Manual Check-in modal
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInLat, setCheckInLat] = useState<string>('');
  const [checkInLon, setCheckInLon] = useState<string>('');
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState<CheckInResponse | null>(null);

  // Selected Discovery Detail modal
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const [discoveryPhotoUrl, setDiscoveryPhotoUrl] = useState<string | null>(null);

  // Share Map Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [creatingShare, setCreatingShare] = useState(false);
  const [shareConfig, setShareConfig] = useState<CreateShareLinkRequest>({
    permission_level: 'view',
    include_discoveries: true,
    expires_in_days: 7,
    notes: 'TerraQuest Field Journal Exploration Map',
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Map settings drawer
  const [showFogOfWar, setShowFogOfWar] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Create new map modal
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapRegion, setNewMapRegion] = useState('');

  // 1. Live Geolocation with Movement Detection
  const handleAutoMovement = useCallback(
    async (coords: Coordinates, distanceMeters: number) => {
      const lat = coords.latitude;
      const lon = coords.longitude;

      // Automatically register cell exploration if moved > 50m with good accuracy
      try {
        if (isAuthenticated && selectedMap) {
          const res = await mapsApi.checkIn(selectedMap.id, {
            latitude: lat,
            longitude: lon,
          });
          if (res.is_new_cell || res.is_new_discovery) {
            setMovementToast(`New territory uncovered (${formatDistance(distanceMeters)} walked)! +${res.xp_awarded || 20} XP`);
            setTimeout(() => setMovementToast(null), 4000);
            const full = await mapsApi.getExplorationMap(selectedMap.id);
            setCells(full.cells || []);
          }
        } else {
          // Guest mode check-in: persist to localStorage
          const newCell: ExplorationCell = {
            id: `guest-cell-${Date.now()}`,
            cell_h3_index: `cell-${Math.floor(lat * 1000)}_${Math.floor(lon * 1000)}`,
            latitude: lat,
            longitude: lon,
            visited_at: new Date().toISOString(),
            visit_count: 1,
            radius_meters: 110,
          };
          storage.saveGuestCell(newCell);
          setCells((prev) => [newCell, ...prev]);
          storage.addGuestXP(20);
          setMovementToast(`New sector unlocked while walking! (+20 XP)`);
          setTimeout(() => setMovementToast(null), 4000);
        }
      } catch (err) {
        console.warn('Auto check-in failed:', err);
      }
    },
    [isAuthenticated, selectedMap]
  );

  const {
    coords: userCoords,
    loading: locating,
    isTracking,
    error: locationError,
    permissionStatus,
    locate,
    startTracking,
    stopTracking,
    clearError: clearLocationError,
  } = useGeolocation({
    onMovement: handleAutoMovement,
    movementThresholdMeters: 50,
  });

  const userLocation: [number, number] | null = userCoords
    ? [userCoords.latitude, userCoords.longitude]
    : null;

  // 2. Fetch Maps, Discoveries, and Quests
  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isAuthenticated) {
      try {
        const mapsList = await mapsApi.listExplorationMaps();
        setMaps(mapsList);

        if (mapsList.length > 0) {
          const activeMap = mapsList[0];
          setSelectedMap(activeMap);
          if (activeMap.center_latitude && activeMap.center_longitude) {
            setMapCenter([activeMap.center_latitude, activeMap.center_longitude]);
          }

          // Fetch full map with cells
          const fullMap = await mapsApi.getExplorationMap(activeMap.id);
          setCells(fullMap.cells || []);
        }

        // Fetch discoveries
        const discResp = await discoveriesApi.listDiscoveries({ limit: 100 });
        setDiscoveries(discResp.items || []);

        // Fetch quests
        const qList = await questsApi.listQuests();
        setQuests(qList);
      } catch (err: any) {
        console.error('Failed to load map data:', err);
        setError(err.message || 'Could not load exploration map data.');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest Mode: load from IndexedDB and local storage
      try {
        const localDiscoveries = await idb.getAllDiscoveries();
        const mappedDiscs: Discovery[] = localDiscoveries.map((ld: any) => ({
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
          visibility: 'private',
        }));
        setDiscoveries(mappedDiscs);

        // Fetch starter quests
        try {
          const qList = await questsApi.listQuests();
          setQuests(qList);
        } catch {
          setQuests([]);
        }

        // Load persisted guest exploration cells
        const savedGuestCells: ExplorationCell[] = storage.getGuestCells();
        const combinedGuestCells = [...savedGuestCells];

        // Also ensure any geolocated discoveries user recorded have revealed bubbles
        mappedDiscs
          .filter((d) => d.latitude != null && d.longitude != null)
          .forEach((d) => {
            const lat = d.latitude!;
            const lon = d.longitude!;
            if (!combinedGuestCells.some((c) => c.latitude === lat && c.longitude === lon)) {
              combinedGuestCells.push({
                id: `guest-disc-${d.id}`,
                cell_h3_index: `cell-${Math.floor(lat * 1000)}_${Math.floor(lon * 1000)}`,
                latitude: lat,
                longitude: lon,
                visited_at: d.created_at,
                visit_count: 1,
                radius_meters: 110,
              });
            }
          });

        setCells(combinedGuestCells);

        const guestMap: ExplorationMap = {
          id: 'guest-local-map',
          user_id: 'guest',
          title: `${guestProfile.displayName}'s Field Atlas`,
          region_name: 'Local Exploration Sector',
          center_latitude: 37.7749,
          center_longitude: -122.4194,
          zoom_level: 14,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_cells_count: combinedGuestCells.length,
          cells: combinedGuestCells,
        };
        setSelectedMap(guestMap);
        setMaps([guestMap]);
      } catch (err: any) {
        console.error('Failed to load guest data:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [isAuthenticated, guestProfile.displayName]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Handle explicit Locate Me action
  const handleLocateMe = async () => {
    const coords = await locate();
    if (coords) {
      setMapCenter([coords.latitude, coords.longitude]);
      setCheckInLat(coords.latitude.toFixed(6));
      setCheckInLon(coords.longitude.toFixed(6));
    }
  };

  // Toggle Live Tracking
  const handleToggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
      handleLocateMe();
    }
  };

  // Switch active map
  const handleSelectMap = async (map: ExplorationMap) => {
    setSelectedMap(map);
    if (map.center_latitude && map.center_longitude) {
      setMapCenter([map.center_latitude, map.center_longitude]);
    }
    if (isAuthenticated) {
      try {
        const full = await mapsApi.getExplorationMap(map.id);
        setCells(full.cells || []);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Submit Manual Check-In
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(checkInLat);
    const lon = parseFloat(checkInLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      alert('Please enter valid coordinates (-90 to 90, -180 to 180).');
      return;
    }

    setSubmittingCheckIn(true);
    try {
      if (isAuthenticated && selectedMap) {
        const res = await mapsApi.checkIn(selectedMap.id, {
          latitude: lat,
          longitude: lon,
          notes: checkInNotes || undefined,
        });
        setCheckInSuccess(res);
        setMapCenter([lat, lon]);
        const full = await mapsApi.getExplorationMap(selectedMap.id);
        setCells(full.cells || []);
      } else {
        // Guest mode check-in
        const newCell: ExplorationCell = {
          id: `guest-cell-${Date.now()}`,
          cell_h3_index: `cell-${Math.floor(lat * 100)}_${Math.floor(lon * 100)}`,
          latitude: lat,
          longitude: lon,
          visited_at: new Date().toISOString(),
          visit_count: 1,
          radius_meters: 120,
        };
        setCells((prev) => [newCell, ...prev]);
        storage.addGuestXP(20);
        setMapCenter([lat, lon]);
        setCheckInSuccess({
          status: 'success',
          cell_index: newCell.cell_h3_index,
          is_new_discovery: true,
          xp_awarded: 20,
          total_cells_visited: cells.length + 1,
          message: 'Territory recorded into local field journal! (+20 XP)',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Create new map
  const handleCreateNewMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapTitle.trim()) return;

    try {
      if (isAuthenticated) {
        const newMap = await mapsApi.createExplorationMap({
          title: newMapTitle,
          region_name: newMapRegion || 'Expedition Sector',
          center_latitude: userLocation ? userLocation[0] : 37.7749,
          center_longitude: userLocation ? userLocation[1] : -122.4194,
          zoom_level: 13,
        });
        setMaps((prev) => [newMap, ...prev]);
        setSelectedMap(newMap);
        setCells([]);
        setShowNewMapModal(false);
        setNewMapTitle('');
        setNewMapRegion('');
      } else {
        alert('Please sign in to create and save multiple cloud maps.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create map.');
    }
  };

  // Open Discovery detail
  const handleMarkerClick = async (disc: Discovery) => {
    setSelectedDiscovery(disc);
    if (disc.photo_blob_id) {
      const blob = await idb.getPhoto(disc.photo_blob_id);
      if (blob) {
        setDiscoveryPhotoUrl(URL.createObjectURL(blob));
      } else {
        setDiscoveryPhotoUrl(disc.photo_url || null);
      }
    } else {
      setDiscoveryPhotoUrl(disc.photo_url || null);
    }
  };

  // Share Map Logic
  const handleOpenShare = async () => {
    if (!selectedMap || !isAuthenticated) {
      alert('Sharing is available for cloud-saved maps. Please sign in to generate share links.');
      return;
    }
    setShowShareModal(true);
    try {
      const links = await sharingApi.listShareLinks(selectedMap.id);
      setShareLinks(links);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateShareLink = async () => {
    if (!selectedMap) return;
    setCreatingShare(true);
    try {
      const link = await sharingApi.createShareLink(selectedMap.id, shareConfig);
      setShareLinks((prev) => [link, ...prev]);
    } catch (err: any) {
      alert(err.message || 'Could not create share link');
    } finally {
      setCreatingShare(false);
    }
  };

  const handleRevokeShareLink = async (linkId: string) => {
    if (!confirm('Revoke this share link? Anyone with this URL will immediately lose access.')) return;
    try {
      await sharingApi.revokeShareLink(linkId);
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke link');
    }
  };

  const copyShareUrl = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-parchment-50 dark:bg-charcoal-950 overflow-hidden relative">
      {/* Top Map Header & Controls Bar */}
      <div className="w-full bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md border-b border-parchment-200 dark:border-charcoal-800 px-4 sm:px-6 lg:px-8 py-3 z-30 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        {/* Map Information */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-forest-900 dark:bg-forest-800 text-parchment-100 flex items-center justify-center shadow-sm shrink-0">
            <Compass className="w-5 h-5 text-moss-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-base sm:text-lg text-charcoal-900 dark:text-parchment-50 leading-tight truncate">
                {selectedMap ? selectedMap.title : 'Field Exploration Map'}
              </h1>
              {selectedMap && (
                <Badge variant={selectedMap.is_public ? 'success' : 'outline'} size="sm">
                  {selectedMap.is_public ? 'Public Atlas' : 'Personal Field Map'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-charcoal-500 dark:text-parchment-400 truncate">
              {cells.length} sectors uncovered • {discoveries.length} observations recorded
            </p>
          </div>
        </div>

        {/* GPS Live Status Chip (if active) */}
        {userCoords && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-50/80 dark:bg-forest-950/60 border border-forest-200 dark:border-forest-900/60 text-xs font-mono text-forest-900 dark:text-parchment-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)}
            </span>
            {userCoords.accuracy && (
              <span className="text-[11px] text-forest-700/80 dark:text-moss-400">
                (±{Math.round(userCoords.accuracy)}m)
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Locate Me */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLocateMe}
            loading={locating}
            title="Locate my position using device GPS"
            className="text-xs font-semibold"
          >
            <LocateFixed className="w-3.5 h-3.5 mr-1.5 text-forest-700 dark:text-moss-400" />
            <span>Locate Me</span>
          </Button>

          {/* Live Tracking Toggle */}
          <Button
            variant={isTracking ? 'primary' : 'outline'}
            size="sm"
            onClick={handleToggleTracking}
            className={`text-xs font-semibold ${
              isTracking ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : ''
            }`}
            title={isTracking ? 'Stop continuous movement tracking' : 'Continuously track movement and uncover cells'}
          >
            <Navigation className={`w-3.5 h-3.5 mr-1.5 ${isTracking ? 'animate-pulse text-white' : 'text-forest-700 dark:text-moss-400'}`} />
            <span>{isTracking ? 'Tracking Movement' : 'Start Tracking'}</span>
          </Button>

          {/* Manual Check-In */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCheckInSuccess(null);
              if (userCoords) {
                setCheckInLat(userCoords.latitude.toFixed(6));
                setCheckInLon(userCoords.longitude.toFixed(6));
              }
              setShowCheckInModal(true);
            }}
            className="text-xs font-semibold"
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            Check-In
          </Button>

          {/* Share Button (Auth only) */}
          {isAuthenticated && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenShare}
              className="text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-brass-600 dark:text-brass-400" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          )}

          {/* Map Layers & Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-2 rounded-xl border border-parchment-300 dark:border-charcoal-700 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-parchment-300 hover:bg-parchment-100 dark:hover:bg-charcoal-700 transition-colors shadow-sm"
            title="Map layers and settings"
            aria-label="Map layers"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Movement Auto-Exploration Toast */}
      {movementToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-forest-900/95 text-parchment-50 border border-moss-500/50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-brass-400 shrink-0" />
          <span>{movementToast}</span>
        </div>
      )}

      {/* Location warning if error */}
      {locationError && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{locationError}</span>
          </div>
          <button
            type="button"
            onClick={clearLocationError}
            className="text-xs underline font-semibold ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Full-Width Map View Area */}
      <div className="flex-1 w-full h-full relative min-h-0">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-parchment-100 dark:bg-charcoal-900">
            <LoadingState message="Loading field cartography, topography, and real terrain tiles..." />
          </div>
        ) : (
          <LeafletMap
            center={mapCenter}
            zoom={selectedMap?.zoom_level || 14}
            cells={cells}
            fogOfWar={showFogOfWar}
            discoveries={showMarkers ? discoveries : []}
            quests={quests}
            userLocation={userLocation}
            userAccuracy={userCoords?.accuracy || null}
            isTracking={isTracking}
            onMarkerClick={handleMarkerClick}
            onLocateMe={handleLocateMe}
            onToggleTracking={handleToggleTracking}
            className="w-full h-full"
          />
        )}

        {/* Floating Settings Drawer */}
        {showSettingsDrawer && (
          <div className="absolute top-4 right-4 z-30 w-80 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md border border-parchment-200 dark:border-charcoal-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-parchment-200 dark:border-charcoal-800 pb-2.5">
              <h3 className="font-serif font-bold text-sm text-charcoal-900 dark:text-parchment-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-forest-700 dark:text-moss-400" />
                Map Layers & Atlases
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                className="text-xs text-charcoal-400 hover:text-charcoal-700 dark:hover:text-parchment-100 p-1"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-2.5">
              <label className="flex items-center justify-between text-xs text-charcoal-700 dark:text-parchment-200 cursor-pointer">
                <span>Fog of War (Explored Cells)</span>
                <input
                  type="checkbox"
                  checked={showFogOfWar}
                  onChange={(e) => setShowFogOfWar(e.target.checked)}
                  className="rounded border-parchment-300 text-forest-700 focus:ring-forest-600"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-charcoal-700 dark:text-parchment-200 cursor-pointer">
                <span>Discovery & Quest Markers</span>
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(e) => setShowMarkers(e.target.checked)}
                  className="rounded border-parchment-300 text-forest-700 focus:ring-forest-600"
                />
              </label>
            </div>

            {/* Reset Exploration State button for development/testing */}
            <div className="border-t border-parchment-200 dark:border-charcoal-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset your local explored sectors to test fresh Fog of War?')) {
                    storage.clearGuestCells();
                    setCells([]);
                  }
                }}
                className="w-full text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-2 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                Reset Exploration State (Testing)
              </button>
            </div>

            {/* Maps selection */}
            {isAuthenticated ? (
              <div className="border-t border-parchment-200 dark:border-charcoal-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-charcoal-700 dark:text-parchment-300">
                    Your Saved Atlases
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewMapModal(true)}
                    className="text-xs text-forest-700 dark:text-moss-400 font-medium hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {maps.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMap(m)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        selectedMap?.id === m.id
                          ? 'bg-forest-900 text-parchment-100 font-medium shadow-sm'
                          : 'bg-parchment-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-parchment-300 hover:bg-parchment-200'
                      }`}
                    >
                      <span className="truncate">{m.title}</span>
                      <span className="text-[10px] opacity-75">{m.total_cells_count || 0} cells</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-parchment-200 dark:border-charcoal-800 pt-3 text-xs text-charcoal-500">
                <p>Guest Mode: Uncovered cells are saved in local device storage.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Manual Check-in Modal */}
      <Modal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        title="Record Field Check-In"
      >
        {checkInSuccess ? (
          <div className="space-y-4 py-2 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-forest-100 dark:bg-forest-900/50 text-forest-700 dark:text-moss-400 flex items-center justify-center">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-100">
                Territory Recorded!
              </h3>
              <p className="text-sm text-charcoal-600 dark:text-parchment-300 mt-1">
                {checkInSuccess.message}
              </p>
            </div>
            <div className="inline-block bg-brass-100 dark:bg-brass-950/40 text-brass-800 dark:text-brass-300 px-3.5 py-1.5 rounded-full text-xs font-bold border border-brass-300/40">
              +{checkInSuccess.xp_awarded} XP Awarded
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowCheckInModal(false);
                setCheckInSuccess(null);
              }}
            >
              Resume Exploration
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCheckIn} className="space-y-4">
            <p className="text-xs text-charcoal-600 dark:text-parchment-400">
              Check in to clear fog of war for this sector. You can use your actual GPS coordinates or manually input coordinates.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 37.7749"
                  value={checkInLat}
                  onChange={(e) => setCheckInLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. -122.4194"
                  value={checkInLon}
                  onChange={(e) => setCheckInLon(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLocateMe}
              loading={locating}
              fullWidth
            >
              <LocateFixed className="w-3.5 h-3.5 mr-1.5 text-forest-700 dark:text-moss-400" />
              Fill with Current GPS Coordinates
            </Button>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
                Field Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Observed local flora, historic brickwork, birds singing..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCheckInModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={submittingCheckIn}
              >
                Confirm Check-In
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Discovery Details Modal */}
      <Modal
        isOpen={selectedDiscovery !== null}
        onClose={() => {
          setSelectedDiscovery(null);
          setDiscoveryPhotoUrl(null);
        }}
        title="Field Journal Discovery"
      >
        {selectedDiscovery && (
          <div className="space-y-4">
            {discoveryPhotoUrl && (
              <div className="rounded-xl overflow-hidden max-h-56 bg-charcoal-950 flex items-center justify-center">
                <img
                  src={discoveryPhotoUrl}
                  alt={selectedDiscovery.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="moss" size="sm">
                  {selectedDiscovery.category || selectedDiscovery.skill_category}
                </Badge>
                <span className="text-xs text-charcoal-400 dark:text-parchment-400">
                  {new Date(selectedDiscovery.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-serif font-bold text-lg text-charcoal-900 dark:text-parchment-50">
                {selectedDiscovery.title}
              </h3>
            </div>

            <div className="bg-parchment-100 dark:bg-charcoal-800/60 p-3 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 dark:text-parchment-400 block mb-1">
                Observation Note
              </span>
              <p className="text-xs text-charcoal-800 dark:text-parchment-200 italic">
                "{selectedDiscovery.observation}"
              </p>
            </div>

            {selectedDiscovery.personal_reflection && (
              <div className="bg-moss-50 dark:bg-forest-950/40 p-3 rounded-xl border border-moss-200/50 dark:border-forest-800/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 dark:text-moss-400 block mb-1">
                  Personal Reflection
                </span>
                <p className="text-xs text-charcoal-700 dark:text-parchment-200">
                  {selectedDiscovery.personal_reflection}
                </p>
              </div>
            )}

            {selectedDiscovery.latitude && selectedDiscovery.longitude && (
              <div className="text-[11px] text-charcoal-500 dark:text-parchment-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-forest-600" />
                {selectedDiscovery.latitude.toFixed(5)}, {selectedDiscovery.longitude.toFixed(5)}
                {userCoords && (
                  <span className="text-forest-700 dark:text-moss-400 font-semibold ml-2">
                    ({formatDistance(calculateDistanceMeters(userCoords.latitude, userCoords.longitude, selectedDiscovery.latitude, selectedDiscovery.longitude))} away)
                  </span>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => {
                setSelectedDiscovery(null);
                setDiscoveryPhotoUrl(null);
              }}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* 4. Map Sharing Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Exploration Map"
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-600 dark:text-parchment-400">
            Generate a secure link to allow friends to view your explored cells and approved discoveries without revealing private reflections or credentials.
          </p>

          {/* New Share Link Generation */}
          <div className="bg-parchment-100 dark:bg-charcoal-800 p-3.5 rounded-xl space-y-3">
            <span className="text-xs font-semibold text-charcoal-900 dark:text-parchment-100 block">
              Generate Link
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-charcoal-600 dark:text-parchment-400 block mb-0.5">
                  Valid Duration
                </label>
                <select
                  value={shareConfig.expires_in_days || 7}
                  onChange={(e) => setShareConfig({ ...shareConfig, expires_in_days: Number(e.target.value) })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-charcoal-700 border border-parchment-300 dark:border-charcoal-600 text-charcoal-800 dark:text-parchment-100"
                >
                  <option value={1}>1 Day</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 text-xs text-charcoal-700 dark:text-parchment-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareConfig.include_discoveries}
                    onChange={(e) => setShareConfig({ ...shareConfig, include_discoveries: e.target.checked })}
                    className="rounded border-parchment-300 text-forest-700"
                  />
                  <span>Show Discoveries</span>
                </label>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              loading={creatingShare}
              onClick={handleCreateShareLink}
              fullWidth
            >
              Generate Shareable Link
            </Button>
          </div>

          {/* Existing Links List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-charcoal-700 dark:text-parchment-300 block">
              Active Share Links ({shareLinks.length})
            </span>
            {shareLinks.length === 0 ? (
              <p className="text-xs text-charcoal-400 italic">No active share links.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="bg-white dark:bg-charcoal-800 border border-parchment-200 dark:border-charcoal-700 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-charcoal-800 dark:text-parchment-200 truncate">
                          ...{link.token.slice(-8)}
                        </span>
                        <Badge variant="outline" size="sm">
                          {link.include_discoveries ? 'Cells + Discoveries' : 'Cells Only'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-charcoal-400">
                        {link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : 'No expiration'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyShareUrl(link.token)}
                        className="p-1.5 rounded-lg border border-parchment-200 dark:border-charcoal-600 hover:bg-parchment-100 text-charcoal-700 dark:text-parchment-200"
                        title="Copy Link"
                      >
                        {copiedLink === link.token ? (
                          <Check className="w-3.5 h-3.5 text-moss-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeShareLink(link.id)}
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 text-red-600 dark:text-red-400"
                        title="Revoke Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 5. Create Map Modal */}
      <Modal
        isOpen={showNewMapModal}
        onClose={() => setShowNewMapModal(false)}
        title="Create New Exploration Map"
      >
        <form onSubmit={handleCreateNewMap} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Atlas Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pacific Northwest Trails"
              value={newMapTitle}
              onChange={(e) => setNewMapTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 dark:text-parchment-300 mb-1">
              Region Description
            </label>
            <input
              type="text"
              placeholder="e.g. Urban & Coastal Forests"
              value={newMapRegion}
              onChange={(e) => setNewMapRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-charcoal-800 border border-parchment-300 dark:border-charcoal-700 text-charcoal-900 dark:text-parchment-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewMapModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Atlas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
