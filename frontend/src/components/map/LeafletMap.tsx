import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Discovery, ExplorationCell } from '../../types';
import { formatDate } from '../../lib/utils';

export interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  cells?: ExplorationCell[];
  discoveries?: Discovery[];
  userLocation?: [number, number] | null;
  onMapClick?: (lat: number, lon: number) => void;
  onDiscoverySelect?: (discovery: Discovery) => void;
  onMarkerClick?: (discovery: Discovery) => void;
  height?: string;
  readOnly?: boolean;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [37.7749, -122.4194],
  zoom = 14,
  cells = [],
  discoveries = [],
  userLocation = null,
  onMapClick,
  onDiscoverySelect,
  onMarkerClick,
  height = '100%',
  readOnly = false,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cellLayersRef = useRef<L.LayerGroup | null>(null);
  const markerLayersRef = useRef<L.LayerGroup | null>(null);

  const handleSelect = onMarkerClick || onDiscoverySelect;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Warm cartographic / outdoor styled tiles from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    cellLayersRef.current = L.layerGroup().addTo(map);
    markerLayersRef.current = L.layerGroup().addTo(map);

    if (onMapClick && !readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center if changed
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]);

  // Render Explored Cells (Fog of War illumination)
  useEffect(() => {
    if (!cellLayersRef.current || !mapInstanceRef.current) return;

    cellLayersRef.current.clearLayers();

    cells.forEach((cell) => {
      const lat = cell.latitude ?? cell.cell_center?.latitude;
      const lon = cell.longitude ?? cell.cell_center?.longitude;

      if (lat != null && lon != null) {
        // Draw grid cell bounds (~100m walking radius)
        const radiusMeters = cell.radius_meters || 75;
        const count = cell.discovery_count || cell.visit_count || 1;
        const circle = L.circle([lat, lon], {
          radius: radiusMeters,
          color: '#346b4b',
          weight: 1.5,
          fillColor: '#67a37e',
          fillOpacity: Math.min(0.5, 0.2 + count * 0.1),
        });

        circle.bindTooltip(
          `<div><strong>Explored Territory</strong><br/><span style="font-size:10px;">Visited ${count} times</span></div>`,
          { direction: 'top' }
        );

        cellLayersRef.current?.addLayer(circle);
      }
    });
  }, [cells]);

  // Render Discovery Markers
  useEffect(() => {
    if (!markerLayersRef.current || !mapInstanceRef.current) return;

    markerLayersRef.current.clearLayers();

    // User location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position:relative; width:20px; height:20px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:#2a553c; border:3px solid #ffffff; box-shadow:0 0 10px rgba(0,0,0,0.3);"></div>
            <div style="position:absolute; inset:-4px; border-radius:50%; background:rgba(42,85,60,0.3); animation:pulse-subtle 2s infinite;"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const userMarker = L.marker(userLocation, { icon: userIcon }).bindPopup(
        '<strong>Your Location</strong><br/>You are exploring here.'
      );
      markerLayersRef.current.addLayer(userMarker);
    }

    // Discovery markers
    discoveries.forEach((d) => {
      const lat = d.latitude ?? d.optional_latitude;
      const lon = d.longitude ?? d.optional_longitude;

      if (lat != null && lon != null) {
        const markerIcon = L.divIcon({
          className: 'discovery-marker',
          html: `
            <div style="width:30px; height:30px; border-radius:50%; background:#1b3828; border:2px solid #d4af37; color:#f8f5ed; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(27,56,40,0.3); font-size:14px; cursor:pointer;">
              🌿
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([lat, lon], {
          icon: markerIcon,
        });

        const category = d.category || d.skill_category || 'visual_explorer';
        const obs = d.observation || '';

        const popupContent = `
          <div style="font-family:serif; min-width:180px; padding:2px;">
            <h4 style="font-weight:bold; margin-bottom:4px; font-size:15px; color:#1b3828;">${d.title}</h4>
            <p style="font-size:12px; margin-bottom:6px; font-family:sans-serif; color:#46593a;">${obs.slice(0, 100)}${obs.length > 100 ? '...' : ''}</p>
            <div style="font-size:10px; font-family:monospace; color:#888;">
              ${formatDate(d.created_at)} • ${category.replace('_', ' ')}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (handleSelect) {
          marker.on('click', () => handleSelect(d));
        }

        markerLayersRef.current?.addLayer(marker);
      }
    });
  }, [discoveries, userLocation, handleSelect]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-parchment-300 dark:border-charcoal-800 shadow-field ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[360px]" />

      {/* Cartographic Compass Watermark */}
      <div className="absolute top-3 right-3 z-[400] bg-parchment-50/90 dark:bg-charcoal-900/90 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-mono border border-parchment-200 dark:border-charcoal-800 text-forest-800 dark:text-parchment-300 shadow-sm pointer-events-none">
        🧭 Field Grid
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-parchment-50/90 dark:bg-charcoal-900/90 backdrop-blur-sm px-3 py-2 rounded-xl text-[11px] font-mono border border-parchment-200 dark:border-charcoal-800 shadow-sm flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-forest-900 dark:text-parchment-100">
          <span className="w-3 h-3 rounded-full bg-forest-500/50 border border-forest-600" /> Explored
        </span>
        <span className="flex items-center gap-1.5 text-forest-900 dark:text-parchment-100">
          <span className="w-2.5 h-2.5 rounded-full bg-brass-500 border border-brass-600" /> Discovery
        </span>
      </div>
    </div>
  );
};
