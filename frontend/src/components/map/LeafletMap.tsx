import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Discovery, ExplorationCell, Quest } from '../../types';
import { formatDate } from '../../lib/utils';
import { calculateDistanceMeters, formatDistance } from '../../hooks/useGeolocation';
import { 
  Plus, 
  Minus, 
  LocateFixed, 
  Compass, 
  Navigation, 
  Layers, 
  Sparkles,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

// Ensure Leaflet default marker icons resolve cleanly in Vite bundles
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Full globe boundary for inverted polygon mask
const WORLD_MASK: [number, number][] = [
  [-85.0511, -180],
  [-85.0511, 180],
  [85.0511, 180],
  [85.0511, -180],
];

/**
 * Creates a geographic circular hole ring for Leaflet polygon masking.
 */
function createHoleRing(lat: number, lon: number, radiusMeters: number, points = 24): [number, number][] {
  const ring: [number, number][] = [];
  const dLat = (radiusMeters / 6378137) * (180 / Math.PI);
  const cosLat = Math.cos((Math.PI * lat) / 180);
  const dLon = (radiusMeters / (6378137 * (cosLat === 0 ? 0.0001 : cosLat))) * (180 / Math.PI);

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    ring.push([lat + dLat * Math.sin(angle), lon + dLon * Math.cos(angle)]);
  }
  return ring;
}

/**
 * Checks whether a coordinate point falls inside any explored cell's boundary.
 */
function isCoordinateInExploredTerritory(lat: number, lon: number, cells: ExplorationCell[]): boolean {
  for (const c of cells) {
    const cLat = c.latitude ?? c.cell_center?.latitude ?? (c.cell_id?.startsWith('cell_') ? parseFloat(c.cell_id.split('_')[1]) : undefined);
    const cLon = c.longitude ?? c.cell_center?.longitude ?? (c.cell_id?.startsWith('cell_') ? parseFloat(c.cell_id.split('_')[2]) : undefined);
    if (cLat != null && cLon != null && !isNaN(cLat) && !isNaN(cLon)) {
      const radius = (c.radius_meters || 100) + 15;
      if (calculateDistanceMeters(lat, lon, cLat, cLon) <= radius) {
        return true;
      }
    }
  }
  return false;
}

export interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  cells?: ExplorationCell[];
  discoveries?: Discovery[];
  quests?: Quest[];
  userLocation?: [number, number] | null;
  userAccuracy?: number | null;
  isTracking?: boolean;
  fogOfWar?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  onDiscoverySelect?: (discovery: Discovery) => void;
  onMarkerClick?: (discovery: Discovery) => void;
  onQuestSelect?: (quest: Quest) => void;
  onLocateMe?: () => void;
  onToggleTracking?: () => void;
  height?: string;
  readOnly?: boolean;
  className?: string;
  showControlsOverlay?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [37.7749, -122.4194],
  zoom = 14,
  cells = [],
  discoveries = [],
  quests = [],
  userLocation = null,
  userAccuracy = null,
  isTracking = false,
  fogOfWar = true,
  onMapClick,
  onDiscoverySelect,
  onMarkerClick,
  onQuestSelect,
  onLocateMe,
  onToggleTracking,
  height = '100%',
  readOnly = false,
  className = '',
  showControlsOverlay = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for precise stacking
  const fogLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cellLayersRef = useRef<L.LayerGroup | null>(null);
  const markerLayersRef = useRef<L.LayerGroup | null>(null);
  const questLayersRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);

  const [tileError, setTileError] = useState(false);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [isFogActive, setIsFogActive] = useState(fogOfWar);

  const handleSelectDiscovery = onMarkerClick || onDiscoverySelect;

  // Sync prop changes
  useEffect(() => {
    setIsFogActive(fogOfWar);
  }, [fogOfWar]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Real, active OpenStreetMap raster tiles
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    // Stacking order:
    // 1. Fog of war polygon mask (covers undiscovered regions, cutouts for explored cells)
    fogLayerGroupRef.current = L.layerGroup().addTo(map);
    // 2. Cell glow contours inside the cutouts
    cellLayersRef.current = L.layerGroup().addTo(map);
    // 3. Quest markers (only visible in discovered territory)
    questLayersRef.current = L.layerGroup().addTo(map);
    // 4. Memory/Discovery markers (only visible in discovered territory)
    markerLayersRef.current = L.layerGroup().addTo(map);
    // 5. User position & accuracy circle (always visible on top)
    userLayerRef.current = L.layerGroup().addTo(map);

    if (onMapClick && !readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    map.on('zoomend', () => {
      setMapZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    // ResizeObserver ensures map.invalidateSize() runs automatically
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Pan/Center updates when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }
  }, [center[0], center[1]]);

  // 3. Render Real Fog-of-War Geographic Overlay & Explored Contours
  useEffect(() => {
    if (!fogLayerGroupRef.current || !cellLayersRef.current || !mapInstanceRef.current) return;
    
    fogLayerGroupRef.current.clearLayers();
    cellLayersRef.current.clearLayers();

    const holeRings: [number, number][][] = [];

    // Extract valid coordinates for each explored cell
    cells.forEach((cell) => {
      const lat = cell.latitude ?? cell.cell_center?.latitude ?? (cell.cell_id?.startsWith('cell_') ? parseFloat(cell.cell_id.split('_')[1]) : undefined);
      const lon = cell.longitude ?? cell.cell_center?.longitude ?? (cell.cell_id?.startsWith('cell_') ? parseFloat(cell.cell_id.split('_')[2]) : undefined);

      if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
        const radiusMeters = cell.radius_meters || 110;
        const count = cell.discovery_count || cell.visit_count || 1;

        if (isFogActive) {
          holeRings.push(createHoleRing(lat, lon, radiusMeters, 28));
        }

        // Sector contour circle inside revealed opening
        const sectorGlow = L.circle([lat, lon], {
          radius: radiusMeters,
          color: '#346b4b',
          weight: 1.5,
          opacity: 0.8,
          dashArray: '4, 4',
          fillColor: '#1e3d2b',
          fillOpacity: 0.12,
        });

        sectorGlow.bindTooltip(
          `<div style="font-family:serif; padding:2px;">
            <strong style="color:#1b3828;">Explored Sector</strong><br/>
            <span style="font-size:11px; color:#46593a;">Discovered sector • Visited ${count} times</span>
          </div>`,
          { direction: 'top', className: 'field-tooltip' }
        );

        cellLayersRef.current?.addLayer(sectorGlow);
      }
    });

    // When Fog of War is active:
    if (isFogActive) {
      const polygonCoords = holeRings.length > 0 ? [WORLD_MASK, ...holeRings] : [WORLD_MASK];
      
      const fogMask = L.polygon(polygonCoords as any, {
        fillColor: '#0a160e',
        fillOpacity: 0.88,
        stroke: false,
        interactive: false, // Ensures pointer clicks pass through to map tiles and markers
      });

      fogLayerGroupRef.current.addLayer(fogMask);
    }
  }, [cells, isFogActive]);

  // 4. Render User Location & Accuracy Ring (Always visible above Fog)
  useEffect(() => {
    if (!userLayerRef.current || !mapInstanceRef.current) return;
    userLayerRef.current.clearLayers();

    if (userLocation) {
      const [uLat, uLon] = userLocation;

      // Accuracy circle in meters
      if (userAccuracy && userAccuracy > 0) {
        const accuracyCircle = L.circle([uLat, uLon], {
          radius: Math.min(userAccuracy, 400),
          color: '#1b3828',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#346b4b',
          fillOpacity: 0.14,
        });
        userLayerRef.current.addLayer(accuracyCircle);
      }

      // Compass user marker
      const userIcon = L.divIcon({
        className: 'user-pulse-marker',
        html: `
          <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; inset:0; border-radius:50%; background:#2a553c; opacity:0.4; animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position:relative; width:18px; height:18px; border-radius:50%; background:#1b3828; border:3px solid #f8f5ed; box-shadow:0 0 10px rgba(27,56,40,0.55); display:flex; align-items:center; justify-content:center;">
              <div style="width:5px; height:5px; border-radius:50%; background:#d4af37;"></div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const userMarker = L.marker([uLat, uLon], { icon: userIcon, zIndexOffset: 1000 });
      const accuracyText = userAccuracy ? `Accuracy: ±${Math.round(userAccuracy)}m` : '';

      userMarker.bindPopup(`
        <div style="font-family:serif; padding:4px;">
          <h4 style="font-weight:bold; color:#1b3828; margin-bottom:2px; font-size:14px;">🧭 Your Field Position</h4>
          <p style="font-size:11px; color:#46593a; margin-bottom:4px;">You are observing here.</p>
          <span style="font-size:10px; font-family:monospace; color:#888;">
            ${uLat.toFixed(5)}, ${uLon.toFixed(5)} ${accuracyText ? '• ' + accuracyText : ''}
          </span>
        </div>
      `);

      userLayerRef.current.addLayer(userMarker);
    }
  }, [userLocation, userAccuracy]);

  // 5. Render Discovery Markers (Filtered by Fog of War unless user-owned)
  useEffect(() => {
    if (!markerLayersRef.current || !mapInstanceRef.current) return;
    markerLayersRef.current.clearLayers();

    discoveries.forEach((d) => {
      const lat = d.latitude ?? d.optional_latitude;
      const lon = d.longitude ?? d.optional_longitude;

      if (lat != null && lon != null) {
        // If Fog of War is enabled, ensure marker does not leak through undiscovered fog
        const isRevealed = !isFogActive || isCoordinateInExploredTerritory(lat, lon, cells) || d.user_id === 'guest';
        if (!isRevealed) return;

        let distanceInfo = '';
        if (userLocation) {
          const meters = calculateDistanceMeters(userLocation[0], userLocation[1], lat, lon);
          distanceInfo = ` • ${formatDistance(meters)} away`;
        }

        const markerIcon = L.divIcon({
          className: 'field-discovery-marker',
          html: `
            <div style="width:32px; height:32px; border-radius:50%; background:#1b3828; border:2.5px solid #d4af37; color:#f8f5ed; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(27,56,40,0.35); cursor:pointer; transition:transform 0.15s ease;">
              🌿
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([lat, lon], { icon: markerIcon });
        const category = d.category || d.skill_category || 'visual_explorer';
        const obs = d.observation || '';

        const popupContent = `
          <div style="font-family:serif; min-width:210px; padding:4px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <span style="font-size:10px; font-family:monospace; font-weight:bold; color:#2a553c; text-transform:uppercase;">
                ${category.replace('_', ' ')}
              </span>
              <span style="font-size:10px; color:#888;">${formatDate(d.created_at)}</span>
            </div>
            <h4 style="font-weight:bold; font-size:15px; color:#1b3828; margin-bottom:4px;">${d.title}</h4>
            <p style="font-size:12px; font-family:sans-serif; color:#46593a; margin-bottom:8px; line-height:1.4;">
              "${obs.slice(0, 110)}${obs.length > 110 ? '...' : ''}"
            </p>
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:10px; color:#888; border-top:1px solid #ede7d8; padding-top:4px;">
              <span>${lat.toFixed(4)}, ${lon.toFixed(4)}${distanceInfo}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (handleSelectDiscovery) {
          marker.on('click', () => handleSelectDiscovery(d));
        }

        markerLayersRef.current?.addLayer(marker);
      }
    });
  }, [discoveries, cells, isFogActive, userLocation, handleSelectDiscovery]);

  // 6. Render Quest Markers (Filtered by Fog of War unless in progress)
  useEffect(() => {
    if (!questLayersRef.current || !mapInstanceRef.current) return;
    questLayersRef.current.clearLayers();

    quests.forEach((q) => {
      const qAny = q as any;
      const qLat = qAny.target_latitude || qAny.latitude;
      const qLon = qAny.target_longitude || qAny.longitude;

      if (qLat != null && qLon != null) {
        // Prevent unexplored quests from leaking through fog
        const isRevealed = !isFogActive || isCoordinateInExploredTerritory(qLat, qLon, cells) || qAny.is_active;
        if (!isRevealed) return;

        const questIcon = L.divIcon({
          className: 'field-quest-marker',
          html: `
            <div style="width:34px; height:34px; border-radius:50%; background:#d4af37; border:2.5px solid #1b3828; color:#1b3828; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(212,175,55,0.4); font-size:16px; cursor:pointer;">
              🧭
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([qLat, qLon], { icon: questIcon });
        marker.bindPopup(`
          <div style="font-family:serif; min-width:200px; padding:4px;">
            <span style="font-size:10px; font-mono; font-weight:bold; color:#b58900; text-transform:uppercase;">
              Expedition Target
            </span>
            <h4 style="font-weight:bold; font-size:15px; color:#1b3828; margin-bottom:4px;">${q.title}</h4>
            <p style="font-size:12px; color:#46593a; margin-bottom:6px;">${q.description}</p>
            <div style="font-size:10px; font-weight:bold; color:#1b3828;">+${q.xp_reward || 50} XP • ${q.duration_minutes} min</div>
          </div>
        `);

        if (onQuestSelect) {
          marker.on('click', () => onQuestSelect(q));
        }

        questLayersRef.current?.addLayer(marker);
      }
    });
  }, [quests, cells, isFogActive, onQuestSelect]);

  // Custom Zoom Controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenterUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, Math.max(15, mapInstanceRef.current.getZoom()), {
        animate: true,
      });
    } else if (onLocateMe) {
      onLocateMe();
    }
  };

  return (
    <div className={`relative w-full overflow-hidden bg-parchment-200 dark:bg-charcoal-950 ${className}`} style={{ height }}>
      {/* Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Network / Tile Error Graceful Notice */}
      {tileError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-amber-50/95 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-xl shadow-md text-xs flex items-center gap-2 pointer-events-auto">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Offline mode: Map tiles loading slowly or offline. Vector field records remain active.</span>
        </div>
      )}

      {/* Interactive Controls Overlay */}
      {showControlsOverlay && (
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-auto">
          {/* Zoom Buttons */}
          <div className="flex flex-col bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md rounded-xl border border-parchment-300 dark:border-charcoal-800 shadow-md overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2.5 hover:bg-parchment-100 dark:hover:bg-charcoal-800 text-charcoal-800 dark:text-parchment-100 border-b border-parchment-200 dark:border-charcoal-800 transition-colors"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2.5 hover:bg-parchment-100 dark:hover:bg-charcoal-800 text-charcoal-800 dark:text-parchment-100 transition-colors"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Locate & Track Controls */}
          {onLocateMe && (
            <button
              type="button"
              onClick={handleRecenterUser}
              className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition-all flex items-center justify-center ${
                userLocation
                  ? 'bg-forest-800 text-parchment-50 border-forest-700 shadow-field hover:bg-forest-900'
                  : 'bg-white/95 dark:bg-charcoal-900/95 text-charcoal-800 dark:text-parchment-100 border-parchment-300 dark:border-charcoal-800 hover:bg-parchment-100'
              }`}
              title={userLocation ? 'Recenter on your GPS location' : 'Locate my position'}
              aria-label="Locate position"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          )}

          {/* Tracking toggle */}
          {onToggleTracking && (
            <button
              type="button"
              onClick={onToggleTracking}
              className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition-all flex items-center justify-center ${
                isTracking
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-field ring-2 ring-emerald-500/30 animate-pulse'
                  : 'bg-white/95 dark:bg-charcoal-900/95 text-charcoal-800 dark:text-parchment-100 border-parchment-300 dark:border-charcoal-800 hover:bg-parchment-100'
              }`}
              title={isTracking ? 'Stop Live GPS Movement Tracking' : 'Start Live GPS Movement Tracking'}
              aria-label="Toggle Live Tracking"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}

          {/* Fog of War Toggle */}
          <button
            type="button"
            onClick={() => setIsFogActive((prev) => !prev)}
            className={`p-2.5 rounded-xl border backdrop-blur-md shadow-md transition-all flex items-center justify-center ${
              isFogActive
                ? 'bg-forest-900 text-brass-400 border-forest-700 hover:bg-forest-950'
                : 'bg-white/95 dark:bg-charcoal-900/95 text-charcoal-600 dark:text-parchment-400 border-parchment-300 dark:border-charcoal-800 hover:bg-parchment-100'
            }`}
            title={isFogActive ? 'Fog of War Active (Click to inspect unlocked map)' : 'Fog of War Inactive (Click to obscure undiscovered land)'}
            aria-label="Toggle Fog of War"
          >
            {isFogActive ? <EyeOff className="w-4 h-4 text-brass-400" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Cartographic Compass Watermark */}
      <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-xs font-mono border border-parchment-200 dark:border-charcoal-800 text-forest-900 dark:text-parchment-200 shadow-sm pointer-events-none flex items-center gap-1.5">
        <Compass className="w-3.5 h-3.5 text-moss-600 dark:text-moss-400" />
        <span>OpenStreetMap • Z{mapZoom}</span>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs font-mono border border-parchment-200 dark:border-charcoal-800 shadow-md flex flex-wrap items-center gap-3.5 pointer-events-auto">
        <span className="flex items-center gap-1.5 text-charcoal-800 dark:text-parchment-100">
          <span className="w-3.5 h-3.5 rounded-full bg-forest-700/80 border border-moss-300" />
          <span>Explored Sectors ({cells.length})</span>
        </span>
        <span className="flex items-center gap-1.5 text-charcoal-800 dark:text-parchment-100">
          <span className="w-3.5 h-3.5 rounded-full bg-brass-500 border border-charcoal-900 flex items-center justify-center text-[9px] text-white">
            🌿
          </span>
          <span>Discoveries ({discoveries.length})</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-forest-700 dark:text-moss-400">
          <span className="w-2.5 h-2.5 rounded-full bg-forest-600" />
          <span>Fog of War: {isFogActive ? 'Obscured' : 'Revealed'}</span>
        </span>
        {userLocation && (
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Live GPS Position</span>
          </span>
        )}
      </div>
    </div>
  );
};
